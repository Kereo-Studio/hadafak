import { INestApplicationContext } from '@nestjs/common';
import { RecipeImportService } from '../../../modules/recipe-integration/services/recipe-import.service';

/**
 * Seed search terms fed to TheMealDB. Each term pulls a batch of real recipes
 * which the import pipeline normalizes, links to foods, computes macros for,
 * auto-tags, and de-duplicates. Chosen for variety across meal types and
 * protein sources.
 */
const QUERIES = [
  'chicken', 'beef', 'fish', 'salmon', 'pasta', 'rice', 'egg',
  'salad', 'soup', 'vegetarian', 'shrimp', 'breakfast', 'curry', 'lamb',
];

/**
 * Imports recipes live from TheMealDB via the existing import pipeline.
 * Idempotent: the pipeline tracks imports through RecipeExternalMapping, so
 * already-imported recipes are skipped on re-run. Degrades gracefully to the
 * provider's mock recipes if the network is unavailable.
 */
export async function seedRecipes(app: INestApplicationContext): Promise<void> {
  const importService = app.get(RecipeImportService);

  let imported = 0;
  let duplicates = 0;
  let failed = 0;

  for (const query of QUERIES) {
    try {
      const r = await importService.runSyncImport('themealdb', { query, limit: 25 });
      imported += r.imported;
      duplicates += r.duplicates;
      failed += r.failed;
      console.log(`    "${query}": +${r.imported} imported, ${r.duplicates} dup, ${r.failed} failed`);
    } catch (err: any) {
      console.warn(`    "${query}": query failed — ${err.message}`);
    }
  }

  console.log(`  ✓ Recipes: ${imported} imported, ${duplicates} skipped (existing), ${failed} failed.`);
}
