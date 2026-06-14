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

    // 1. Fetch ExerciseDB
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
      this.logger.warn(`ExerciseDB API fetch failed: ${err.message}.`);
    }

    // 2. Fetch Wger
    try {
      const wgerUrl = process.env.WGER_API_URL || 'https://wger.de/api/v2/exerciseinfo/?language=2&limit=50';
      this.logger.log('Fetching live exercises from Wger...');
      const headers: Record<string, string> = {};
      if (process.env.WGER_API_KEY) {
        headers['Authorization'] = `Token ${process.env.WGER_API_KEY}`;
      }
      const res = await fetch(wgerUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        wgerRaw = data.results || [];
      } else {
        this.logger.warn(`Wger API responded with status ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`Wger API fetch failed: ${err.message}.`);
    }

    // Combine and process
    let syncedCount = 0;
    let skippedCount = 0;

    const allDbExercises = await this.exerciseRepository.find();
    const existingExternalIds = new Set(allDbExercises.map(e => e.externalId).filter(Boolean));

    // Process ExerciseDB
    for (const raw of exerciseDbRaw) {
      const mapped = await this.mapExerciseDb(raw);
      if (!mapped) continue;

      if (existingExternalIds.has(mapped.externalId)) {
        skippedCount++;
        continue;
      }

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      try {
        await this.exerciseRepository.upsert(mapped, { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true });
        allDbExercises.push(mapped);
        existingExternalIds.add(mapped.externalId);
        syncedCount++;
      } catch (e) {
        this.logger.warn(`Failed to upsert exercise "${mapped.displayName}": ${e.message}`);
        skippedCount++;
      }
    }

    // Process Wger
    for (const raw of wgerRaw) {
      const mapped = await this.mapWger(raw);
      if (!mapped) continue;

      if (existingExternalIds.has(mapped.externalId)) {
        skippedCount++;
        continue;
      }

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) {
        skippedCount++;
        continue;
      }

      try {
        await this.exerciseRepository.upsert(mapped, { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true });
        allDbExercises.push(mapped);
        existingExternalIds.add(mapped.externalId);
        syncedCount++;
      } catch (e) {
        this.logger.warn(`Failed to upsert exercise "${mapped.displayName}": ${e.message}`);
        skippedCount++;
      }
    }

    return { synced: syncedCount, skipped: skippedCount };
  }

  private checkSimilarityDuplicate(candidate: Exercise, existing: Exercise[]): boolean {
    const candidateNormalized = this.normalizeName(candidate.displayName);
    for (const ex of existing) {
      if (ex.name === candidate.name || ex.externalId === candidate.externalId) {
        return true;
      }
      const exNormalized = this.normalizeName(ex.displayName || ex.name || '');
      const similarity = this.calculateJaccardSimilarity(candidateNormalized, exNormalized);
      if (similarity >= 0.7) {
        this.logger.log(`Skipping duplicate detection: "${candidate.displayName}" matches "${ex.displayName || ex.name}" with similarity ${similarity.toFixed(2)}`);
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

  private normalizeName(name: string | null | undefined): string {
    if (!name) return '';
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
      ex.gifUrl = raw.id ? `/api/v1/exercises/image/${raw.id}` : undefined;
      ex.source = ExerciseSource.EXERCIDEDB;
      ex.externalId = raw.id || `edb-${name}`;

      return ex;
    } catch {
      return null;
    }
  }

  private async mapWger(raw: any): Promise<Exercise | null> {
    try {
      const translation = raw.translations?.find((t: any) => t.language === 2) || raw.translations?.[0];
      const displayName = translation?.name || raw.name;
      if (!displayName) return null;

      const name = this.normalizeName(displayName);

      const rawMuscleName = raw.category?.name || 'back';
      const muscle = await this.getOrCreateMuscleGroup(rawMuscleName);
      
      const rawEquipment = raw.equipment && raw.equipment[0]?.name ? raw.equipment[0].name : 'dumbbell';
      const eq = await this.getOrCreateEquipment(rawEquipment);

      const ex = new Exercise();
      ex.name = name;
      ex.displayName = this.capitalize(displayName);
      
      let desc = translation?.description || raw.description || `Wger exercise targeting ${rawMuscleName}.`;
      desc = desc.replace(/<[^>]*>/g, '').trim();
      ex.description = desc;
      
      ex.muscleGroup = muscle;
      ex.equipment = eq;
      ex.difficulty = ExerciseDifficulty.INTERMEDIATE;
      ex.instructions = desc ? [desc] : [];
      ex.source = ExerciseSource.WGER;
      ex.externalId = raw.id ? raw.id.toString() : `wger-${name}`;

      return ex;
    } catch (err) {
      this.logger.error(`Error mapping Wger exercise: ${err.message}`, err.stack);
      return null;
    }
  }

  private capitalize(s: string): string {
    return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  async syncExercisesForQuery(searchQuery: string): Promise<{ synced: number }> {
    const q = searchQuery.toLowerCase().trim();
    if (!q || q.length < 3) return { synced: 0 };

    this.logger.log(`Performing dynamic query sync for "${q}"...`);
    const allDbExercises = await this.exerciseRepository.find();
    const existingExternalIds = new Set(allDbExercises.map(e => e.externalId).filter(Boolean));
    let syncedCount = 0;

    // 1. Fetch from ExerciseDB
    let exerciseDbRaw: any[] = [];
    try {
      const apiKey = process.env.EXERCISEDB_API_KEY;
      if (apiKey) {
        // Fetch page 1 (10 items)
        const res1 = await fetch(`https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}?limit=10&offset=0`, {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        });
        if (res1.ok) {
          const data1 = await res1.json();
          if (Array.isArray(data1)) {
            exerciseDbRaw.push(...data1);
          }
        }
        
        // Fetch page 2 (10 items)
        const res2 = await fetch(`https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(q)}?limit=10&offset=10`, {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        });
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2)) {
            exerciseDbRaw.push(...data2);
          }
        }
      }
    } catch (err) {
      this.logger.warn(`Dynamic ExerciseDB sync failed for "${q}": ${err.message}`);
    }

    // 2. Fetch from Wger
    let wgerRaw: any[] = [];
    try {
      const wgerUrl = `https://wger.de/api/v2/exerciseinfo/?language=2&search=${encodeURIComponent(q)}&limit=20`;
      const headers: Record<string, string> = {};
      if (process.env.WGER_API_KEY) {
        headers['Authorization'] = `Token ${process.env.WGER_API_KEY}`;
      }
      const res = await fetch(wgerUrl, { headers });
      if (res.ok) {
        const data = await res.json();
        wgerRaw = data.results || [];
      }
    } catch (err) {
      this.logger.warn(`Dynamic Wger sync failed for "${q}": ${err.message}`);
    }

    // Process ExerciseDB
    for (const raw of exerciseDbRaw) {
      const mapped = await this.mapExerciseDb(raw);
      if (!mapped) continue;

      if (existingExternalIds.has(mapped.externalId)) continue;

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) continue;

      try {
        await this.exerciseRepository.upsert(mapped, { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true });
        allDbExercises.push(mapped);
        existingExternalIds.add(mapped.externalId);
        syncedCount++;
      } catch (e) {
        this.logger.warn(`Failed to upsert exercise "${mapped.displayName}": ${e.message}`);
      }
    }

    // Process Wger
    for (const raw of wgerRaw) {
      const mapped = await this.mapWger(raw);
      if (!mapped) continue;

      if (existingExternalIds.has(mapped.externalId)) continue;

      const isDuplicate = this.checkSimilarityDuplicate(mapped, allDbExercises);
      if (isDuplicate) continue;

      try {
        await this.exerciseRepository.upsert(mapped, { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true });
        allDbExercises.push(mapped);
        existingExternalIds.add(mapped.externalId);
        syncedCount++;
      } catch (e) {
        this.logger.warn(`Failed to upsert exercise "${mapped.displayName}": ${e.message}`);
      }
    }

    if (syncedCount > 0) {
      this.logger.log(`Dynamic query sync for "${q}" completed: Synced ${syncedCount} new exercises.`);
    }
    return { synced: syncedCount };
  }
}
