import { DataSource } from 'typeorm';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import {
  Exercise,
  ExerciseDifficulty,
  ExerciseSource,
} from '../../../modules/exercises/entities/exercise.entity';
import { MuscleGroup } from '../../../modules/exercises/entities/muscle-group.entity';
import { Equipment } from '../../../modules/exercises/entities/equipment.entity';
import { normalizeExerciseName } from '../../../modules/exercises/utils/normalize';

const DATASET_DIR = path.join(__dirname, '../../../../../exercises-dataset-main');
const EXERCISES_JSON = path.join(DATASET_DIR, 'data/exercises.json');
const VIDEOS_DIR = path.join(DATASET_DIR, 'videos');

interface RawExercise {
  id: string;
  name: string;
  body_part?: string;
  equipment?: string;
  instructions?: { en?: string | string[] };
  instruction_steps?: { en?: string[] };
  muscle_group?: string;
  secondary_muscles?: string[];
  target?: string;
  gif_url?: string;
}

function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

async function runWithConcurrency<T>(limit: number, items: T[], fn: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array(Math.min(limit, queue.length))
    .fill(null)
    .map(async () => {
      while (queue.length) {
        const item = queue.shift();
        if (item) await fn(item);
      }
    });
  await Promise.all(workers);
}

/**
 * Seeds the full exercise library from the local offline dataset
 * (exercises-dataset-main, ~1324 exercises). Idempotent: clears the exercises
 * table (and its secondary-muscle junction) before reseeding.
 *
 * GIF strategy:
 *  - Default: gifUrl points at the in-app proxy `/api/v1/exercises/image/:id`,
 *    which lazily fetches + caches media on first request. Fast, offline-safe.
 *  - If SEED_UPLOAD_GIFS=true: uploads every local GIF to S3 first and stores
 *    the direct S3 URL instead (needs AWS creds + the videos/ folder present).
 */
