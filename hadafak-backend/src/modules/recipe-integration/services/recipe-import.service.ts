import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecipeImportJob, ImportJobStatus } from '../entities/recipe-import-job.entity';
import { RecipeExternalMapping } from '../entities/recipe-external-mapping.entity';
import { Recipe, RecipeSource } from '../../recipes/entities/recipe.entity';
import { RecipeIngredient } from '../../recipes/entities/recipe-ingredient.entity';
import { Food, FoodSource } from '../../nutrition/entities/food.entity';
import { TheMealDbProvider } from '../providers/the-meal-db.provider';
import { RecipeNlgProvider } from '../providers/recipe-nlg.provider';
import { FoodComProvider } from '../providers/food-com.provider';
import { RecipeNormalizationService } from './recipe-normalization.service';
import { RecipeDuplicateDetectionService } from './recipe-duplicate-detection.service';
import { RecipeTaggingService } from './recipe-tagging.service';
import { ImportRecipesDto } from '../dto/import.dto';

@Injectable()
export class RecipeImportService {
  constructor(
    @InjectRepository(RecipeImportJob)
    private readonly jobRepository: Repository<RecipeImportJob>,
    @InjectRepository(RecipeExternalMapping)
    private readonly mappingRepository: Repository<RecipeExternalMapping>,
    @InjectRepository(Recipe)
    private readonly recipeRepository: Repository<Recipe>,
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    private readonly dataSource: DataSource,
    private readonly theMealDbProvider: TheMealDbProvider,
    private readonly recipeNlgProvider: RecipeNlgProvider,
    private readonly foodComProvider: FoodComProvider,
    private readonly normalizationService: RecipeNormalizationService,
    private readonly duplicateDetectionService: RecipeDuplicateDetectionService,
    private readonly taggingService: RecipeTaggingService,
  ) {}

  private getProvider(name: string) {
    const n = name.toLowerCase().trim();
    if (n === 'themealdb') return this.theMealDbProvider;
    if (n === 'recipenlg') return this.recipeNlgProvider;
    if (n === 'foodcom') return this.foodComProvider;
    throw new BadRequestException(`Unknown recipe provider: ${name}`);
  }

  async getJobs(): Promise<RecipeImportJob[]> {
    return this.jobRepository.find({ order: { createdAt: 'DESC' } });
  }

