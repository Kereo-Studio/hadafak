import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program, ProgramLevel, ProgramLocation } from './entities/program.entity';
import { ProgramDay } from './entities/program-day.entity';
import { ProgramDayExercise } from './entities/program-day-exercise.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProfilesService } from '../profiles/profiles.service';
import { ExercisesService } from '../exercises/exercises.service';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(ProgramDay)
    private readonly programDayRepository: Repository<ProgramDay>,
    @InjectRepository(ProgramDayExercise)
    private readonly programDayExerciseRepository: Repository<ProgramDayExercise>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    private readonly profilesService: ProfilesService,
    private readonly exercisesService: ExercisesService,
  ) {}

  async findAll(location?: ProgramLocation): Promise<Program[]> {
    return this.programRepository.find({
      where: location ? { location } : undefined,
      relations: {
        days: {
          exercises: {
            exercise: true,
          },
        },
      },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: {
        days: {
          exercises: {
            exercise: true,
          },
        },
      },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }
    return program;
  }

  async create(
    name: string,
    description: string,
    level: ProgramLevel,
    days?: { dayNumber: number; title: string }[],
  ): Promise<Program> {
    const program = this.programRepository.create({ name, description, level });
    const savedProgram = await this.programRepository.save(program);

    if (days && days.length > 0) {
      const programDays = days.map((day) =>
        this.programDayRepository.create({
          programId: savedProgram.id,
          dayNumber: day.dayNumber,
          title: day.title,
        }),
      );
      await this.programDayRepository.save(programDays);
    }

    return this.findById(savedProgram.id);
  }

  async findDayById(dayId: string): Promise<ProgramDay> {
    const day = await this.programDayRepository.findOne({
      where: { id: dayId },
      relations: {
        exercises: {
          exercise: true,
        },
      },
    });
    if (!day) {
      throw new NotFoundException(`Program day with ID ${dayId} not found`);
    }
    return day;
  }

  async generateProgramForUser(userId: string): Promise<Program> {
    const profile = await this.profilesService.findByUserId(userId);
    const isHome = profile.trainingLocation === 'home';

    const exercises = await this.exerciseRepository.find({
      select: { id: true, externalId: true },
    });
    const byExternal = new Map(exercises.filter((e) => e.externalId).map((e) => [e.externalId!, e.id]));
    const ex = (extId: string) => byExternal.get(extId) ?? null;

    let level = ProgramLevel.BEGINNER;
    if (profile.trainingDays >= 5) level = ProgramLevel.ADVANCED;
    else if (profile.trainingDays >= 3) level = ProgramLevel.INTERMEDIATE;

    type DaySpec = { title: string; exIds: [string, number, string, number][] };
    // [externalId, sets, reps-string, rest-seconds]
    let programName: string;
    let programDesc: string;
    let days: DaySpec[];

    if (isHome) {
      // ── HOME programs (bodyweight + dumbbell only) ─────────────────────────
      if (profile.trainingDays >= 5) {
        programName = 'Home Dumbbell PPL';
        programDesc = 'Push/Pull/Legs split using only dumbbells and bodyweight — built for your home setup.';
        days = [
          { title: 'Push Day', exIds: [['0289', 4, '8-12', 90], ['0405', 3, '10-12', 75], ['0334', 3, '12-15', 60], ['0351', 3, '12-15', 60]] },
          { title: 'Pull Day', exIds: [['0293', 4, '8-12', 90], ['0300', 3, '8-12', 90], ['0313', 3, '12-15', 60]] },
          { title: 'Legs Day', exIds: [['1760', 4, '10-12', 90], ['1459', 4, '10-12', 90], ['0336', 3, '10-12', 60]] },
          { title: 'Push Day B', exIds: [['0308', 4, '10-12', 75], ['2137', 3, '10-12', 75], ['0259', 3, '12-15', 60], ['0334', 3, '15-20', 45]] },
          { title: 'Pull Day B', exIds: [['0293', 4, '10-12', 90], ['0298', 3, '12-15', 60], ['1326', 3, '6-10', 90]] },
        ];
      } else if (profile.trainingDays === 4) {
        programName = 'Home Upper/Lower Split';
        programDesc = 'Four-day dumbbell upper/lower split designed for your home gym.';
        days = [
          { title: 'Upper A', exIds: [['0289', 4, '8-12', 90], ['0293', 4, '8-12', 90], ['0405', 3, '10-12', 75], ['0334', 3, '12-15', 60], ['0313', 3, '12-15', 45]] },
          { title: 'Lower A', exIds: [['1760', 4, '10-12', 90], ['1459', 4, '10-12', 90], ['0336', 3, '10-12', 60], ['0431', 3, '10-12', 60]] },
          { title: 'Upper B', exIds: [['0308', 4, '10-12', 75], ['0300', 4, '8-12', 90], ['2137', 3, '10-12', 75], ['0351', 3, '12-15', 60]] },
          { title: 'Lower B', exIds: [['1459', 4, '10-12', 90], ['1760', 4, '12-15', 75], ['3013', 4, '15-20', 45], ['0417', 3, '20-25', 45]] },
        ];
      } else {
        programName = 'Home Full Body';
        programDesc = 'Three full-body sessions using dumbbells and bodyweight — perfect for training at home.';
        days = [
          { title: 'Full Body A', exIds: [['0289', 3, '10-12', 75], ['0293', 3, '10-12', 75], ['1760', 3, '12-15', 75], ['0405', 3, '10-12', 60]] },
          { title: 'Full Body B', exIds: [['1459', 3, '10-12', 75], ['0308', 3, '12-15', 60], ['0336', 3, '10-12', 60], ['0334', 3, '12-15', 45]] },
          { title: 'Full Body C', exIds: [['1760', 3, '12-15', 75], ['0293', 3, '10-12', 75], ['0313', 3, '12-15', 45], ['0351', 3, '12-15', 45]] },
        ];
      }
    } else {
      // ── GYM programs (barbell + machine) ─────────────────────────────────
      if (profile.trainingDays >= 5) {
        programName = '6-Day Push/Pull/Legs';
        programDesc = 'High-frequency PPL hitting each muscle group twice weekly for maximum hypertrophy.';
        days = [
          { title: 'Push A', exIds: [['0025', 4, '6-8', 120], ['0091', 3, '8-10', 90], ['0314', 3, '10-12', 90], ['0334', 4, '12-15', 60], ['0241', 3, '10-12', 60]] },
          { title: 'Pull A', exIds: [['0032', 3, '5', 150], ['2330', 4, '8-10', 90], ['0861', 3, '10-12', 90], ['0203', 4, '15-20', 60], ['0031', 3, '10-12', 60]] },
          { title: 'Legs A', exIds: [['0043', 4, '6-8', 120], ['0085', 3, '8-10', 90], ['2287', 3, '10-12', 90], ['0586', 3, '12-15', 60], ['0605', 4, '15-20', 60]] },
          { title: 'Push B', exIds: [['0047', 4, '6-8', 120], ['0405', 3, '10-12', 90], ['0308', 3, '12-15', 75], ['0334', 4, '12-15', 60], ['0351', 3, '10-12', 60]] },
          { title: 'Pull B', exIds: [['0027', 4, '6-8', 120], ['0652', 4, '6-10', 90], ['0861', 3, '10-12', 90], ['0203', 3, '15-20', 60], ['0313', 3, '10-12', 60]] },
          { title: 'Legs B', exIds: [['0043', 4, '8-10', 120], ['0085', 4, '8-10', 90], ['0585', 3, '12-15', 60], ['0586', 3, '12-15', 60], ['0605', 4, '15-20', 60]] },
        ];
      } else if (profile.trainingDays === 4) {
        programName = '4-Day Upper/Lower Split';
        programDesc = 'Hits each muscle group twice weekly with three rest days — ideal for steady progression.';
        days = [
          { title: 'Upper A', exIds: [['0314', 4, '8-10', 90], ['0027', 4, '8-10', 90], ['0405', 3, '10-12', 90], ['0652', 3, '6-10', 90], ['0313', 3, '10-12', 60], ['0351', 3, '10-12', 60]] },
          { title: 'Lower A', exIds: [['0043', 4, '6-8', 120], ['0085', 4, '8-10', 90], ['0336', 3, '12', 60], ['0605', 4, '12-15', 60], ['0274', 3, '15-20', 60]] },
          { title: 'Upper B', exIds: [['0025', 4, '8-12', 90], ['2330', 4, '8-10', 90], ['0091', 3, '8-12', 90], ['0334', 3, '12-15', 60], ['0241', 3, '12-15', 60]] },
          { title: 'Lower B', exIds: [['0032', 4, '5', 150], ['2287', 4, '10-12', 90], ['0585', 3, '12-15', 60], ['0586', 3, '12-15', 60], ['0605', 4, '15-20', 60]] },
        ];
      } else {
        programName = '3-Day Full Body';
        programDesc = 'Beginner-friendly full-body plan built on heavy compound movements.';
        days = [
          { title: 'Full Body A', exIds: [['0043', 3, '8-10', 90], ['0025', 3, '8-10', 90], ['2330', 3, '10-12', 90], ['0334', 3, '12-15', 60], ['0464', 3, '60s', 60]] },
          { title: 'Full Body B', exIds: [['0085', 3, '8-10', 90], ['0314', 3, '10-12', 90], ['0027', 3, '8-10', 90], ['0313', 3, '10-12', 60], ['0464', 3, '60s', 60]] },
          { title: 'Full Body C', exIds: [['0043', 3, '8-10', 90], ['0091', 3, '8-10', 90], ['0652', 3, '6-10', 90], ['0241', 3, '10-15', 60], ['0274', 3, '15-20', 60]] },
        ];
      }
    }

    const program = this.programRepository.create({
      name: programName,
      description: programDesc,
      level,
      location: isHome ? 'home' : 'gym',
    });
    const savedProgram = await this.programRepository.save(program);

    for (let di = 0; di < days.length; di++) {
      const daySpec = days[di];
      const pDay = await this.programDayRepository.save(
        this.programDayRepository.create({
          programId: savedProgram.id,
          dayNumber: di + 1,
          title: daySpec.title,
        }),
      );

      let order = 1;
      for (const [extId, sets, reps, rest] of daySpec.exIds) {
        const exerciseId = ex(extId);
        if (exerciseId) {
          await this.programDayExerciseRepository.save(
            this.programDayExerciseRepository.create({
              programDayId: pDay.id,
              exerciseId,
              order: order++,
              targetSets: sets,
              targetRepsRange: reps,
              targetRestTime: rest,
            }),
          );
        }
      }
    }

    await this.profilesService.assignProgram(userId, savedProgram.id);
    return this.findById(savedProgram.id);
  }

  async updateDayExercise(id: string, targetSets: number, targetRepsRange: string): Promise<ProgramDayExercise> {
    const dayEx = await this.programDayExerciseRepository.findOne({ where: { id } });
    if (!dayEx) {
      throw new NotFoundException(`Exercise mapping with ID ${id} not found`);
    }
    dayEx.targetSets = targetSets;
    dayEx.targetRepsRange = targetRepsRange;
    return this.programDayExerciseRepository.save(dayEx);
  }

  async removeDayExercise(id: string): Promise<void> {
    const dayEx = await this.programDayExerciseRepository.findOne({ where: { id } });
    if (!dayEx) {
      throw new NotFoundException(`Exercise mapping with ID ${id} not found`);
    }
    await this.programDayExerciseRepository.remove(dayEx);
  }

  async addDayExercise(dayId: string, exerciseId: string, targetSets: number, targetRepsRange: string): Promise<ProgramDayExercise> {
    const day = await this.programDayRepository.findOne({ where: { id: dayId } });
    if (!day) {
      throw new NotFoundException(`Program day with ID ${dayId} not found`);
    }
    const resolvedExerciseId = await this.exercisesService.resolveExerciseId(exerciseId);
    const exercise = await this.exerciseRepository.findOne({ where: { id: resolvedExerciseId } });
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${resolvedExerciseId} not found`);
    }

    const existing = await this.programDayExerciseRepository.find({ where: { programDayId: dayId } });
    const order = existing.length + 1;

    const dayEx = this.programDayExerciseRepository.create({
      programDayId: dayId,
      exerciseId: resolvedExerciseId,
      order,
      targetSets,
      targetRepsRange,
      targetRestTime: 90,
    });
    return this.programDayExerciseRepository.save(dayEx);
  }
}
