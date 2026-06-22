import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise, ExerciseDifficulty, ExerciseSource } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { Equipment } from './entities/equipment.entity';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { normalizeExerciseName } from './utils/normalize';
import { ExternalSyncService } from './external-sync.service';
import { EXERCISE_GIF_MAP } from './exercise-gif-map';

const S3_BASE = 'https://hadafak-uploads-production-e8zxio.s3.eu-central-1.amazonaws.com';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);
  private readonly cache = new Map<string, { value: any; expiresAt: number }>();
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minutes

  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepository: Repository<MuscleGroup>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
    private readonly syncService: ExternalSyncService,
  ) {}

  private resolveGifUrl(exercise: Exercise): void {
    if (!exercise.externalId) return;
    const datasetPath = EXERCISE_GIF_MAP[exercise.externalId];
    if (datasetPath) {
      exercise.gifUrl = `${S3_BASE}/${datasetPath}`;
    } else if (!exercise.gifUrl || exercise.gifUrl.includes('hadafak-uploads-production-0diewr')) {
      exercise.gifUrl = `/api/v1/exercises/image/${exercise.externalId}`;
    }
  }

  private clearCache() {
    this.cache.clear();
  }

  private evictExpiredCache() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  async findOrCreateMuscleGroup(name: string): Promise<MuscleGroup> {
    const normalized = name.trim().toLowerCase();
    let mg = await this.muscleGroupRepository.findOne({ where: { name: normalized } });
    if (!mg) {
      mg = this.muscleGroupRepository.create({ name: normalized });
      mg = await this.muscleGroupRepository.save(mg);
    }
    return mg;
  }

  async findOrCreateEquipment(name: string): Promise<Equipment> {
    const normalized = name.trim().toLowerCase();
    let eq = await this.equipmentRepository.findOne({ where: { name: normalized } });
    if (!eq) {
      eq = this.equipmentRepository.create({ name: normalized });
      eq = await this.equipmentRepository.save(eq);
    }
    return eq;
  }

  async findAll(query: {
    q?: string;
    muscle?: string;
    equipment?: string;
    difficulty?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Exercise[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 20);
    const skip = (page - 1) * limit;

    // Dynamically sync if search term is provided and database results are sparse
    if (query.q && query.q.trim().length >= 3) {
      try {
        const dbCount = await this.exerciseRepository.createQueryBuilder('exercise')
          .where('(exercise.name ILIKE :q OR exercise.displayName ILIKE :q)', { q: `%${query.q.trim()}%` })
          .getCount();

        if (dbCount < 5) {
          this.logger.log(`Few exercises found locally for "${query.q}". Triggering dynamic search sync...`);
          await this.syncService.syncExercisesForQuery(query.q);
          this.clearCache();
        }
      } catch (err) {
        this.logger.warn(`Failed to dynamically sync exercises for query "${query.q}": ${err.message}`);
      }
    }

    this.evictExpiredCache();

    // Build Cache Key
    const cacheKey = JSON.stringify({ ...query, page, limit });
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const queryBuilder = this.exerciseRepository.createQueryBuilder('exercise')
      .leftJoinAndSelect('exercise.muscleGroup', 'muscleGroup')
      .leftJoinAndSelect('exercise.secondaryMuscles', 'secondaryMuscles')
      .leftJoinAndSelect('exercise.equipment', 'equipment');

    if (query.q) {
      queryBuilder.andWhere(
        '(exercise.name ILIKE :q OR exercise.displayName ILIKE :q OR exercise.description ILIKE :q)',
        { q: `%${query.q}%` }
      );
    }

    if (query.muscle) {
      queryBuilder.andWhere(
        '(muscleGroup.name = :muscle OR muscleGroup.id = :muscle)',
        { muscle: query.muscle.toLowerCase() }
      );
    }

    if (query.equipment) {
      queryBuilder.andWhere(
        '(equipment.name = :equipment OR equipment.id = :equipment)',
        { equipment: query.equipment.toLowerCase() }
      );
    }

    if (query.difficulty) {
      queryBuilder.andWhere('exercise.difficulty = :difficulty', {
        difficulty: query.difficulty.toLowerCase(),
      });
    }

    queryBuilder
      .orderBy('exercise.displayName', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();
    data.forEach((ex) => this.resolveGifUrl(ex));
    const result = { data, total, page, limit };

    this.cache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    return result;
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({
      where: { id },
      relations: {
        muscleGroup: true,
        secondaryMuscles: true,
        equipment: true,
      },
    });
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }
    this.resolveGifUrl(exercise);
    return exercise;
  }

  async create(dto: CreateExerciseDto): Promise<Exercise> {
    const normName = normalizeExerciseName(dto.displayName);
    const existing = await this.exerciseRepository.findOne({ where: { name: normName } });
    if (existing) {
      throw new ConflictException(`Exercise with name "${dto.displayName}" already exists`);
    }

    const muscleGroup = await this.findOrCreateMuscleGroup(dto.muscleGroupName);
    const equipment = await this.findOrCreateEquipment(dto.equipmentName);

    const secondaryMuscles: MuscleGroup[] = [];
    if (dto.secondaryMuscleGroupNames) {
      for (const name of dto.secondaryMuscleGroupNames) {
        secondaryMuscles.push(await this.findOrCreateMuscleGroup(name));
      }
    }

    const exercise = this.exerciseRepository.create({
      name: normName,
      displayName: dto.displayName,
      description: dto.description,
      muscleGroup,
      secondaryMuscles,
      equipment,
      difficulty: dto.difficulty,
      instructions: dto.instructions || [],
      gifUrl: dto.gifUrl,
      videoUrl: dto.videoUrl,
      source: ExerciseSource.INTERNAL,
    });

    const saved = await this.exerciseRepository.save(exercise);
    this.clearCache();
    return saved;
  }

  async update(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const exercise = await this.findById(id);

    if (dto.displayName) {
      const normName = normalizeExerciseName(dto.displayName);
      if (normName !== exercise.name) {
        const existing = await this.exerciseRepository.findOne({ where: { name: normName } });
        if (existing && existing.id !== id) {
          throw new ConflictException(`Exercise with name "${dto.displayName}" already exists`);
        }
        exercise.name = normName;
      }
      exercise.displayName = dto.displayName;
    }

    if (dto.description !== undefined) {
      exercise.description = dto.description;
    }

    if (dto.difficulty) {
      exercise.difficulty = dto.difficulty;
    }

    if (dto.instructions) {
      exercise.instructions = dto.instructions;
    }

    if (dto.gifUrl !== undefined) {
      exercise.gifUrl = dto.gifUrl;
    }

    if (dto.videoUrl !== undefined) {
      exercise.videoUrl = dto.videoUrl;
    }

    if (dto.muscleGroupName) {
      exercise.muscleGroup = await this.findOrCreateMuscleGroup(dto.muscleGroupName);
    }

    if (dto.equipmentName) {
      exercise.equipment = await this.findOrCreateEquipment(dto.equipmentName);
    }

    if (dto.secondaryMuscleGroupNames) {
      const secondaryMuscles: MuscleGroup[] = [];
      for (const name of dto.secondaryMuscleGroupNames) {
        secondaryMuscles.push(await this.findOrCreateMuscleGroup(name));
      }
      exercise.secondaryMuscles = secondaryMuscles;
    }

    const saved = await this.exerciseRepository.save(exercise);
    this.clearCache();
    return saved;
  }

  async remove(id: string): Promise<void> {
    const exercise = await this.findById(id);
    await this.exerciseRepository.remove(exercise);
    this.clearCache();
  }

  async resolveExerciseId(idOrMock: string): Promise<string> {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrMock);
    if (isUUID) {
      return idOrMock;
    }

    const mockMapping: { [key: string]: string } = {
      e1: 'Bench Press',
      e2: 'Incline Dumbbell Press',
      e3: 'Barbell Squat',
      e4: 'Romanian Deadlift',
      e5: 'Pull-up',
      e6: 'Overhead Press',
      e7: 'Bicep Curl',
      e8: 'Tricep Pushdown',
    };

    const targetName = mockMapping[idOrMock] || idOrMock;
    const normName = normalizeExerciseName(targetName);

    let exercise = await this.exerciseRepository.findOne({
      where: [{ name: normName }, { displayName: targetName }],
    });

    if (!exercise) {
      const muscleGroup = await this.findOrCreateMuscleGroup('Other');
      const equipment = await this.findOrCreateEquipment('Other');
      exercise = this.exerciseRepository.create({
        name: normName,
        displayName: targetName,
        muscleGroup,
        equipment,
        difficulty: ExerciseDifficulty.BEGINNER,
        instructions: [],
        source: ExerciseSource.INTERNAL,
      });
      exercise = await this.exerciseRepository.save(exercise);
      this.clearCache();
    }

    return exercise.id;
  }
}
