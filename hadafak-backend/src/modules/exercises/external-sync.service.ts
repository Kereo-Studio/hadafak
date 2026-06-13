import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise, ExerciseDifficulty, ExerciseSource } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { Equipment } from './entities/equipment.entity';

@Injectable()
export class ExternalSyncService {
  private readonly logger = new Logger(ExternalSyncService.name);

  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(MuscleGroup)
    private readonly muscleGroupRepository: Repository<MuscleGroup>,
    @InjectRepository(Equipment)
    private readonly equipmentRepository: Repository<Equipment>,
  ) {}

  async syncExercises(): Promise<{ synced: number; skipped: number }> {
    let exerciseDbRaw: any[] = [];
    let wgerRaw: any[] = [];

    // 1. Fetch/Simulate ExerciseDB
    try {
      const apiKey = process.env.EXERCISEDB_API_KEY;
      if (apiKey) {
        this.logger.log('Fetching live exercises from ExerciseDB...');
        const res = await fetch('https://exercisedb.p.rapidapi.com/exercises?limit=50', {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        });
        if (res.ok) {
          exerciseDbRaw = await res.json();
        }
      }
    } catch (err) {
      this.logger.warn(`ExerciseDB API fetch failed: ${err.message}. Falling back to mock.`);
    }

    if (exerciseDbRaw.length === 0) {
      this.logger.log('Simulating ExerciseDB responses...');
      exerciseDbRaw = this.getMockExerciseDbData();
    }

    // 2. Fetch/Simulate Wger
    try {
      const wgerUrl = process.env.WGER_API_URL || 'https://wger.de/api/v2/exercise/?language=2&limit=50';
      if (process.env.WGER_API_KEY) {
        this.logger.log('Fetching live exercises from Wger...');
        const res = await fetch(wgerUrl, {
          headers: {
            'Authorization': `Token ${process.env.WGER_API_KEY}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          wgerRaw = data.results || [];
        }
      }
    } catch (err) {
      this.logger.warn(`Wger API fetch failed: ${err.message}. Falling back to mock.`);
    }

    if (wgerRaw.length === 0) {
      this.logger.log('Simulating Wger responses...');
      wgerRaw = this.getMockWgerData();
    }

    // Combine and process
    let syncedCount = 0;
    let skippedCount = 0;

    const allDbExercises = await this.exerciseRepository.find();

    // Process ExerciseDB
    for (const raw of exerciseDbRaw) {
      const mapped = await this.mapExerciseDb(raw);
      if (!mapped) continue;

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      await this.exerciseRepository.save(mapped);
      allDbExercises.push(mapped);
      syncedCount++;
    }

    // Process Wger
    for (const raw of wgerRaw) {
      const mapped = await this.mapWger(raw);
      if (!mapped) continue;

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      await this.exerciseRepository.save(mapped);
      allDbExercises.push(mapped);
      syncedCount++;
    }

    return { synced: syncedCount, skipped: skippedCount };
  }

  private checkSimilarityDuplicate(candidate: Exercise, existing: Exercise[]): boolean {
    const candidateNormalized = this.normalizeName(candidate.displayName);
    for (const ex of existing) {
      if (ex.name === candidate.name || ex.externalId === candidate.externalId) {
        return true;
      }
      const exNormalized = this.normalizeName(ex.displayName);
      const similarity = this.calculateJaccardSimilarity(candidateNormalized, exNormalized);
      if (similarity >= 0.7) {
        this.logger.log(`Skipping duplicate detection: "${candidate.displayName}" matches "${ex.displayName}" with similarity ${similarity.toFixed(2)}`);
        return true;
      }
    }
    return false;
  }

  private calculateJaccardSimilarity(str1: string, str2: string): number {
    const tokens1 = new Set(str1.toLowerCase().split(/[\s-_]+/));
    const tokens2 = new Set(str2.toLowerCase().split(/[\s-_]+/));
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    return intersection.size / union.size;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }

  private async getOrCreateMuscleGroup(name: string): Promise<MuscleGroup> {
    const normalized = name.toLowerCase().trim();
    let muscle = await this.muscleGroupRepository.findOne({ where: { name: normalized } });
    if (!muscle) {
      muscle = this.muscleGroupRepository.create({ name: normalized });
      await this.muscleGroupRepository.save(muscle);
    }
    return muscle;
  }

  private async getOrCreateEquipment(name: string): Promise<Equipment> {
    const normalized = name.toLowerCase().trim();
    let eq = await this.equipmentRepository.findOne({ where: { name: normalized } });
    if (!eq) {
      eq = this.equipmentRepository.create({ name: normalized });
      await this.equipmentRepository.save(eq);
    }
    return eq;
  }

  private async mapExerciseDb(raw: any): Promise<Exercise | null> {
    try {
      const displayName = raw.name;
      const name = this.normalizeName(displayName);

      const muscle = await this.getOrCreateMuscleGroup(raw.target || 'chest');
      const eq = await this.getOrCreateEquipment(raw.equipment || 'bodyweight');

      const ex = new Exercise();
      ex.name = name;
      ex.displayName = this.capitalize(displayName);
      ex.description = `Targeting ${raw.target} using ${raw.equipment}.`;
      ex.muscleGroup = muscle;
      ex.equipment = eq;
      ex.difficulty = ExerciseDifficulty.BEGINNER;
      ex.instructions = raw.instructions || [];
      ex.gifUrl = raw.gifUrl || null;
      ex.source = ExerciseSource.EXERCIDEDB;
      ex.externalId = raw.id || `edb-${name}`;

      return ex;
    } catch {
      return null;
    }
  }

  private async mapWger(raw: any): Promise<Exercise | null> {
    try {
      const displayName = raw.name;
      const name = this.normalizeName(displayName);

      const rawMuscleName = raw.category?.name || 'back';
      const muscle = await this.getOrCreateMuscleGroup(rawMuscleName);
      
      const rawEquipment = raw.equipment && raw.equipment[0]?.name ? raw.equipment[0].name : 'dumbbell';
      const eq = await this.getOrCreateEquipment(rawEquipment);

      const ex = new Exercise();
      ex.name = name;
      ex.displayName = this.capitalize(displayName);
      ex.description = raw.description || `Wger exercise targeting ${rawMuscleName}.`;
      ex.muscleGroup = muscle;
      ex.equipment = eq;
      ex.difficulty = ExerciseDifficulty.INTERMEDIATE;
      ex.instructions = raw.description ? [raw.description] : [];
      ex.source = ExerciseSource.WGER;
      ex.externalId = raw.id ? raw.id.toString() : `wger-${name}`;

      return ex;
    } catch {
      return null;
    }
  }

  private capitalize(s: string): string {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private getMockExerciseDbData() {
    return [
      { id: 'db-1', name: 'Barbell Bench Press', target: 'chest', equipment: 'barbell', instructions: ['Lie on bench', 'Lower barbell to chest', 'Push up'] },
      { id: 'db-2', name: 'Incline Bench Press', target: 'chest', equipment: 'barbell', instructions: ['Lie on incline bench', 'Lower barbell', 'Press up'] },
      { id: 'db-3', name: 'Barbell Squat', target: 'quads', equipment: 'barbell', instructions: ['Squat down', 'Drive back up'] },
      { id: 'db-4', name: 'Leg Press', target: 'quads', equipment: 'machine', instructions: ['Push platform away', 'Lower slowly'] },
    ];
  }

  private getMockWgerData() {
    return [
      { id: 101, name: 'Flat Bench Press', category: { name: 'chest' }, equipment: [{ name: 'barbell' }], description: 'Flat bench barbell press.' },
      { id: 102, name: 'Lat Pulldown', category: { name: 'back' }, equipment: [{ name: 'machine' }], description: 'Cable pull down to chest.' },
      { id: 103, name: 'Dumbbell Bicep Curl', category: { name: 'arms' }, equipment: [{ name: 'dumbbell' }], description: 'Curl dumbbell up.' },
    ];
  }
}
