import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { LogRecipeDto } from './dto/log-recipe.dto';
import { GenerateAiRecipeDto } from './dto/generate-ai-recipe.dto';
import { SubstituteIngredientDto } from './dto/substitute-ingredient.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RecipeSource } from './entities/recipe.entity';

@ApiTags('Recipes Library')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @ApiOperation({ summary: 'Manually add a custom healthy recipe' })
  @ApiResponse({ status: 201, description: 'Recipe created successfully.' })
  async createRecipe(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipesService.createRecipe(userId, dto);
  }

  @Post('generate-ai')
  @ApiOperation({ summary: 'AI Recipe builder using fridge ingredient inventory lists' })
  @ApiResponse({ status: 201, description: 'AI Recipe generated and cached.' })
  async generateAiRecipe(
    @CurrentUser('sub') userId: string,
    @Body() dto: GenerateAiRecipeDto,
  ) {
    return this.recipesService.generateAiRecipe(userId, dto);
  }

  @Post('substitute')
  @ApiOperation({ summary: 'Get AI recommended substitutions for ingredients' })
  async substituteIngredient(
    @CurrentUser('sub') userId: string,
    @Body() dto: SubstituteIngredientDto,
  ) {
    return this.recipesService.substituteIngredient(userId, dto);
  }

  @Post(':id/log')
  @ApiOperation({ summary: 'One-Tap log: add recipe servings directly to daily nutrition journals' })
  @ApiResponse({ status: 201, description: 'Recipe logged successfully.' })
  async logRecipe(
    @CurrentUser('sub') userId: string,
    @Param('id') recipeId: string,
    @Body() dto: LogRecipeDto,
  ) {
    return this.recipesService.logRecipe(userId, recipeId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Filter and search recipes library' })
  @ApiQuery({ name: 'query', required: false, description: 'Search title text' })
  @ApiQuery({ name: 'tag', required: false, description: 'Diet tags (e.g. High-Protein)' })
  @ApiQuery({ name: 'maxCalories', required: false, type: Number })
  @ApiQuery({ name: 'minProtein', required: false, type: Number })
  @ApiQuery({ name: 'source', required: false, enum: RecipeSource })
  async searchRecipes(
    @CurrentUser('sub') userId: string,
    @Query('query') query?: string,
    @Query('tag') tag?: string,
    @Query('maxCalories') maxCalories?: string,
    @Query('minProtein') minProtein?: string,
    @Query('source') source?: RecipeSource,
  ) {
    return this.recipesService.searchRecipes(
      query,
      tag,
      maxCalories ? Number(maxCalories) : undefined,
      minProtein ? Number(minProtein) : undefined,
      source,
      userId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipe details and structured ingredients mapping' })
  async getRecipeById(@Param('id') id: string) {
    return this.recipesService.getRecipeById(id);
  }
}
