import { Injectable } from '@nestjs/common';
import { RecipeProvider, ExternalRecipe, ExternalRecipeIngredient } from './recipe-provider.interface';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class RecipeNlgProvider implements RecipeProvider {
  getProviderName(): string {
    return 'RecipeNLG';
  }

  async fetchRecipes(options: {
    limit: number;
    offset: number;
    filePath?: string;
    query?: string;
  }): Promise<ExternalRecipe[]> {
    const results: ExternalRecipe[] = [];

    if (!options.filePath || !fs.existsSync(options.filePath)) {
      console.warn(`[RecipeNlgProvider] File path ${options.filePath || 'null'} does not exist. Returning mock RecipeNLG data.`);
      return this.getMockNlgRecipes(options.limit);
    }

    try {
      const fileStream = fs.createReadStream(options.filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let lineCount = 0;
      let skipped = 0;

      for await (const line of rl) {
        if (lineCount === 0) {
          // Skip header row
          lineCount++;
          continue;
        }

        const parsed = this.parseCsvLine(line);
        if (parsed) {
          if (options.query) {
            const q = options.query.toLowerCase();
            const titleMatch = parsed.title.toLowerCase().includes(q);
            const tagMatch = parsed.tags.some(t => t.toLowerCase().includes(q));
            const descMatch = parsed.description?.toLowerCase().includes(q);
            if (!titleMatch && !tagMatch && !descMatch) {
              continue;
            }
          }

          if (skipped < options.offset) {
            skipped++;
            continue;
          }

          results.push(parsed);
        }

        if (results.length >= options.limit) {
          break;
        }
      }

      rl.close();
      return results;
    } catch (err) {
      console.error(`[RecipeNlgProvider] Failed parsing CSV stream: ${err.message}`);
      return this.getMockNlgRecipes(options.limit);
    }
  }

  private parseCsvLine(line: string): ExternalRecipe | null {
    // Basic CSV cell extraction supporting simple escapes
    // Expected cols: id/index, title, ingredients, directions, link, source, NER
    const cols: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cols.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cols.push(currentCell.trim());

    if (cols.length < 5) {
      return null;
    }

    const title = cols[1]?.replace(/^"|"$/g, '') || 'RecipeNLG Meal';
    const rawIngredients = cols[2]?.replace(/^"|"$/g, '') || '[]';
    const rawDirections = cols[3]?.replace(/^"|"$/g, '') || '[]';
    const nerRaw = cols[6]?.replace(/^"|"$/g, '') || '[]';

    let ingredientsList: string[] = [];
    let instructions: string[] = [];
    let baseNers: string[] = [];

    try {
      // JSON clean and parse
      ingredientsList = JSON.parse(rawIngredients.replace(/'/g, '"'));
    } catch {
      ingredientsList = rawIngredients.split('|').map(s => s.trim());
    }

    try {
      instructions = JSON.parse(rawDirections.replace(/'/g, '"'));
    } catch {
      instructions = rawDirections.split('|').map(s => s.trim());
    }

    try {
      baseNers = JSON.parse(nerRaw.replace(/'/g, '"'));
    } catch {
      baseNers = [];
    }

    const ingredients: ExternalRecipeIngredient[] = ingredientsList.map((ingStr, index) => {
      // Fallback matching logic
      const baseName = baseNers[index] || ingStr.toLowerCase();
      const parsed = this.estimateIngredientValues(ingStr, baseName);
      return parsed;
    });

    return {
      externalId: `nlg_${cols[0] || Math.random().toString(36).substring(7)}`,
      title,
      description: `RecipeNLG imported meal: ${title}`,
      instructions: instructions.length > 0 ? instructions : ['Cook according to standard recipe directions.'],
      prepTime: 15,
      cookTime: 20,
      servings: 4,
      tags: ['RecipeNLG'],
      ingredients,
      nutrition: null, // Will calculate using local system nutrition foods
    };
  }

  private estimateIngredientValues(fullStr: string, nerName: string): ExternalRecipeIngredient {
    const cleanStr = fullStr.trim().toLowerCase();
    // Parse quantity
    const match = cleanStr.match(/^([\d\/\s\.-]+)?(.*)$/);
    let amount = 100;
    let unit = 'g';

    if (match && match[1]) {
      const numStr = match[1].trim();
      if (numStr.includes('/')) {
        const parts = numStr.split(/\s+/);
        let val = 0;
        for (const part of parts) {
          if (part.includes('/')) {
            const frac = part.split('/');
            val += parseFloat(frac[0]) / parseFloat(frac[1]);
          } else {
            val += parseFloat(part);
          }
        }
        amount = val;
      } else {
        amount = parseFloat(numStr) || 100;
      }
    }

    // Determine unit
    if (cleanStr.includes('cup')) unit = 'cup';
    else if (cleanStr.includes('tbsp') || cleanStr.includes('tablespoon')) unit = 'tbsp';
    else if (cleanStr.includes('tsp') || cleanStr.includes('teaspoon')) unit = 'tsp';
    else if (cleanStr.includes('pound') || cleanStr.includes('lb')) unit = 'lb';
    else if (cleanStr.includes('ounce') || cleanStr.includes('oz')) unit = 'oz';
    else if (cleanStr.includes('ml')) unit = 'ml';

    return {
      name: nerName.trim().toLowerCase(),
      amount: Math.round(amount * 10) / 10,
      unit,
    };
  }

  private getMockNlgRecipes(limit: number): ExternalRecipe[] {
    return [
      {
        externalId: 'nlg_mock_1',
        title: 'NLG Pan-Seared Beef Steak',
        description: 'RecipeNLG imported meal: NLG Pan-Seared Beef Steak',
        instructions: [
          'Preheat cast iron skillet to high heat.',
          'Season steak with salt and ground black pepper.',
          'Sear steak for 3 minutes on each side for medium-rare.',
          'Let steak rest for 5 minutes before cutting.'
        ],
        prepTime: 5,
        cookTime: 10,
        servings: 2,
        tags: ['RecipeNLG'],
        ingredients: [
          { name: 'beef steak', amount: 450, unit: 'g' },
          { name: 'butter', amount: 2, unit: 'tbsp' },
          { name: 'garlic clove', amount: 3, unit: 'whole' }
        ],
        nutrition: {
          calories: 620,
          protein: 58,
          carbs: 2,
          fat: 42
        }
      }
    ].slice(0, limit);
  }
}
