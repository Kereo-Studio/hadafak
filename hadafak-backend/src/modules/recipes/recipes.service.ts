import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Recipe, RecipeSource } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { LogRecipeDto } from './dto/log-recipe.dto';
import { GenerateAiRecipeDto } from './dto/generate-ai-recipe.dto';
import { SubstituteIngredientDto } from './dto/substitute-ingredient.dto';
import { NutritionService } from '../nutrition/nutrition.service';
import { Food, FoodSource } from '../nutrition/entities/food.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(RecipeIngredient)
    private readonly recipeIngredientRepository: Repository<RecipeIngredient>,
    @Inject(forwardRef(() => NutritionService))
    private readonly nutritionService: NutritionService,
  ) {}

  async createRecipe(userId: string | null, dto: CreateRecipeDto, source: RecipeSource = RecipeSource.USER): Promise<Recipe> {
    const servings = dto.servings || 1;
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    const ingredientsToSave: RecipeIngredient[] = [];

    for (const ing of dto.ingredients) {
      let foodItem: Food | null = null;
      if (ing.foodId) {
        try {
          foodItem = await this.nutritionService.getFoodById(ing.foodId);
          // Scale macros based on ingredient amount (scaled per serving unit / 100g)
          const scale = Number(ing.amount) || 0;
          calories += (Number(foodItem.calories) || 0) * scale;
          protein += (Number(foodItem.protein) || 0) * scale;
          carbs += (Number(foodItem.carbs) || 0) * scale;
          fat += (Number(foodItem.fat) || 0) * scale;
        } catch (e) {
          // ignore or handle if food not found
        }
      }

      const recipeIng = this.recipeIngredientRepository.create({
        foodId: ing.foodId || null,
        customName: ing.customName || null,
        amount: ing.amount,
        unit: ing.unit,
      });
      ingredientsToSave.push(recipeIng);
    }

    const recipe = this.recipeRepository.create({
      title: dto.title,
      description: dto.description,
      instructions: dto.instructions,
      prepTime: dto.prepTime,
      cookTime: dto.cookTime,
      servings,
      imageUrl: dto.imageUrl || null,
      source,
      tags: dto.tags || [],
      creatorId: userId,
      calories: Math.round(calories / servings),
      protein: Math.round((protein / servings) * 10) / 10,
      carbs: Math.round((carbs / servings) * 10) / 10,
      fat: Math.round((fat / servings) * 10) / 10,
    });

    const savedRecipe = await this.recipeRepository.save(recipe);

    for (const ing of ingredientsToSave) {
      ing.recipeId = savedRecipe.id;
      await this.recipeIngredientRepository.save(ing);
    }

    return this.getRecipeById(savedRecipe.id);
  }

  async getRecipeById(id: string): Promise<Recipe> {
    const recipe = await this.recipeRepository.findOne({
      where: { id },
      relations: {
        ingredients: {
          food: true,
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  async searchRecipes(
    query?: string,
    tag?: string,
    maxCalories?: number,
    minProtein?: number,
    source?: RecipeSource,
    userId?: string,
  ): Promise<Recipe[]> {
    const queryBuilder = this.recipeRepository
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.ingredients', 'ingredient')
      .leftJoinAndSelect('ingredient.food', 'food');

    if (query) {
      queryBuilder.andWhere('recipe.title ILike :query', { query: `%${query}%` });
    }

    if (source) {
      queryBuilder.andWhere('recipe.source = :source', { source });
    }

    if (userId) {
      queryBuilder.andWhere('(recipe.creatorId IS NULL OR recipe.creatorId = :userId)', { userId });
    } else {
      queryBuilder.andWhere('recipe.creatorId IS NULL');
    }

    const recipes = await queryBuilder.getMany();

    // In-memory filter for complex arrays/decimal attributes to prevent TypeORM decimal cast bugs
    return recipes.filter((r) => {
      if (tag && !r.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
        return false;
      }
      if (maxCalories && Number(r.calories) > maxCalories) {
        return false;
      }
      if (minProtein && Number(r.protein) < minProtein) {
        return false;
      }
      return true;
    });
  }

  async logRecipe(userId: string, recipeId: string, dto: LogRecipeDto) {
    const recipe = await this.getRecipeById(recipeId);

    // Look for virtual composite food representation in the user's catalog
    const virtualFoodName = `Recipe: ${recipe.title}`;
    const foods = await this.nutritionService.searchFoods(virtualFoodName, undefined, undefined, userId);
    
    let recipeFood = foods.find((f) => f.name === virtualFoodName && f.userId === userId);

    if (!recipeFood) {
      // Create a virtual food item to map the recipe's single-serving macros to log journal
      recipeFood = await this.nutritionService.createFood(
        userId,
        {
          name: virtualFoodName,
          calories: Number(recipe.calories),
          protein: Number(recipe.protein),
          carbs: Number(recipe.carbs),
          fat: Number(recipe.fat),
          servingSize: 1,
          servingUnit: 'serving',
        },
        FoodSource.USER,
      );
    }

    // Log the virtual food representing the recipe scaled by serving counts
    return this.nutritionService.logFood(userId, {
      foodId: recipeFood.id,
      quantity: dto.servings,
      mealType: dto.mealType,
      date: dto.date,
    });
  }

  async generateAiRecipe(userId: string, dto: GenerateAiRecipeDto): Promise<Recipe> {
    // Scaffold/Mock AI response using database foods to ensure integration
    const chickenSearch = await this.nutritionService.searchFoods('chicken');
    const broccoliSearch = await this.nutritionService.searchFoods('broccoli');
    const oatsSearch = await this.nutritionService.searchFoods('oats');

    const chickenId = chickenSearch[0]?.id || undefined;
    const broccoliId = broccoliSearch[0]?.id || undefined;
    const oatsId = oatsSearch[0]?.id || undefined;

    // Determine mock outputs depending on user input keywords
    let title = 'AI Loaded Stir Fry Chicken';
    let description = 'A protein-packed garlic and soy glaze stir fry combining tender chicken breast and broccoli.';
    let prepTime = 10;
    let cookTime = 15;
    let servings = 2;
    let instructions = [
      'Slice the chicken breast into bite-sized cubes.',
      'Steam the broccoli in salted water for 3 minutes.',
      'Heat oil in a pan, sauté chicken until golden brown.',
      'Toss in broccoli, add low sodium soy sauce, and serve hot.',
    ];
    let tags = ['High-Protein', 'Low-Carb', 'AI-Generated'];
    let ingredients = [
      { foodId: chickenId, customName: 'Chicken Breast', amount: 3.0, unit: '100g' },
      { foodId: broccoliId, customName: 'Broccoli', amount: 1.5, unit: '100g' },
      { foodId: undefined, customName: 'Light Soy Sauce', amount: 1, unit: 'tbsp' },
    ];

    if (dto.ingredients.some((i) => i.toLowerCase().includes('oat') || i.toLowerCase().includes('banana'))) {
      title = 'AI High-Protein Banana Oats Slurry';
      description = 'A fiber-rich oatmeal blend sweetened with natural banana sugars, perfect for pre-workout energy.';
      prepTime = 5;
      cookTime = 5;
      servings = 1;
      instructions = [
        'Cook the oats in boiling milk or water for 3 minutes.',
        'Mash half a banana and stir it into the oatmeal.',
        'Top with sliced almonds and cinnamon powder.',
      ];
      tags = ['High-Fiber', 'Pre-Workout', 'AI-Generated'];
      ingredients = [
        { foodId: oatsId, customName: 'Whole Grain Oats', amount: 0.8, unit: '100g' },
        { foodId: undefined, customName: 'Banana', amount: 1, unit: 'medium' },
        { foodId: undefined, customName: 'Almond Milk', amount: 200, unit: 'ml' },
      ];
    }

    return this.createRecipe(userId, {
      title,
      description,
      instructions,
      prepTime,
      cookTime,
      servings,
      tags,
      ingredients,
    }, RecipeSource.AI);
  }

  async substituteIngredient(userId: string, dto: SubstituteIngredientDto) {
    const ingredient = await this.recipeIngredientRepository.findOne({
      where: { id: dto.recipeIngredientId },
      relations: { food: true },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient log ${dto.recipeIngredientId} not found`);
    }

    // Search substitution suggestions in catalog
    const suggestions = await this.nutritionService.searchFoods(dto.substituteName, undefined, undefined, userId);

    if (suggestions.length === 0) {
      throw new NotFoundException(`No matching foods found for substitution request: ${dto.substituteName}`);
    }

    const match = suggestions[0];
    
    // Scale quantity dynamically to match the protein weight of the replaced item
    const baseProtein = ingredient.food ? Number(ingredient.food.protein) : 10;
    const targetProtein = Number(match.protein) || 10;
    const originalAmount = Number(ingredient.amount) || 1;
    const suggestedAmount = Math.round((originalAmount * baseProtein / targetProtein) * 10) / 10;

    return {
      originalIngredient: ingredient.customName || (ingredient.food ? ingredient.food.name : 'Unknown'),
      suggestedReplacement: match.name,
      suggestedAmount,
      unit: match.servingUnit || 'g',
      macrosDifference: {
        calories: Math.round(Number(match.calories) * suggestedAmount),
        protein: Math.round(Number(match.protein) * suggestedAmount * 10) / 10,
        carbs: Math.round(Number(match.carbs) * suggestedAmount * 10) / 10,
        fat: Math.round(Number(match.fat) * suggestedAmount * 10) / 10,
      },
    };
  }
}
