/**
 * Seed orchestrator.
 *
 *   npm run db:seed                    # run every seeder, in order
 *   npm run db:seed -- exercises foods # run only the named seeders
 *
 * Available seeders: exercises, foods, recipes, programs
 *
 * Boots a NestJS application context so the recipes seeder can reuse the fully
 * wired TheMealDB import pipeline (provider + normalization + macro calc +
 * tagging + dedup). Every seeder is idempotent, so this is safe to re-run; for
 * a clean rebuild run `npm run db:reset` first (or `npm run db:fresh`).
 *
 * Order matters: foods before recipes (ingredient linking) and exercises before
 * programs (exercise resolution).
 */
import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { seedExercises } from './seeders/exercises.seeder';
import { seedFoods } from './seeders/foods.seeder';
import { seedRecipes } from './seeders/recipes.seeder';
import { seedPrograms } from './seeders/programs.seeder';

const ALL = ['exercises', 'foods', 'recipes', 'programs'] as const;
type SeederName = (typeof ALL)[number];

async function main() {
  const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  const invalid = requested.filter((r) => !ALL.includes(r as SeederName));
  if (invalid.length) {
    console.error(`Unknown seeder(s): ${invalid.join(', ')}. Valid: ${ALL.join(', ')}`);
    process.exit(1);
  }
  // Preserve canonical order regardless of arg order.
  const toRun: SeederName[] = requested.length
    ? ALL.filter((s) => requested.includes(s))
    : [...ALL];

  console.log(`\n🌱 Seeding: ${toRun.join(', ')}\n`);
  const started = Date.now();

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
    abortOnError: false,
  });
  const dataSource = app.get(DataSource);

  try {
    for (const name of toRun) {
      console.log(`▶ ${name}`);
      switch (name) {
        case 'exercises':
          await seedExercises(dataSource);
          break;
        case 'foods':
          await seedFoods(dataSource);
          break;
        case 'recipes':
          await seedRecipes(app);
          break;
        case 'programs':
          await seedPrograms(dataSource);
          break;
      }
    }
    console.log(`\n✓ Seeding complete in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
  } finally {
    await app.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
