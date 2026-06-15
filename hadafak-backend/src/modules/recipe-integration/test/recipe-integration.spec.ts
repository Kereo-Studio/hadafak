import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IngredientNormalizerService } from '../services/ingredient-normalizer.service';
import { RecipeNormalizationService } from '../services/recipe-normalization.service';
import { RecipeTaggingService } from '../services/recipe-tagging.service';
import { RecipeDuplicateDetectionService } from '../services/recipe-duplicate-detection.service';
import { Recipe } from '../../recipes/entities/recipe.entity';

describe('Recipe Integration Services', () => {
  let normalizer: IngredientNormalizerService;
  let recipeNormalizer: RecipeNormalizationService;
  let tagger: RecipeTaggingService;
  let dupeDetector: RecipeDuplicateDetectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngredientNormalizerService,
        RecipeNormalizationService,
        RecipeTaggingService,
        RecipeDuplicateDetectionService,
        {
          provide: getRepositoryToken(Recipe),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    normalizer = module.get<IngredientNormalizerService>(IngredientNormalizerService);
    recipeNormalizer = module.get<RecipeNormalizationService>(RecipeNormalizationService);
    tagger = module.get<RecipeTaggingService>(RecipeTaggingService);
    dupeDetector = module.get<RecipeDuplicateDetectionService>(RecipeDuplicateDetectionService);
  });

  describe('IngredientNormalizerService', () => {
    it('should lowercase and trim', () => {
      expect(normalizer.normalize('  Chicken Breast  ')).toBe('chicken');
    });

    it('should map synonyms and strip extra virgin', () => {
      expect(normalizer.normalize('Extra Virgin Olive Oil')).toBe('olive oil');
    });

    it('should clean noise adjectives', () => {
      expect(normalizer.normalize('organic fresh chopped basil leaves')).toBe('basil leave');
    });
  });

  describe('RecipeNormalizationService', () => {
    it('should format title casing and capitalize', () => {
      const mockRaw: any = {
        externalId: 'test_1',
        title: 'high protein CHICKEN bowl',
        description: '  tasty meal  ',
        instructions: [' slice the chicken  ', ' sauté it '],
        servings: 2,
        ingredients: [
          { name: 'Cold Pressed Olive Oil', amount: 2, unit: 'tablespoons' },
        ],
      };

      const result = recipeNormalizer.normalizeRecipe(mockRaw);
      expect(result.title).toBe('High Protein Chicken Bowl');
      expect(result.instructions[0]).toBe('slice the chicken');
      expect(result.ingredients[0].name).toBe('olive oil');
      expect(result.ingredients[0].unit).toBe('tbsp');
    });
  });

  describe('RecipeTaggingService', () => {
    it('should auto-tag protein and calories', () => {
      const recipe: any = {
        title: 'Lean Protein Steak',
        ingredients: [{ name: 'beef steak' }],
        nutrition: {
          calories: 350,
          protein: 45,
          carbs: 0,
          fat: 18,
        },
      };

      const tags = tagger.autoTag(recipe);
      expect(tags).toContain('high_protein');
      expect(tags).toContain('low_calorie');
      expect(tags).toContain('low_carb');
    });

    it('should identify vegetarian and vegan meals correctly', () => {
      const veggieRecipe: any = {
        title: 'Egg Salad',
        ingredients: [{ name: 'egg' }, { name: 'mustard' }],
        nutrition: { calories: 200, protein: 12, carbs: 5, fat: 12 },
      };

      const veganRecipe: any = {
        title: 'Simple Salad',
        ingredients: [{ name: 'spinach' }, { name: 'olive oil' }],
        nutrition: { calories: 120, protein: 2, carbs: 8, fat: 10 },
      };

      const veggieTags = tagger.autoTag(veggieRecipe);
      expect(veggieTags).toContain('vegetarian');
      expect(veggieTags).not.toContain('vegan');

      const veganTags = tagger.autoTag(veganRecipe);
      expect(veganTags).toContain('vegan');
      expect(veganTags).toContain('vegetarian');
    });
  });

  describe('RecipeDuplicateDetectionService', () => {
    it('should score similarity between recipes correctly', () => {
      const extRecipe: any = {
        title: 'Protein Chicken Bowl',
        ingredients: [{ name: 'chicken' }, { name: 'rice' }],
      };

      const existingRecipe: any = {
        title: 'High Protein Chicken Bowl',
        ingredients: [
          { food: { name: 'chicken' } },
          { food: { name: 'rice' } },
        ],
      };

      const score = dupeDetector.calculateSimilarity(extRecipe, existingRecipe);
      expect(score).toBeGreaterThan(0.8);
    });
  });
});
