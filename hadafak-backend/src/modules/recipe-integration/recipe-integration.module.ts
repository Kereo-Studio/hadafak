import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipeImportJob } from './entities/recipe-import-job.entity';
import { RecipeExternalMapping } from './entities/recipe-external-mapping.entity';
import { Recipe } from '../recipes/entities/recipe.entity';
import { RecipeIngredient } from '../recipes/entities/recipe-ingredient.entity';
import { Food } from '../nutrition/entities/food.entity';
import { AuthModule } from '../auth/auth.module';
import { NutritionModule } from '../nutrition/nutrition.module';
import { RecipesModule } from '../recipes/recipes.module';
import { RecipeImportService } from './services/recipe-import.service';
import { RecipeNormalizationService } from './services/recipe-normalization.service';
import { IngredientNormalizerService } from './services/ingredient-normalizer.service';
import { RecipeDuplicateDetectionService } from './services/recipe-duplicate-detection.service';
import { RecipeTaggingService } from './services/recipe-tagging.service';
import { TheMealDbProvider } from './providers/the-meal-db.provider';
import { RecipeNlgProvider } from './providers/recipe-nlg.provider';
import { FoodComProvider } from './providers/food-com.provider';
import { RecipeImportController } from './controllers/recipe-import.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecipeImportJob,
      RecipeExternalMapping,
      Recipe,
      RecipeIngredient,
      Food,
    ]),
    AuthModule,
    forwardRef(() => NutritionModule),
    forwardRef(() => RecipesModule),
  ],
  providers: [
    RecipeImportService,
    RecipeNormalizationService,
    IngredientNormalizerService,
    RecipeDuplicateDetectionService,
    RecipeTaggingService,
    TheMealDbProvider,
    RecipeNlgProvider,
    FoodComProvider,
  ],
  controllers: [RecipeImportController],
  exports: [RecipeImportService],
})
export class RecipeIntegrationModule {}
