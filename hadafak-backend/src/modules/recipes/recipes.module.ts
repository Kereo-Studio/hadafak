import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Recipe } from './entities/recipe.entity';
import { RecipeIngredient } from './entities/recipe-ingredient.entity';
import { RecipesService } from './recipes.service';
import { RecipesController } from './recipes.controller';
import { AuthModule } from '../auth/auth.module';
import { NutritionModule } from '../nutrition/nutrition.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Recipe, RecipeIngredient]),
    ConfigModule,
    AuthModule,
    NutritionModule,
  ],
  providers: [RecipesService],
  controllers: [RecipesController],
  exports: [RecipesService, TypeOrmModule],
})
export class RecipesModule {}
