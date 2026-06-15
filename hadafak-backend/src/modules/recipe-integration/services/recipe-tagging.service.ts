import { Injectable } from '@nestjs/common';
import { ExternalRecipe } from '../providers/recipe-provider.interface';

@Injectable()
export class RecipeTaggingService {
  private readonly meatKeywords = new Set([
    'chicken',
    'beef',
    'pork',
    'turkey',
    'lamb',
    'salmon',
    'tuna',
    'fish',
    'steak',
    'shrimp',
    'prawn',
    'crab',
    'lobster',
    'meat',
    'ham',
    'bacon',
    'pepperoni',
    'salami',
    'venison',
    'duck',
    'veal',
    'anchovy',
    'anchovies',
    'sardine',
    'sardines',
    'mackerel',
    'cod',
    'pork fat',
    'lard',
  ]);

  private readonly animalKeywords = new Set([
    // Includes all meat keywords
    ...this.meatKeywords,
    // Plus dairy/poultry products
    'milk',
    'cheese',
    'butter',
    'egg',
    'eggs',
    'cream',
    'honey',
    'yogurt',
    'gelatin',
    'whey',
    'ghee',
    'mayonnaise',
    'mayo',
    'parmesan',
    'mozzarella',
    'cheddar',
    'sour cream',
  ]);

  autoTag(recipe: ExternalRecipe): string[] {
    const tags = new Set<string>((recipe.tags || []).map((t) => t.toLowerCase().trim().replace(/\s+/g, '_')));

    const calories = recipe.nutrition?.calories ?? 0;
    const protein = recipe.nutrition?.protein ?? 0;
    const carbs = recipe.nutrition?.carbs ?? 0;
    const fat = recipe.nutrition?.fat ?? 0;

    // Rule 1: High Protein (Protein >= 25g)
    if (protein >= 25) {
      tags.add('high_protein');
    }

    // Rule 2: Low Calorie (Calories <= 400)
    if (calories >= 0 && calories <= 400) {
      tags.add('low_calorie');
    }

    // Rule 3: Low Carb (Carbs <= 15g)
    if (carbs >= 0 && carbs <= 15) {
      tags.add('low_carb');
    }

    // Check ingredients for Vegetarian & Vegan statuses
    const ingredients = (recipe.ingredients || []).map((ing) => ing.name.toLowerCase().trim());

    let hasMeat = false;
    let hasAnimalProduct = false;

    for (const name of ingredients) {
      // Tokenize ingredient name to check keywords exactly
      const tokens = name.split(/\s+/);
      for (const token of tokens) {
        if (this.meatKeywords.has(token)) {
          hasMeat = true;
        }
        if (this.animalKeywords.has(token)) {
          hasAnimalProduct = true;
        }
      }
    }

    // Rule 4: Vegetarian (No Meat)
    if (!hasMeat) {
      tags.add('vegetarian');
    }

    // Rule 5: Vegan (No animal products of any kind)
    if (!hasAnimalProduct) {
      tags.add('vegan');
      tags.add('vegetarian'); // All vegan is vegetarian
    }

    return Array.from(tags).filter((t) => t.length > 0);
  }
}
