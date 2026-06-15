import { Injectable } from '@nestjs/common';
import { IngredientNormalizerService } from './ingredient-normalizer.service';
import { ExternalRecipe } from '../providers/recipe-provider.interface';

@Injectable()
export class RecipeNormalizationService {
  constructor(private readonly ingredientNormalizer: IngredientNormalizerService) {}

  normalizeRecipe(recipe: ExternalRecipe): ExternalRecipe {
    const title = this.normalizeTitle(recipe.title);
    const description = this.normalizeDescription(recipe.description || title);
    const instructions = this.normalizeInstructions(recipe.instructions);
    
    const prepTime = Math.max(0, recipe.prepTime || 0);
    const cookTime = Math.max(0, recipe.cookTime || 0);
    const servings = Math.max(1, recipe.servings || 1);

    const ingredients = (recipe.ingredients || []).map((ing) => ({
      name: this.ingredientNormalizer.normalize(ing.name),
      amount: Math.max(0, ing.amount || 100),
      unit: this.normalizeUnit(ing.unit),
    }));

    const tags = (recipe.tags || [])
      .map((t) => t.toLowerCase().trim().replace(/\s+/g, '_'))
      .filter((t) => t.length > 0);

    return {
      externalId: recipe.externalId,
      title,
      description,
      instructions,
      prepTime,
      cookTime,
      servings,
      imageUrl: recipe.imageUrl || null,
      tags,
      ingredients,
      nutrition: recipe.nutrition || null,
    };
  }

  private normalizeTitle(title: string): string {
    if (!title) return 'Untitled Recipe';
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  private normalizeDescription(desc: string): string {
    if (!desc) return '';
    return desc.trim().replace(/\s+/g, ' ');
  }

  private normalizeInstructions(steps: string[]): string[] {
    if (!steps) return [];
    return steps
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .filter((s) => s.length > 0);
  }

  private normalizeUnit(unit: string): string {
    if (!unit) return 'g';
    const u = unit.toLowerCase().trim();
    if (u === 'grams' || u === 'g' || u === 'gr') return 'g';
    if (u === 'milliliters' || u === 'ml') return 'ml';
    if (u === 'tablespoons' || u === 'tbsp' || u === 'tablespoon') return 'tbsp';
    if (u === 'teaspoons' || u === 'tsp' || u === 'teaspoon') return 'tsp';
    if (u === 'cups' || u === 'cup') return 'cup';
    if (u === 'pounds' || u === 'pound' || u === 'lb' || u === 'lbs') return 'lb';
    if (u === 'ounces' || u === 'ounce' || u === 'oz') return 'oz';
    if (u === 'kilograms' || u === 'kg') return 'kg';
    return u;
  }
}
