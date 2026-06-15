import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { ExternalRecipe } from '../providers/recipe-provider.interface';

@Injectable()
export class RecipeDuplicateDetectionService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
  ) {}

  /**
   * Calculates similarity between an external recipe and an existing recipe.
   * Returns a score between 0.0 (entirely different) and 1.0 (identical match).
   */
  calculateSimilarity(external: ExternalRecipe, existing: Recipe): number {
    const titleSim = this.calculateTitleSimilarity(external.title, existing.title);
    const ingredientSim = this.calculateIngredientSimilarity(external, existing);

    // Weighted average: 60% Title similarity, 40% Ingredient Jaccard similarity
    return titleSim * 0.6 + ingredientSim * 0.4;
  }

  /**
   * Scans the database for potential duplicate recipes.
   * Returns matching recipes that exceed the similarity threshold.
   */
  async findPotentialDuplicates(
    external: ExternalRecipe,
    threshold = 0.75,
  ): Promise<{ recipe: Recipe; score: number }[]> {
    // Basic optimization: query database recipes with similar keywords or fetch a batch of recipes
    // To remain performance-safe and prevent scanning millions of records, we query recipes
    // starting with similar letters or containing similar terms in their titles.
    const titleWords = external.title.split(/\s+/).filter(w => w.length > 2);
    
    let query = this.recipeRepository.createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.ingredients', 'ingredient')
      .leftJoinAndSelect('ingredient.food', 'food');

    if (titleWords.length > 0) {
      // Look up recipes containing any of the core title words to narrow search down
      const conditions = titleWords.map((word, idx) => `recipe.title ILike :word${idx}`);
      const parameters = titleWords.reduce((acc, word, idx) => {
        acc[`word${idx}`] = `%${word}%`;
        return acc;
      }, {} as Record<string, string>);

      query = query.where(conditions.join(' OR '), parameters);
    }

    const candidateRecipes = await query.take(100).getMany();
    const matches: { recipe: Recipe; score: number }[] = [];

    for (const existing of candidateRecipes) {
      const score = this.calculateSimilarity(external, existing);
      if (score >= threshold) {
        matches.push({ recipe: existing, score });
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }

  private calculateTitleSimilarity(title1: string, title2: string): number {
    const t1 = title1.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const t2 = title2.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

    if (t1 === t2) return 1.0;
    if (!t1 || !t2) return 0.0;

    const words1 = t1.split(/\s+/);
    const words2 = t2.split(/\s+/);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    let intersectionCount = 0;
    for (const w of set1) {
      if (set2.has(w)) {
        intersectionCount++;
      }
    }

    const unionCount = set1.size + set2.size - intersectionCount;
    return intersectionCount / unionCount;
  }

  private calculateIngredientSimilarity(external: ExternalRecipe, existing: Recipe): number {
    const extIngs = (external.ingredients || []).map((i) => i.name.toLowerCase().trim()).filter(Boolean);
    const existIngs = (existing.ingredients || []).map((i) => {
      if (i.food) return i.food.name.toLowerCase().trim();
      return (i.customName || '').toLowerCase().trim();
    }).filter(Boolean);

    if (extIngs.length === 0 && existIngs.length === 0) return 1.0;
    if (extIngs.length === 0 || existIngs.length === 0) return 0.0;

    const set1 = new Set(extIngs);
    const set2 = new Set(existIngs);

    let intersectionCount = 0;
    for (const ing of set1) {
      if (set2.has(ing)) {
        intersectionCount++;
      }
    }

    const unionCount = set1.size + set2.size - intersectionCount;
    return intersectionCount / unionCount;
  }
}
