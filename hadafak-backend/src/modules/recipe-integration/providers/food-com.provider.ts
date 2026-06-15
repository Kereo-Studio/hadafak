import { Injectable } from '@nestjs/common';
import { RecipeProvider, ExternalRecipe } from './recipe-provider.interface';
import * as fs from 'fs';
import * as readline from 'readline';

@Injectable()
export class FoodComProvider implements RecipeProvider {
  getProviderName(): string {
    return 'FoodCom';
  }

  async fetchRecipes(options: {
    limit: number;
    offset: number;
    filePath?: string;
    query?: string;
  }): Promise<ExternalRecipe[]> {
    const results: ExternalRecipe[] = [];

    if (!options.filePath || !fs.existsSync(options.filePath)) {
      console.warn(`[FoodComProvider] File path ${options.filePath || 'null'} does not exist. Returning mock Food.com recipes.`);
      return this.getMockFoodComRecipes(options.limit);
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
      console.error(`[FoodComProvider] Failed parsing CSV stream: ${err.message}`);
      return this.getMockFoodComRecipes(options.limit);
    }
  }

  private parseCsvLine(line: string): ExternalRecipe | null {
    // Expected cols in food.com: name, id, minutes, contributor_id, submitted, tags, nutrition, n_steps, steps, description, ingredients, n_ingredients
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

    if (cols.length < 11) {
      return null;
    }

    const name = cols[0]?.replace(/^"|"$/g, '') || 'Food.com Recipe';
    const id = cols[1] || `foodcom_${Math.random().toString(36).substring(7)}`;
    const minutes = parseInt(cols[2], 10) || 30;
    const rawTags = cols[5]?.replace(/^"|"$/g, '') || '[]';
    const rawNutrition = cols[6]?.replace(/^"|"$/g, '') || '[]';
    const rawSteps = cols[8]?.replace(/^"|"$/g, '') || '[]';
    const description = cols[9]?.replace(/^"|"$/g, '') || `Food.com imported recipe: ${name}`;
    const rawIngredients = cols[10]?.replace(/^"|"$/g, '') || '[]';

    let tags: string[] = [];
    let steps: string[] = [];
    let ingredientsList: string[] = [];
    let nutritionArr: number[] = [];

    try {
      tags = JSON.parse(rawTags.replace(/'/g, '"'));
    } catch {
      tags = rawTags.split('|').map(t => t.trim());
    }

    try {
      steps = JSON.parse(rawSteps.replace(/'/g, '"'));
    } catch {
      steps = rawSteps.split('|').map(s => s.trim());
    }

    try {
      ingredientsList = JSON.parse(rawIngredients.replace(/'/g, '"'));
    } catch {
      ingredientsList = rawIngredients.split('|').map(i => i.trim());
    }

    try {
      nutritionArr = JSON.parse(rawNutrition);
    } catch {
      nutritionArr = [];
    }

    // Nutrition parser for Food.com format: [calories, total fat, sugar, sodium, protein, saturated fat, carbs]
    let nutrition: ExternalRecipe['nutrition'] = null;
    if (nutritionArr.length >= 7) {
      const calories = nutritionArr[0] || 0;
      // Convert typical daily value percentages roughly to grams
      const fat = Math.round(((nutritionArr[1] || 0) * 65) / 100);
      const protein = Math.round(((nutritionArr[4] || 0) * 50) / 100);
      const carbs = Math.round(((nutritionArr[6] || 0) * 300) / 100);
      
      nutrition = {
        calories,
        protein: protein || 0,
        carbs: carbs || 0,
        fat: fat || 0,
      };
    }

    const ingredients = ingredientsList.map(name => ({
      name: name.toLowerCase().trim(),
      amount: 100, // Food.com raw dataset doesn't include individual ingredient amounts (only listing raw names)
      unit: 'g',
    }));

    return {
      externalId: `foodcom_${id}`,
      title: name,
      description,
      instructions: steps.length > 0 ? steps : ['Cook according to standard recipe directions.'],
      prepTime: Math.round(minutes * 0.3),
      cookTime: Math.round(minutes * 0.7),
      servings: 4,
      tags,
      ingredients,
      nutrition,
    };
  }

  private getMockFoodComRecipes(limit: number): ExternalRecipe[] {
    return [
      {
        externalId: 'foodcom_mock_1',
        title: 'Rich Tomato Basil Soup',
        description: 'A classic rich tomato soup simmered with garlic, organic vine tomatoes, and sweet basil leaves.',
        instructions: [
          'Sauté onion and garlic in olive oil.',
          'Add crushed tomatoes, vegetable broth, and basil leaves.',
          'Simmer for 20 minutes.',
          'Blend using an immersion hand blender until smooth.'
        ],
        prepTime: 10,
        cookTime: 20,
        servings: 4,
        tags: ['Vegetarian', 'Soup', 'Tomato'],
        ingredients: [
          { name: 'onion', amount: 1, unit: 'whole' },
          { name: 'garlic clove', amount: 2, unit: 'whole' },
          { name: 'crushed tomatoes', amount: 800, unit: 'g' },
          { name: 'olive oil', amount: 1, unit: 'tbsp' }
        ],
        nutrition: {
          calories: 180,
          protein: 4,
          carbs: 22,
          fat: 8
        }
      }
    ].slice(0, limit);
  }
}