export async function seedExercises(dataSource: DataSource): Promise<void> {
  if (!fs.existsSync(EXERCISES_JSON)) {
    console.warn(`  ⚠ exercises.json not found at ${EXERCISES_JSON} — skipping exercise seed.`);
    return;
  }

  const raw: RawExercise[] = JSON.parse(fs.readFileSync(EXERCISES_JSON, 'utf-8'));
  console.log(`  Loaded ${raw.length} exercises from dataset.`);

  const muscleRepo = dataSource.getRepository(MuscleGroup);
  const equipRepo = dataSource.getRepository(Equipment);
  const exerciseRepo = dataSource.getRepository(Exercise);

  // Clear existing exercises (junction first to satisfy FKs)
  await dataSource.query('DELETE FROM exercise_secondary_muscles;');
  await exerciseRepo.createQueryBuilder().delete().execute();

  // ── Resolve all unique muscle groups + equipment up front ──────────────────
  const muscleMap = new Map<string, MuscleGroup>(
    (await muscleRepo.find()).map((m) => [m.name.toLowerCase().trim(), m]),
  );
  const equipMap = new Map<string, Equipment>(
    (await equipRepo.find()).map((eq) => [eq.name.toLowerCase().trim(), eq]),
  );

  const muscleNames = new Set<string>();
  const equipNames = new Set<string>();
  for (const ex of raw) {
    muscleNames.add((ex.muscle_group || ex.target || ex.body_part || 'full body').toLowerCase().trim());
    equipNames.add((ex.equipment || 'body weight').toLowerCase().trim());
    for (const sm of ex.secondary_muscles || []) muscleNames.add(sm.toLowerCase().trim());
  }

  for (const name of muscleNames) {
    if (!muscleMap.has(name)) {
      const created = await muscleRepo.save(muscleRepo.create({ name })).catch(async () => muscleRepo.findOneOrFail({ where: { name } }));
      muscleMap.set(name, created);
    }
  }
  for (const name of equipNames) {
    if (!equipMap.has(name)) {
      const created = await equipRepo.save(equipRepo.create({ name })).catch(async () => equipRepo.findOneOrFail({ where: { name } }));
      equipMap.set(name, created);
    }
  }
  console.log(`  Resolved ${muscleMap.size} muscle groups, ${equipMap.size} equipment types.`);

  // ── Optional: upload GIFs to S3 ────────────────────────────────────────────
  const s3UrlMap = new Map<string, string>();
  if (process.env.SEED_UPLOAD_GIFS === 'true') {
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_S3_REGION || 'eu-central-1';
    if (!bucket) {
      console.warn('  ⚠ SEED_UPLOAD_GIFS=true but AWS_S3_BUCKET_NAME is unset — skipping upload.');
    } else {
      const s3 = new S3Client({ region });
      let uploaded = 0;
      console.log('  Uploading GIFs to S3 (concurrency=15)...');
      await runWithConcurrency(15, raw, async (ex) => {
        if (!ex.gif_url) return;
        const file = path.join(VIDEOS_DIR, path.basename(ex.gif_url));
        if (!fs.existsSync(file)) return;
        try {
          await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: `exercises/${ex.id}.gif`,
            Body: fs.readFileSync(file),
            ContentType: 'image/gif',
          }));
          s3UrlMap.set(ex.id, `https://${bucket}.s3.${region}.amazonaws.com/exercises/${ex.id}.gif`);
          if (++uploaded % 200 === 0) console.log(`    uploaded ${uploaded}...`);
        } catch (err: any) {
          console.warn(`    failed upload ${ex.id}: ${err.message}`);
        }
      });
      console.log(`  Uploaded ${uploaded} GIFs to S3.`);
    }
  }

  // ── Insert exercises ───────────────────────────────────────────────────────
  const usedNames = new Set<string>();
  let count = 0;
  for (const ex of raw) {
    try {
      const primaryMuscle = muscleMap.get((ex.muscle_group || ex.target || ex.body_part || 'full body').toLowerCase().trim())!;
      const equipment = equipMap.get((ex.equipment || 'body weight').toLowerCase().trim())!;
      const secondary = (ex.secondary_muscles || [])
        .map((s) => muscleMap.get(s.toLowerCase().trim()))
        .filter((m): m is MuscleGroup => !!m);

      let instructions: string[] = [];
      if (Array.isArray(ex.instruction_steps?.en)) {
        instructions = ex.instruction_steps!.en!;
      } else if (typeof ex.instructions?.en === 'string') {
        instructions = ex.instructions.en.split('.').map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(ex.instructions?.en)) {
        instructions = ex.instructions!.en as string[];
      }

      let name = normalizeExerciseName(ex.name);
      if (usedNames.has(name)) name = `${name}-${ex.id}`;
      usedNames.add(name);

      const s3Base = process.env.AWS_S3_BUCKET_NAME
        ? `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION || 'eu-central-1'}.amazonaws.com`
        : null;
      const gifUrl = s3UrlMap.get(ex.id)
        ?? (s3Base ? `${s3Base}/exercises/${ex.id}.gif` : `/api/v1/exercises/image/${ex.id}`);

      await exerciseRepo.save(
        exerciseRepo.create({
          name,
          displayName: capitalizeWords(ex.name),
          description: `Targeting ${ex.target || primaryMuscle.name} using ${ex.equipment || 'body weight'}.`,
          muscleGroup: primaryMuscle,
          secondaryMuscles: secondary,
          equipment,
          difficulty: ExerciseDifficulty.BEGINNER,
          instructions,
          gifUrl,
          source: ExerciseSource.EXERCIDEDB,
          externalId: ex.id,
        }),
      );
      if (++count % 200 === 0) console.log(`    inserted ${count}/${raw.length}...`);
    } catch (err: any) {
      console.warn(`    failed exercise ${ex.id}: ${err.message}`);
    }
  }

  console.log(`  ✓ Seeded ${count} exercises.`);
}
