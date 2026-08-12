import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Food, FoodSource } from '../../../modules/nutrition/entities/food.entity';

function parseCsv(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const rows: string[] = [];
  let currentRow = '';
  let inQuotes = false;

  for (const line of lines) {
    if (!line.trim() && !inQuotes) continue;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') inQuotes = !inQuotes;
    }
    currentRow += (currentRow ? '\n' : '') + line;
    if (!inQuotes) {
      rows.push(currentRow);
      currentRow = '';
    }
  }
  return rows;
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Seeds the Egyptian Food dataset from Egyptian_Food_CLEANED.csv into the database.
 * Idempotent: matches existing foods by name (case-insensitive) to prevent duplicates.
 */
export async function seedEgyptianFoods(dataSource: DataSource): Promise<void> {
  const csvPath = path.resolve(__dirname, '../../../../../Egyptian_Food_CLEANED.csv');
  if (!fs.existsSync(csvPath)) {
    console.error(`  ✕ Egyptian Food CSV not found at: ${csvPath}`);
    return;
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const rawRows = parseCsv(content);
  if (rawRows.length <= 1) {
    console.log('  ⚠ Egyptian Food CSV is empty.');
    return;
  }

  const foodRepo = dataSource.getRepository(Food);
  const existingFoods = await foodRepo.find({ select: { name: true } });
  const existingNames = new Set(existingFoods.map((f) => f.name.toLowerCase()));

  const toInsert: Partial<Food>[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const cols = parseRow(rawRows[i]);
    if (cols.length < 16) continue;

    const foodNameAr = cols[1];
    const foodNameEn = cols[2];
    if (!foodNameAr && !foodNameEn) continue;

    const combinedName = foodNameEn && foodNameAr ? `${foodNameEn} (${foodNameAr})` : foodNameEn || foodNameAr;
    if (existingNames.has(combinedName.toLowerCase())) continue;

    const imageUrl = cols[11] || null;
    const calories = parseFloat(cols[12]) || 0;
    const fat = parseFloat(cols[13]) || 0;
    const protein = parseFloat(cols[14]) || 0;
    const carbs = parseFloat(cols[15]) || 0;

    toInsert.push({
      name: combinedName,
      source: FoodSource.DATABASE,
      calories,
      protein,
      carbs,
      fat,
      servingSize: 100,
      servingUnit: 'g',
      imageUrl,
    });
    existingNames.add(combinedName.toLowerCase());
  }

  if (toInsert.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < toInsert.length; i += chunkSize) {
      const chunk = toInsert.slice(i, i + chunkSize);
      await foodRepo.save(chunk.map((item) => foodRepo.create(item)));
    }
  }

  console.log(`  ✓ Egyptian Foods: ${toInsert.length} inserted, ${rawRows.length - 1 - toInsert.length} already present.`);
}
