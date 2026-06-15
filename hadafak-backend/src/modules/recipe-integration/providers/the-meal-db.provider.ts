import { Injectable } from '@nestjs/common';
import { RecipeProvider, ExternalRecipe, ExternalRecipeIngredient } from './recipe-provider.interface';

@Injectable()
export class TheMealDbProvider implements RecipeProvider {
  getProviderName(): string {
    return 'TheMealDB';
  }

  async fetchRecipes(options: {
    limit: number;
    offset: number;
    query?: string;
    apiKey?: string;
  }): Promise<ExternalRecipe[]> {
    const query = options.query || 'chicken';
    const url = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`TheMealDB HTTP error ${response.status}`);
      }

      const data = await response.json() as any;
      if (!data || !data.meals) {
        return [];
      }

      const meals = data.meals.slice(options.offset, options.offset + options.limit);
      return meals.map((meal: any) => this.mapMealToExternalRecipe(meal));
    } catch (error) {
      console.warn(`[TheMealDbProvider] Fetch failed: ${error.message}. Returning mock data.`);
      return this.getMockRecipes(options.limit);
    }
  }

  private mapMealToExternalRecipe(meal: any): ExternalRecipe {
    const ingredients: ExternalRecipeIngredient[] = [];

    for (let i = 1; i <= 20; i++) {
      const name = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];

      if (name && name.trim()) {
        const cleanName = name.trim();
        const { amount, unit } = this.parseMeasure(measure);
        ingredients.push({
          name: cleanName,
          amount,
          unit,
        });
      }
    }

    const instructions = meal.strInstructions
      ? meal.strInstructions
          .split('\r\n')
          .map((s: string) => s.trim())
          .filter((s: string) => s.length > 0)
      : ['Prepare the ingredients and cook according to normal kitchen instructions.'];

    return {
      externalId: meal.idMeal || `mealdb_${Math.random().toString(36).substring(7)}`,
      title: meal.strMeal || 'Unknown meal',
      description: meal.strCategory ? `A delicious ${meal.strCategory} dish.` : 'A delicious meal from TheMealDB.',
      instructions,
      prepTime: 15,
      cookTime: 25,
      servings: 2,
      imageUrl: meal.strMealThumb || null,
      tags: meal.strTags ? meal.strTags.split(',').map((t: string) => t.trim()) : [],
      ingredients,
      // TheMealDB does not supply macro info directly, normalization/import service will calculate it.
      nutrition: null,
    };
  }

  private parseMeasure(measure: string): { amount: number; unit: string } {
    if (!measure || !measure.trim()) {
      return { amount: 100, unit: 'g' };
    }

    const cleanStr = measure.trim().toLowerCase();
    // Regex to extract number and remainder text
    const match = cleanStr.match(/^([\d\/\s\.-]+)?(.*)$/);
    if (!match) {
      return { amount: 1, unit: cleanStr };
    }

    let numStr = match[1] ? match[1].trim() : '';
    let unit = match[2] ? match[2].trim() : 'g';

    if (!numStr) {
      return { amount: 1, unit: unit || 'whole' };
    }

    let amount = 100; // default fallback amount

    try {
      if (numStr.includes('/')) {
        // e.g. "1/2" or "1 1/2"
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
    } catch {
      amount = 100;
    }

    // Standardize common unit strings
    if (unit.startsWith('tbsp') || unit.startsWith('tablespoon')) {
      unit = 'tbsp';
    } else if (unit.startsWith('tsp') || unit.startsWith('teaspoon')) {
      unit = 'tsp';
    } else if (unit.startsWith('cup')) {
      unit = 'cup';
    } else if (unit.startsWith('g') || unit.startsWith('gram')) {
      unit = 'g';
    } else if (unit.startsWith('oz') || unit.startsWith('ounce')) {
      unit = 'oz';
    } else if (unit.startsWith('ml') || unit.startsWith('milliliter')) {
      unit = 'ml';
    } else if (unit.startsWith('kg') || unit.startsWith('kilogram')) {
      unit = 'kg';
    }

    return { amount: Math.round(amount * 10) / 10, unit };
  }

  private getMockRecipes(limit: number): ExternalRecipe[] {
    const mocks: ExternalRecipe[] = [
      {
        externalId: 'mock_meal_1',
        title: 'High Protein Lemon Chicken Stir Fry',
        description: 'Tender chicken breast sautéed with fresh broccoli and a zesty lemon garlic soy reduction.',
        instructions: [
          'Dice chicken breast into bite-sized cubes.',
          'Sauté in olive oil until browned.',
          'Add broccoli florets and cook for 5 minutes.',
          'Pour in lemon juice and soy sauce, simmer, and serve.'
        ],
        prepTime: 10,
        cookTime: 15,
        servings: 2,
        imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d',
        tags: ['High-Protein', 'Low-Calorie', 'Lemon', 'Stir-Fry'],
        ingredients: [
          { name: 'chicken breast', amount: 300, unit: 'g' },
          { name: 'broccoli', amount: 150, unit: 'g' },
          { name: 'olive oil', amount: 1, unit: 'tbsp' },
          { name: 'lemon juice', amount: 2, unit: 'tbsp' }
        ],
        nutrition: {
          calories: 380,
          protein: 42,
          carbs: 12,
          fat: 16
        }
      },
      {
        externalId: 'mock_meal_2',
        title: 'Vegan Berry Avocado Smoothie Bowl',
        description: 'A creamy superfood smoothie bowl packed with plant antioxidants and good fats.',
        instructions: [
          'Blend avocado, frozen berries, and almond milk until smooth.',
          'Pour into a wide serving bowl.',
          'Top with chia seeds and granola.'
        ],
        prepTime: 5,
        cookTime: 0,
        servings: 1,
        imageUrl: 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2',
        tags: ['Vegan', 'Low-Carb', 'Smoothie', 'Breakfast'],
        ingredients: [
          { name: 'avocado', amount: 1, unit: 'whole' },
          { name: 'mixed berries', amount: 100, unit: 'g' },
          { name: 'almond milk', amount: 200, unit: 'ml' },
          { name: 'chia seeds', amount: 1, unit: 'tbsp' }
        ],
        nutrition: {
          calories: 320,
          protein: 6,
          carbs: 28,
          fat: 22
        }
      }
    ];

    return mocks.slice(0, limit);
  }
}
