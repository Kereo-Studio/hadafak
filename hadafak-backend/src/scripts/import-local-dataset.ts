import { DataSource } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Exercise, ExerciseDifficulty, ExerciseSource } from '../modules/exercises/entities/exercise.entity';
import { MuscleGroup } from '../modules/exercises/entities/muscle-group.entity';
import { Equipment } from '../modules/exercises/entities/equipment.entity';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { normalizeExerciseName } from '../modules/exercises/utils/normalize';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const DATASET_PATH = path.join(__dirname, '../../../exercises-dataset-main');
const EXERCISES_JSON_PATH = path.join(DATASET_PATH, 'data/exercises.json');
const VIDEOS_DIR = path.join(DATASET_PATH, 'videos');

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'hadafak-uploads-production-0diewr';
const region = process.env.AWS_S3_REGION || 'eu-central-1';

const s3Client = new S3Client({ region });

// Helper function to capitalize words
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Parallel processing helper with concurrency limit
async function promisePool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];
  let index = 0;

  for (const item of items) {
    const p = (async (currentIndex) => {
      results[currentIndex] = await fn(item, currentIndex);
    })(index++);
    
    executing.push(p);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Clean up finished promises
      const indicesToRemove: number[] = [];
      for (let i = 0; i < executing.length; i++) {
        // Since we don't have a native state on Promise, we can use a helper or just let it filter:
        // Wait, a simpler way is to just do batch processing or a queue. Let's write a simple queue.
      }
    }
  }
  await Promise.all(executing);
  return results;
}

// Clean and simple concurrency queue
async function runWithConcurrencyLimit<T>(
  concurrency: number,
  items: T[],
  fn: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array(Math.min(concurrency, queue.length))
    .fill(null)
    .map(async () => {
      while (queue.length > 0) {
        const item = queue.shift();
        if (item) {
          await fn(item);
        }
      }
    });
  await Promise.all(workers);
}

