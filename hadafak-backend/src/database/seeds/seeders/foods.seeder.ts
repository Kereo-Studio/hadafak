import { DataSource } from 'typeorm';
import { Food } from '../../../modules/nutrition/entities/food.entity';
import { FOODS } from '../data/foods.data';

/**
 * Seeds the base whole-food library. Idempotent: inserts foods that don't yet
 * exist (matched by name) and leaves existing ones untouched, so it is safe to
 * re-run and won't clobber user-created or AI foods.
 */
export async function seedFoods(dataSource: DataSource): Promise<void> {
  const foodRepo = dataSource.getRepository(Food);
  const existing = new Set((await foodRepo.find({ select: { name: true } })).map((f) => f.name.toLowerCase()));

  const toInsert = FOODS.filter((f) => !existing.has(f.name.toLowerCase()));
  if (toInsert.length) {
    await foodRepo.save(toInsert.map((f) => foodRepo.create(f)));
  }
  console.log(`  ✓ Foods: ${toInsert.length} inserted, ${FOODS.length - toInsert.length} already present.`);
}
