import { Controller, Post, Get, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { LogFoodDto } from './dto/log-food.dto';
import { LogWaterDto } from './dto/log-water.dto';
import { ScanFoodDto } from './dto/scan-food.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FoodSource } from './entities/food.entity';

@ApiTags('Nutrition & Calories')
@Controller('nutrition')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('foods')
  @ApiOperation({ summary: 'Search food items in the database dictionary' })
  @ApiQuery({ name: 'q', required: false, description: 'Search term for food name' })
  @ApiQuery({ name: 'barcode', required: false, description: 'Find food by barcode' })
  @ApiQuery({ name: 'source', enum: FoodSource, required: false })
  @ApiResponse({ status: 200, description: 'Matched foods list.' })
  async searchFoods(
    @CurrentUser('sub') userId: string,
    @Query('q') query?: string,
    @Query('barcode') barcode?: string,
    @Query('source') source?: FoodSource,
  ) {
    return this.nutritionService.searchFoods(query, barcode, source, userId);
  }

  @Post('foods')
  @ApiOperation({ summary: 'Add a new custom food item to the dictionary' })
  @ApiResponse({ status: 201, description: 'Custom food successfully registered.' })
  async createFood(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateFoodDto,
  ) {
    return this.nutritionService.createFood(userId, dto, FoodSource.USER);
  }

  @Post('logs')
  @ApiOperation({ summary: 'Log a food consumption' })
  @ApiResponse({ status: 201, description: 'Food consumption logged successfully.' })
  async logFood(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogFoodDto,
  ) {
    return this.nutritionService.logFood(userId, dto);
  }

  @Delete('logs/:id')
  @ApiOperation({ summary: 'Delete a food log entry' })
  @ApiResponse({ status: 200, description: 'Log entry successfully removed.' })
  async deleteLog(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.nutritionService.deleteFoodLog(id, userId);
  }

  @Get('logs/today')
  @ApiOperation({ summary: 'Retrieve daily macro and calorie summary vs target defaults' })
  @ApiQuery({ name: 'date', required: false, description: 'Defaults to current local date if omitted' })
  @ApiResponse({ status: 200, description: 'Consumed vs target macros summary.' })
  async getDailySummary(
    @CurrentUser('sub') userId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.nutritionService.getDailySummary(userId, targetDate);
  }

  @Get('logs/history')
  @ApiOperation({ summary: 'Get historical total macro summaries grouped by date' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-06-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-06-07' })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.nutritionService.getHistory(userId, startDate, endDate);
  }

  @Post('water')
  @ApiOperation({ summary: 'Add water consumed in milliliters (incremental)' })
  @ApiResponse({ status: 201, description: 'Daily water intake logged.' })
  async logWater(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogWaterDto,
  ) {
    return this.nutritionService.logWater(userId, dto);
  }

  @Get('foods/frequent')
  @ApiOperation({ summary: 'Get user frequently logged foods list' })
  @ApiResponse({ status: 200, description: 'List of foods sorted by user frequency.' })
  async getFrequent(@CurrentUser('sub') userId: string) {
    return this.nutritionService.getFrequentFoods(userId);
  }

  @Post('scan')
  @ApiOperation({ summary: 'Scan food using AI/Gemini vision analysis' })
  @ApiResponse({ status: 200, description: 'AI estimated macronutrients results.' })
  async scanFood(
    @CurrentUser('sub') userId: string,
    @Body() dto: ScanFoodDto,
  ) {
    return this.nutritionService.scanFood(dto.imageBase64);
  }
}
