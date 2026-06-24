import { Injectable, NotFoundException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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
          // Amount is in grams; food macros are per servingSize (default 100g)
          const grams = Number(ing.amount) || 0;
          const servingSize = Number(foodItem.servingSize) || 100;
          const scale = grams / servingSize;
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
      calories: Math.min(Math.round(calories / servings), 9999),
      protein: Math.min(Math.round((protein / servings) * 10) / 10, 999),
      carbs: Math.min(Math.round((carbs / servings) * 10) / 10, 999),
      fat: Math.min(Math.round((fat / servings) * 10) / 10, 999),
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

    this.populateDynamicTags(recipe);
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

    recipes.forEach((r) => this.populateDynamicTags(r));

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
    const apiKey = this.configService.get<string>('app.geminiApiKey');
    if (!apiKey) throw new InternalServerErrorException('Gemini API key is not configured.');

    const ingredientList = dto.ingredients.join(', ');
    const extraPrompt = dto.prompt ? `\nExtra requirements: ${dto.prompt}` : '';

    const prompt = `You are a professional nutritionist and chef. Create one healthy recipe using ONLY the provided ingredients (you may add basic pantry items like salt, pepper, oil, water).
Available ingredients: ${ingredientList}${extraPrompt}

Respond with ONLY a valid JSON object matching this schema:
{
  "title": "Recipe Name",
  "description": "One to two sentence description",
  "prepTime": 10,
  "cookTime": 20,
  "servings": 2,
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "tags": ["tag1", "tag2"],
  "ingredients": [
    { "name": "Ingredient Name", "amount": 200, "unit": "g" }
  ]
}
Valid tags (use 1-3 that apply): High-Protein, Low-Carb, Low-Calories, Pre-Workout, Post-Workout, Quick, Meal-Prep, AI-Generated
Always include "AI-Generated" in tags. Use realistic amounts and cooking times.`;

    const rawText = await this.callGeminiText(apiKey, prompt);

    let parsed: any;
    try {
      // Gemini with responseMimeType:'application/json' may return a JSON string or already-parsed object
      parsed = typeof rawText === 'string' ? JSON.parse(rawText) : rawText;
    } catch (parseErr) {
      console.error('[RecipesService] Gemini parse error:', parseErr, 'Raw response:', rawText);
      throw new InternalServerErrorException('Failed to parse Gemini response. Please try again.');
    }

    if (!parsed || !Array.isArray(parsed.ingredients)) {
      console.error('[RecipesService] Unexpected Gemini response shape:', JSON.stringify(parsed));
      throw new InternalServerErrorException('Gemini returned an unexpected recipe format. Please try again.');
    }

    // Map each AI ingredient name to a DB food record where possible
    const mappedIngredients = await Promise.all(
      (parsed.ingredients as any[]).map(async (ing) => {
        const matches = await this.nutritionService.searchFoods(ing.name);
        const food = matches[0];
        return {
          foodId: food?.id ?? undefined,
          customName: ing.name,
          amount: Number(ing.amount) || 1,
          unit: ing.unit || 'g',
        };
      }),
    );

    try {
      return await this.createRecipe(userId, {
        title: parsed.title,
        description: parsed.description,
        instructions: parsed.instructions,
        prepTime: parsed.prepTime,
        cookTime: parsed.cookTime,
        servings: parsed.servings,
        tags: parsed.tags,
        ingredients: mappedIngredients,
      }, RecipeSource.AI);
    } catch (saveErr) {
      console.error('[RecipesService] createRecipe failed:', saveErr);
      throw new InternalServerErrorException('Failed to save generated recipe. Please try again.');
    }
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

  // Tried in order — fall through to the next when one is overloaded (503).
  private static readonly GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];

  private async callGeminiText(apiKey: string, prompt: string): Promise<string> {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    let lastStatus = 0;
    for (const model of RecipesService.GEMINI_MODELS) {
      const result = await this.tryGeminiModel(model, apiKey, payload);
      if (result.ok) return result.text;
      lastStatus = result.status;
      // transient (429/503) — fall through to the next model; otherwise fail fast
      if (result.status !== 429 && result.status !== 503) {
        throw new InternalServerErrorException(`Gemini API error: ${result.status}`);
      }
    }

    throw new InternalServerErrorException(`Gemini API unavailable after retries (${lastStatus})`);
  }

  // Retries one model up to 3 times with exponential backoff on 429/503 + network errors.
  private async tryGeminiModel(
    model: string,
    apiKey: string,
    payload: unknown,
  ): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let delay = 1000;
    let lastStatus = 503;

    for (let attempt = 0; attempt < 3; attempt++) {
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }

      if (response.ok) {
        const json = await response.json();
        const text: string = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return { ok: true, text };
      }

      lastStatus = response.status;
      if (response.status !== 429 && response.status !== 503) {
        return { ok: false, status: response.status };
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }

    return { ok: false, status: lastStatus };
  }

  private populateDynamicTags(recipe: Recipe): void {
    if (!recipe.tags) {
      recipe.tags = [];
    }

    const title = (recipe.title || '').toLowerCase();
    const desc = (recipe.description || '').toLowerCase();

    const calories = Number(recipe.calories) || 0;
    const protein = Number(recipe.protein) || 0;
    const carbs = Number(recipe.carbs) || 0;
    const fat = Number(recipe.fat) || 0;

    // 1. High-Protein: protein >= 25g OR protein calories make up >= 25% of total calories
    const isHighProtein = protein >= 25 || (calories > 0 && (protein * 4) / calories >= 0.25);
    if (isHighProtein && !recipe.tags.some(t => t.toLowerCase() === 'high-protein')) {
      recipe.tags.push('High-Protein');
    }

    // 2. Low-Carb: carbs <= 20g
    const isLowCarb = carbs <= 20;
    if (isLowCarb && !recipe.tags.some(t => t.toLowerCase() === 'low-carb')) {
      recipe.tags.push('Low-Carb');
    }

    // 3. Keto: carbs <= 10g and fat >= 15g
    const isKeto = carbs <= 10 && fat >= 15;
    if (isKeto && !recipe.tags.some(t => t.toLowerCase() === 'keto')) {
      recipe.tags.push('Keto');
    }

    // 4. Vegan: check ingredients/title/description for non-vegan keywords
    const nonVeganKeywords = [
      'chicken', 'beef', 'meat', 'pork', 'fish', 'turkey', 'egg', 'eggs', 'milk', 
      'cheese', 'butter', 'whey', 'yogurt', 'cream', 'steak', 'bacon', 'salmon',
      'tuna', 'shrimp', 'seafood', 'honey', 'gelatin', 'lamb', 'sausage', 'pepperoni'
    ];
    const isNonVegan = nonVeganKeywords.some(kw => title.includes(kw) || desc.includes(kw));
    if (!isNonVegan && !recipe.tags.some(t => t.toLowerCase() === 'vegan')) {
      recipe.tags.push('Vegan');
    }

    // 5. High-Fiber: check for fiber-rich ingredients in title/description
    const highFiberKeywords = [
      'oat', 'oats', 'fiber', 'broccoli', 'bean', 'beans', 'chickpea', 'chickpeas', 
      'lentil', 'lentils', 'avocado', 'seed', 'seeds', 'chia', 'flax', 'berry', 
      'berries', 'whole wheat', 'brown rice', 'spinach', 'kale', 'quinoa', 'almond', 'nuts'
    ];
    const isHighFiber = highFiberKeywords.some(kw => title.includes(kw) || desc.includes(kw));
    if (isHighFiber && !recipe.tags.some(t => t.toLowerCase() === 'high-fiber')) {
      recipe.tags.push('High-Fiber');
    }
  }
}
