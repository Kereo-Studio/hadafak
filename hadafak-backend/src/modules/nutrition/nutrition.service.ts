import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike } from 'typeorm';
import { Food, FoodSource } from './entities/food.entity';
import { NutritionLog } from './entities/nutrition-log.entity';
import { WaterLog } from './entities/water-log.entity';
import { CreateFoodDto } from './dto/create-food.dto';
import { LogFoodDto } from './dto/log-food.dto';
import { LogWaterDto } from './dto/log-water.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { FatSecretService } from './fatsecret.service';

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(Food)
    private readonly foodRepository: Repository<Food>,
    @InjectRepository(NutritionLog)
    private readonly nutritionLogRepository: Repository<NutritionLog>,
    @InjectRepository(WaterLog)
    private readonly waterLogRepository: Repository<WaterLog>,
    private readonly profilesService: ProfilesService,
    private readonly fatSecretService: FatSecretService,
  ) {}

  async upsertExternalFood(item: any): Promise<Food> {
    const barcodeKey = item.barcode || item.id;
    let food = await this.foodRepository.findOne({ where: { barcode: barcodeKey } });
    if (!food) {
      food = this.foodRepository.create({
        name: item.name,
        barcode: barcodeKey,
        source: FoodSource.DATABASE,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        servingSize: item.servingSize,
        servingUnit: item.servingUnit,
      });
      food = await this.foodRepository.save(food);
    }
    return food;
  }

  async searchFoods(query?: string, barcode?: string, source?: FoodSource, userId?: string): Promise<Food[]> {
    if (barcode) {
      let localFood = await this.foodRepository.findOne({ where: { barcode } });
      if (!localFood) {
        const extItem = await this.fatSecretService.findByBarcode(barcode);
        if (extItem) {
          localFood = await this.upsertExternalFood(extItem);
        }
      }
      return localFood ? [localFood] : [];
    }

    const where: any = {};

    if (source) {
      where.source = source;
    }

    if (query) {
      where.name = ILike(`%${query}%`);
    }

    // Return global system foods, or user custom foods if userId is provided
    let foods = await this.foodRepository.find({
      where,
      order: { name: 'ASC' },
      take: 50,
    });

    if (userId) {
      foods = foods.filter((f) => f.userId === null || f.userId === userId);
    } else {
      foods = foods.filter((f) => f.userId === null);
    }

    // If a search query is provided, query FatSecret to fetch additional branded items
    if (query) {
      const extItems = await this.fatSecretService.searchFoods(query);
      for (const extItem of extItems) {
        const existsInList = foods.some((f) => f.barcode === extItem.id || f.barcode === extItem.barcode);
        if (!existsInList) {
          const upserted = await this.upsertExternalFood(extItem);
          foods.push(upserted);
        }
      }
    }

    return foods;
  }

  async getFoodById(id: string): Promise<Food> {
    const food = await this.foodRepository.findOne({ where: { id } });
    if (!food) {
      throw new NotFoundException(`Food with ID ${id} not found`);
    }
    return food;
  }

  async createFood(userId: string, dto: CreateFoodDto, source: FoodSource = FoodSource.USER): Promise<Food> {
    const food = this.foodRepository.create({
      name: dto.name,
      barcode: dto.barcode ?? null,
      source,
      userId,
      calories: dto.calories,
      protein: dto.protein,
      carbs: dto.carbs,
      fat: dto.fat,
      servingSize: dto.servingSize ?? 100,
      servingUnit: dto.servingUnit ?? 'g',
      imageUrl: dto.imageUrl ?? null,
    });

    return this.foodRepository.save(food);
  }

  async logFood(userId: string, dto: LogFoodDto): Promise<NutritionLog> {
    await this.getFoodById(dto.foodId); // verify exists

    const log = this.nutritionLogRepository.create({
      userId,
      foodId: dto.foodId,
      quantity: dto.quantity,
      mealType: dto.mealType,
      date: dto.date || new Date().toISOString().split('T')[0],
    });

    const savedLog = await this.nutritionLogRepository.save(log);
    const result = await this.nutritionLogRepository.findOne({
      where: { id: savedLog.id },
      relations: { food: true },
    });
    if (!result) {
      throw new NotFoundException(`Failed to retrieve saved log`);
    }
    return result;
  }

  async deleteFoodLog(id: string, userId: string): Promise<void> {
    const log = await this.nutritionLogRepository.findOne({ where: { id, userId } });
    if (!log) {
      throw new NotFoundException(`Nutrition log entry ${id} not found`);
    }
    await this.nutritionLogRepository.remove(log);
  }

  async getDailySummary(userId: string, date: string) {
    const logs = await this.nutritionLogRepository.find({
      where: { userId, date },
      relations: { food: true },
    });

    let consumedCalories = 0;
    let consumedProtein = 0;
    let consumedCarbs = 0;
    let consumedFat = 0;

    for (const log of logs) {
      const scale = Number(log.quantity) || 0;
      consumedCalories += (Number(log.food.calories) || 0) * scale;
      consumedProtein += (Number(log.food.protein) || 0) * scale;
      consumedCarbs += (Number(log.food.carbs) || 0) * scale;
      consumedFat += (Number(log.food.fat) || 0) * scale;
    }

    consumedCalories = Math.round(consumedCalories);
    consumedProtein = Math.round(consumedProtein * 10) / 10;
    consumedCarbs = Math.round(consumedCarbs * 10) / 10;
    consumedFat = Math.round(consumedFat * 10) / 10;

    // Get targets from profile
    let targetCalories = 2000;
    let targetProtein = 130;
    let targetWater = 2500;

    try {
      const profile = await this.profilesService.findByUserId(userId);
      if (profile.dailyCalories) targetCalories = profile.dailyCalories;
      if (profile.dailyProtein) targetProtein = profile.dailyProtein;
      if (profile.dailyWater) targetWater = profile.dailyWater;
    } catch (e) {
      // Use fallback defaults if profile doesn't exist
    }

    // Default macro ratios (40% Carbs, 30% Fat, 30% Protein of target calories if custom macro logic isn't defined)
    const targetCarbs = Math.round(((targetCalories * 0.45) / 4) * 10) / 10;
    const targetFat = Math.round(((targetCalories * 0.25) / 9) * 10) / 10;

    // Fetch water intake
    const water = await this.waterLogRepository.findOne({ where: { userId, date } });
    const consumedWater = water ? water.amount : 0;

    return {
      date,
      summary: {
        calories: { target: targetCalories, consumed: consumedCalories, remaining: Math.max(0, targetCalories - consumedCalories) },
        protein: { target: targetProtein, consumed: consumedProtein, remaining: Math.max(0, targetProtein - consumedProtein) },
        carbs: { target: targetCarbs, consumed: consumedCarbs, remaining: Math.max(0, targetCarbs - consumedCarbs) },
        fat: { target: targetFat, consumed: consumedFat, remaining: Math.max(0, targetFat - consumedFat) },
        water: { target: targetWater, consumed: consumedWater, remaining: Math.max(0, targetWater - consumedWater) },
      },
      meals: logs.map((l) => ({
        id: l.id,
        mealType: l.mealType,
        quantity: Number(l.quantity),
        food: {
          id: l.food.id,
          name: l.food.name,
          calories: Math.round(Number(l.food.calories) * Number(l.quantity)),
          protein: Math.round(Number(l.food.protein) * Number(l.quantity) * 10) / 10,
          carbs: Math.round(Number(l.food.carbs) * Number(l.quantity) * 10) / 10,
          fat: Math.round(Number(l.food.fat) * Number(l.quantity) * 10) / 10,
          servingSize: Number(l.food.servingSize),
          servingUnit: l.food.servingUnit,
        },
      })),
    };
  }

  async getHistory(userId: string, startDate: string, endDate: string) {
    const logs = await this.nutritionLogRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      relations: { food: true },
      order: { date: 'ASC' },
    });

    const datesMap: { [date: string]: { calories: number; protein: number; carbs: number; fat: number } } = {};

    for (const log of logs) {
      const d = log.date;
      const scale = Number(log.quantity) || 0;
      if (!datesMap[d]) {
        datesMap[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      datesMap[d].calories += (Number(log.food.calories) || 0) * scale;
      datesMap[d].protein += (Number(log.food.protein) || 0) * scale;
      datesMap[d].carbs += (Number(log.food.carbs) || 0) * scale;
      datesMap[d].fat += (Number(log.food.fat) || 0) * scale;
    }

    return Object.entries(datesMap).map(([date, val]) => ({
      date,
      calories: Math.round(val.calories),
      protein: Math.round(val.protein * 10) / 10,
      carbs: Math.round(val.carbs * 10) / 10,
      fat: Math.round(val.fat * 10) / 10,
    }));
  }

  async logWater(userId: string, dto: LogWaterDto): Promise<WaterLog> {
    const date = dto.date || new Date().toISOString().split('T')[0];
    let water = await this.waterLogRepository.findOne({ where: { userId, date } });

    if (water) {
      water.amount += dto.amount;
    } else {
      water = this.waterLogRepository.create({
        userId,
        date,
        amount: dto.amount,
      });
    }

    return this.waterLogRepository.save(water);
  }

  async getFrequentFoods(userId: string): Promise<Food[]> {
    const logs = await this.nutritionLogRepository.find({
      where: { userId },
      relations: { food: true },
    });

    const counter: { [foodId: string]: { food: Food; count: number } } = {};
    for (const log of logs) {
      const fid = log.foodId;
      if (!counter[fid]) {
        counter[fid] = { food: log.food, count: 1 };
      } else {
        counter[fid].count++;
      }
    }

    return Object.values(counter)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((entry) => entry.food);
  }
}