  async getLogs(jobId: string): Promise<string[]> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Import job ${jobId} not found`);
    }
    return job.logs;
  }

  async startImport(dto: ImportRecipesDto): Promise<RecipeImportJob> {
    const provider = this.getProvider(dto.provider);
    
    const job = this.jobRepository.create({
      providerName: provider.getProviderName(),
      status: ImportJobStatus.PENDING,
      logs: [`[${new Date().toISOString()}] Initializing import job for ${provider.getProviderName()}`],
    });
    const savedJob = await this.jobRepository.save(job);

    // Run import pipeline asynchronously so controller returns immediately
    this.runImportPipeline(savedJob.id, dto, provider).catch((err) => {
      console.error(`[RecipeImportService] Background pipeline failed:`, err);
    });

    return savedJob;
  }

  /**
   * Synchronous import used by the database seeder. Unlike {@link startImport},
   * this runs the full fetch → normalize → dedup → persist pipeline inline and
   * resolves only once every recipe has been processed. Idempotent: recipes
   * already imported (tracked via RecipeExternalMapping) are skipped.
   */
  async runSyncImport(
    providerName: string,
    options: {
      limit?: number;
      offset?: number;
      query?: string;
      similarityThreshold?: number;
      skipDuplicates?: boolean;
    },
  ): Promise<{ imported: number; duplicates: number; failed: number }> {
    const provider = this.getProvider(providerName);
    const limit = options.limit ?? 10;
    const offset = options.offset ?? 0;
    const similarityThreshold = options.similarityThreshold ?? 0.75;
    const skipDuplicates = options.skipDuplicates ?? true;

    const result = { imported: 0, duplicates: 0, failed: 0 };

    const externalRecipes = await provider.fetchRecipes({
      limit,
      offset,
      query: options.query,
    });

    for (const rawRecipe of externalRecipes) {
      try {
        const existingMapping = await this.mappingRepository.findOne({
          where: {
            providerName: provider.getProviderName(),
            externalId: rawRecipe.externalId,
          },
        });
        if (existingMapping) {
          result.duplicates++;
          continue;
        }

        const normalized = this.normalizationService.normalizeRecipe(rawRecipe);

        const duplicates =
          await this.duplicateDetectionService.findPotentialDuplicates(
            normalized,
            similarityThreshold,
          );
        if (duplicates.length > 0 && skipDuplicates) {
          result.duplicates++;
          continue;
        }

        await this.saveImportedRecipe(normalized, provider.getProviderName());
        result.imported++;
      } catch {
        result.failed++;
      }
    }

    return result;
  }

  private async runImportPipeline(
    jobId: string,
    dto: ImportRecipesDto,
    provider: any,
  ): Promise<void> {
    let job = (await this.jobRepository.findOne({ where: { id: jobId } }))!;
    job.status = ImportJobStatus.PROCESSING;
    job.logs.push(`[${new Date().toISOString()}] Starting fetch from provider`);
    await this.jobRepository.save(job);

    const limit = dto.limit || 10;
    const offset = dto.offset || 0;
    const similarityThreshold = dto.similarityThreshold ?? 0.75;
    const skipDuplicates = dto.skipDuplicates ?? true;

    try {
      const externalRecipes = await provider.fetchRecipes({
        limit,
        offset,
        filePath: dto.filePath,
        query: dto.query,
        apiKey: dto.apiKey,
      });

      job.totalRecords = externalRecipes.length;
      job.logs.push(`[${new Date().toISOString()}] Fetched ${externalRecipes.length} recipes`);
      await this.jobRepository.save(job);

      for (const rawRecipe of externalRecipes) {
        job = (await this.jobRepository.findOne({ where: { id: jobId } }))!;
        
        try {
          // 1. Check if source ID already imported
          const existingMapping = await this.mappingRepository.findOne({
            where: {
              providerName: provider.getProviderName(),
              externalId: rawRecipe.externalId,
            },
          });

          if (existingMapping) {
            job.duplicateRecords++;
            job.logs.push(`[Duplicate Skip] ExternalId ${rawRecipe.externalId} already imported.`);
            await this.jobRepository.save(job);
            continue;
          }

          // 2. Normalize
          const normalized = this.normalizationService.normalizeRecipe(rawRecipe);

          // 3. Duplicate detection score check on titles/ingredients
          const duplicates = await this.duplicateDetectionService.findPotentialDuplicates(
            normalized,
            similarityThreshold,
          );

          if (duplicates.length > 0) {
            const bestMatch = duplicates[0];
            const msg = `[Duplicate Flagged] "${normalized.title}" is similar to existing "${bestMatch.recipe.title}" (Score: ${bestMatch.score.toFixed(2)})`;
            job.logs.push(msg);
            
            if (skipDuplicates) {
              job.duplicateRecords++;
              await this.jobRepository.save(job);
              continue;
            }
          }

          // 4. Ingest and save within Transaction
          await this.saveImportedRecipe(normalized, provider.getProviderName());
          
          job.importedRecords++;
          job.logs.push(`[Success] Imported recipe: "${normalized.title}"`);
        } catch (recipeError) {
          job.failedRecords++;
          job.logs.push(`[Error] Failed importing "${rawRecipe.title || 'Unknown'}": ${recipeError.message}`);
        }
        
        await this.jobRepository.save(job);
      }

      // Finalize job
      job = (await this.jobRepository.findOne({ where: { id: jobId } }))!;
      job.status = ImportJobStatus.COMPLETED;
      job.logs.push(`[${new Date().toISOString()}] Import job finished. Imported: ${job.importedRecords}, Failed: ${job.failedRecords}, Duplicates: ${job.duplicateRecords}`);
      await this.jobRepository.save(job);

    } catch (pipelineError) {
      job = (await this.jobRepository.findOne({ where: { id: jobId } }))!;
      job.status = ImportJobStatus.FAILED;
      job.error = pipelineError.message;
      job.logs.push(`[Fatal Pipeline Error] ${pipelineError.message}`);
      await this.jobRepository.save(job);
    }
  }

  private async saveImportedRecipe(normalized: any, providerName: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Resolve and calculate Nutrition Macros based on ingredients
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;

      const ingredientsToSave: RecipeIngredient[] = [];

      for (const ing of normalized.ingredients) {
        // Find existing food matching normalized name
        let food = await queryRunner.manager.findOne(Food, {
          where: { name: ing.name },
        });

        // Fallback: search with ILike
        if (!food) {
          food = await queryRunner.manager.findOne(Food, {
            where: { name: ing.name }, // exact match
          });
        }

        if (!food) {
          // Create a new Food record in the database with mock nutrition
          food = queryRunner.manager.create(Food, {
            name: ing.name,
            source: FoodSource.DATABASE,
            calories: 120, // Default baseline estimate
            protein: 8,
            carbs: 10,
            fat: 4,
            servingSize: 100,
            servingUnit: ing.unit || 'g',
          });
          food = await queryRunner.manager.save(Food, food);
        }

        // Convert the ingredient amount to an estimated gram equivalent
        const gramAmount = this.convertUnitToGrams(ing.amount, ing.unit, food.name);

        // Add macros scaled by ingredient amount (amount represents ratio of 100g serving units)
        const scale = gramAmount / 100;
        totalCalories += (Number(food.calories) || 0) * scale;
        totalProtein += (Number(food.protein) || 0) * scale;
        totalCarbs += (Number(food.carbs) || 0) * scale;
        totalFat += (Number(food.fat) || 0) * scale;

        const recipeIng = queryRunner.manager.create(RecipeIngredient, {
          foodId: food.id,
          amount: ing.amount,
          unit: ing.unit,
          customName: ing.name,
        });

        ingredientsToSave.push(recipeIng);
      }

      // If nutrition is supplied by provider, override/merge it
      const servings = normalized.servings || 1;
      const finalCalories = normalized.nutrition?.calories ?? Math.round(totalCalories / servings);
      const finalProtein = normalized.nutrition?.protein ?? Math.round((totalProtein / servings) * 10) / 10;
      const finalCarbs = normalized.nutrition?.carbs ?? Math.round((totalCarbs / servings) * 10) / 10;
      const finalFat = normalized.nutrition?.fat ?? Math.round((totalFat / servings) * 10) / 10;

      // 2. Auto-tagging
      const finalTags = this.taggingService.autoTag({
        ...normalized,
        nutrition: {
          calories: finalCalories,
          protein: finalProtein,
          carbs: finalCarbs,
          fat: finalFat,
        },
      });

      // 3. Save Recipe
      let recipe = queryRunner.manager.create(Recipe, {
        title: normalized.title,
        description: normalized.description,
        instructions: normalized.instructions,
        prepTime: normalized.prepTime,
        cookTime: normalized.cookTime,
        servings,
        imageUrl: normalized.imageUrl,
        source: RecipeSource.DATABASE,
        tags: finalTags,
        calories: finalCalories,
        protein: finalProtein,
        carbs: finalCarbs,
        fat: finalFat,
      });

      recipe = await queryRunner.manager.save(Recipe, recipe);

      // 4. Save RecipeIngredients
      for (const recipeIng of ingredientsToSave) {
        recipeIng.recipeId = recipe.id;
        await queryRunner.manager.save(RecipeIngredient, recipeIng);
      }

      // 5. Save external source lookup mapping
      const mapping = queryRunner.manager.create(RecipeExternalMapping, {
        recipeId: recipe.id,
        providerName,
        externalId: normalized.externalId,
      });
      await queryRunner.manager.save(RecipeExternalMapping, mapping);

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  private convertUnitToGrams(amount: number, unit: string, foodName: string): number {
    const u = (unit || '').toLowerCase().trim();
    const name = (foodName || '').toLowerCase();

    // If already in grams/milliliters, return amount as-is
    if (u === 'g' || u === 'gram' || u === 'grams' || u === 'ml' || u === 'milliliter' || u === 'milliliters') {
      return amount;
    }

    // Weight conversions
    if (u === 'kg' || u === 'kilogram' || u === 'kilograms') {
      return amount * 1000;
    }
    if (u === 'oz' || u === 'ounce' || u === 'ounces') {
      return amount * 28.35;
    }
    if (u === 'lb' || u === 'pound' || u === 'pounds') {
      return amount * 453.6;
    }

    // Volumetric culinary conversions (average water-like density assumptions)
    if (u === 'tbsp' || u === 'tablespoon' || u === 'tablespoons') {
      return amount * 15;
    }
    if (u === 'tsp' || u === 'teaspoon' || u === 'teaspoons') {
      return amount * 5;
    }
    if (u === 'cup' || u === 'cups') {
      return amount * 200;
    }
    if (u === 'pinch' || u === 'pinches') {
      return amount * 0.5;
    }

    // Piece conversions based on specific ingredient keywords
    if (
      u === 'pcs' ||
      u === 'pc' ||
      u === 'piece' ||
      u === 'pieces' ||
      u === 'whole' ||
      u === 'unit' ||
      u === 'units' ||
      u === 'can' ||
      u === 'cans' ||
      u === 'pack' ||
      u === 'package' ||
      u === 'clove' ||
      u === 'cloves' ||
      u === ''
    ) {
      if (name.includes('chicken breast') || name.includes('breast')) {
        return amount * 200; // 1 chicken breast is roughly 200g
      }
      if (name.includes('chicken thigh') || name.includes('thigh')) {
        return amount * 120; // 1 thigh is roughly 120g
      }
      if (name.includes('chicken') || name.includes('mandi')) {
        return amount * 800; // Whole chicken portion/serving estimate is large
      }
      if (name.includes('egg')) {
        return amount * 50; // 1 egg is roughly 50g
      }
      if (name.includes('garlic') || name.includes('clove')) {
        return amount * 5; // 1 clove is roughly 5g
      }
      if (name.includes('onion') || name.includes('tomato') || name.includes('potato') || name.includes('apple') || name.includes('banana')) {
        return amount * 150; // Average piece size is 150g
      }
      if (name.includes('lemon') || name.includes('lime')) {
        return amount * 60; // 1 lemon is roughly 60g
      }
      if (name.includes('can') || name.includes('tin')) {
        return amount * 400; // Standard canned food is roughly 400g
      }

      // Default fallback for pieces/unspecified units
      return amount * 100;
    }

    // Fallback if unit is unknown, assume it is grams
    return amount;
  }
}