async function main() {
  console.log('--- OFFLINE DATASET SEEDER STARTING ---');
  
  if (!fs.existsSync(EXERCISES_JSON_PATH)) {
    console.error(`Error: Dataset exercises.json not found at ${EXERCISES_JSON_PATH}`);
    process.exit(1);
  }

  // Load JSON
  console.log('Reading exercises.json...');
  const exercisesJson = JSON.parse(fs.readFileSync(EXERCISES_JSON_PATH, 'utf-8'));
  console.log(`Loaded ${exercisesJson.length} exercises from JSON.`);

  // Initialize DB Connection
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  console.log('Database connected successfully.');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    console.log('Wiping existing exercises table (cascade delete will clean logs/workout plans)...');
    // We clear junction and main tables
    await queryRunner.query('DELETE FROM exercise_secondary_muscles;');
    await queryRunner.query('DELETE FROM exercises;');
    console.log('Database tables cleared successfully.');
  } finally {
    await queryRunner.release();
  }

  const muscleGroupRepo = AppDataSource.getRepository(MuscleGroup);
  const equipmentRepo = AppDataSource.getRepository(Equipment);
  const exerciseRepo = AppDataSource.getRepository(Exercise);

  // Load or cache existing muscle groups & equipment to avoid duplicates
  console.log('Caching existing muscle groups and equipment...');
  const muscleGroups = await muscleGroupRepo.find();
  const equipmentList = await equipmentRepo.find();

  const muscleGroupMap = new Map<string, MuscleGroup>(muscleGroups.map(m => [m.name.toLowerCase().trim(), m]));
  const equipmentMap = new Map<string, Equipment>(equipmentList.map(e => [e.name.toLowerCase().trim(), e]));

  // Collect all unique muscle groups and equipment from exercises JSON
  console.log('Pre-resolving all unique muscle groups and equipment names...');
  const uniqueMuscleNames = new Set<string>();
  const uniqueEquipmentNames = new Set<string>();

  for (const exerciseData of exercisesJson) {
    const primaryMuscleName = exerciseData.muscle_group || exerciseData.target || exerciseData.body_part || 'full body';
    uniqueMuscleNames.add(primaryMuscleName.toLowerCase().trim());

    if (exerciseData.equipment) {
      uniqueEquipmentNames.add(exerciseData.equipment.toLowerCase().trim());
    } else {
      uniqueEquipmentNames.add('body weight');
    }

    if (Array.isArray(exerciseData.secondary_muscles)) {
      for (const mName of exerciseData.secondary_muscles) {
        uniqueMuscleNames.add(mName.toLowerCase().trim());
      }
    }
  }

  // Pre-seed muscle groups sequentially
  console.log(`Ensuring ${uniqueMuscleNames.size} muscle groups exist in the database...`);
  for (const name of uniqueMuscleNames) {
    if (!muscleGroupMap.has(name)) {
      console.log(`Pre-creating MuscleGroup: ${name}`);
      try {
        const newGroup = await muscleGroupRepo.save(muscleGroupRepo.create({ name }));
        muscleGroupMap.set(name, newGroup);
      } catch (err: any) {
        // Fallback: fetch existing record if it was created/existed
        const existing = await muscleGroupRepo.findOne({ where: { name } });
        if (existing) {
          muscleGroupMap.set(name, existing);
        } else {
          throw err;
        }
      }
    }
  }

  // Pre-seed equipment sequentially
  console.log(`Ensuring ${uniqueEquipmentNames.size} equipment types exist in the database...`);
  for (const name of uniqueEquipmentNames) {
    if (!equipmentMap.has(name)) {
      console.log(`Pre-creating Equipment: ${name}`);
      try {
        const newEquip = await equipmentRepo.save(equipmentRepo.create({ name }));
        equipmentMap.set(name, newEquip);
      } catch (err: any) {
        // Fallback: fetch existing record if it was created/existed
        const existing = await equipmentRepo.findOne({ where: { name } });
        if (existing) {
          equipmentMap.set(name, existing);
        } else {
          throw err;
        }
      }
    }
  }

  const getOrCreateMuscleGroup = (name: string): MuscleGroup => {
    const key = name.toLowerCase().trim();
    const found = muscleGroupMap.get(key);
    if (!found) {
      throw new Error(`Unexpected missing muscle group in pre-resolved map: ${key}`);
    }
    return found;
  };

  const getOrCreateEquipment = (name: string): Equipment => {
    const key = name.toLowerCase().trim();
    const found = equipmentMap.get(key);
    if (!found) {
      throw new Error(`Unexpected missing equipment in pre-resolved map: ${key}`);
    }
    return found;
  };

  const processedNames = new Set<string>();

  // === PHASE 1: Upload all GIFs to S3 in parallel ===
  console.log('PHASE 1: Uploading all GIFs to S3 in parallel (concurrency=15)...');
  let uploadCount = 0;
  const s3UrlMap = new Map<string, string>(); // externalId -> S3 URL

  await runWithConcurrencyLimit(15, exercisesJson, async (exerciseData: any) => {
    const { id, gif_url } = exerciseData;
    if (!gif_url) return;

    const localFileName = path.basename(gif_url);
    const localFilePath = path.join(VIDEOS_DIR, localFileName);

    if (!fs.existsSync(localFilePath)) {
      console.warn(`Warning: GIF not found locally: ${localFilePath}`);
      return;
    }

    try {
      const fileBuffer = fs.readFileSync(localFilePath);
      const s3Key = `exercises/${id}.gif`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'image/gif',
      }));
      const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
      s3UrlMap.set(id, s3Url);
      uploadCount++;
      if (uploadCount % 100 === 0) {
        console.log(`  Uploaded ${uploadCount}/${exercisesJson.length} GIFs to S3...`);
      }
    } catch (err: any) {
      console.error(`Failed to upload GIF for exercise ${id}:`, err.message);
    }
  });

  console.log(`PHASE 1 complete: ${uploadCount} GIFs uploaded to S3.`);

  // === PHASE 2: Insert exercises into DB sequentially ===
  console.log('PHASE 2: Inserting exercises into database sequentially...');
  let processedCount = 0;

  for (const exerciseData of exercisesJson) {
    try {
      const {
        id,
        name,
        body_part,
        equipment,
        instructions,
        instruction_steps,
        muscle_group,
        secondary_muscles,
        target,
      } = exerciseData;

      // 1. Resolve muscle group and equipment from pre-seeded maps
      const primaryMuscleName = muscle_group || target || body_part || 'full body';
      const primaryMuscleGroup = getOrCreateMuscleGroup(primaryMuscleName);
      const equipmentEntity = getOrCreateEquipment(equipment || 'body weight');

      const secondaryMuscleEntities: MuscleGroup[] = [];
      if (Array.isArray(secondary_muscles)) {
        for (const mName of secondary_muscles) {
          secondaryMuscleEntities.push(getOrCreateMuscleGroup(mName));
        }
      }

      // 2. Handle instructions
      let finalInstructions: string[] = [];
      if (instruction_steps && Array.isArray(instruction_steps.en)) {
        finalInstructions = instruction_steps.en;
      } else if (instructions && instructions.en) {
        if (typeof instructions.en === 'string') {
          finalInstructions = instructions.en
            .split('.')
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 0);
        } else if (Array.isArray(instructions.en)) {
          finalInstructions = instructions.en;
        }
      }

      // 3. Get S3 URL from pre-uploaded map
      const finalS3Url = s3UrlMap.get(id) || '';

      // 4. Deduplicate normalized name safely (sequential, no race)
      let normalizedName = normalizeExerciseName(name);
      if (processedNames.has(normalizedName)) {
        normalizedName = `${normalizedName}-${id}`;
      }
      processedNames.add(normalizedName);

      // 5. Save to database
      const newExercise = exerciseRepo.create({
        name: normalizedName,
        displayName: capitalizeWords(name),
        description: `Targeting ${target || primaryMuscleName} using ${equipment || 'body weight'}.`,
        muscleGroup: primaryMuscleGroup,
        secondaryMuscles: secondaryMuscleEntities,
        equipment: equipmentEntity,
        difficulty: ExerciseDifficulty.BEGINNER,
        instructions: finalInstructions,
        gifUrl: finalS3Url || undefined,
        source: ExerciseSource.EXERCIDEDB,
        externalId: id,
      });

      await exerciseRepo.save(newExercise);
      processedCount++;
      if (processedCount % 100 === 0) {
        console.log(`  Inserted ${processedCount}/${exercisesJson.length} exercises into DB...`);
      }
    } catch (err: any) {
      console.error(`Error inserting exercise ID ${exerciseData?.id || 'unknown'}:`, err.message);
    }
  }

  console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
  console.log(`Total exercises imported into DB: ${processedCount}`);
  console.log(`Total GIFs uploaded to S3: ${uploadCount}`);

  await AppDataSource.destroy();
  console.log('Database connection closed.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error during migration:', err);
    process.exit(1);
  });
}
