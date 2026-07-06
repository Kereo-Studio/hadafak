import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, ILike, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Food, FoodSource } from './entities/food.entity';
import { NutritionLog } from './entities/nutrition-log.entity';
import { WaterLog } from './entities/water-log.entity';
import { CreateFoodDto } from './dto/create-food.dto';
import { LogFoodDto } from './dto/log-food.dto';
import { LogWaterDto } from './dto/log-water.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { FatSecretService } from './fatsecret.service';
import { OpenFoodFactsService } from './openfoodfacts.service';

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
    private readonly openFoodFactsService: OpenFoodFactsService,
    private readonly configService: ConfigService,
  ) { }

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
        imageUrl: item.imageUrl ?? null,
      });
      food = await this.foodRepository.save(food);
    }
    return food;
  }

  async searchFoods(query?: string, barcode?: string, source?: FoodSource, userId?: string): Promise<Food[]> {
    if (barcode) {
      let localFood = await this.foodRepository.findOne({ where: { barcode } });
      if (!localFood) {
        // Fallback 1: Try Open Food Facts first (optimized for packaged grocery items)
        const offItem = await this.openFoodFactsService.findByBarcode(barcode);
        if (offItem) {
          localFood = await this.upsertExternalFood(offItem);
        } else {
          // Fallback 2: Try FatSecret database
          const extItem = await this.fatSecretService.findByBarcode(barcode);
          if (extItem) {
            localFood = await this.upsertExternalFood(extItem);
          }
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
      const itemsToUpsert = extItems.filter(
        (extItem) => !foods.some((f) => f.barcode === extItem.id || f.barcode === extItem.barcode)
      );
      if (itemsToUpsert.length > 0) {
        const upserted = await this.upsertExternalFoods(itemsToUpsert);
        foods.push(...upserted);
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

  async getFoodsByIds(ids: string[]): Promise<Food[]> {
    if (ids.length === 0) return [];
    return this.foodRepository.find({
      where: { id: In(ids) },
    });
  }

  async upsertExternalFoods(items: any[]): Promise<Food[]> {
    if (items.length === 0) return [];

    const barcodes = items.map((item) => item.barcode || item.id).filter((b) => !!b);
    const existingFoods = barcodes.length > 0
      ? await this.foodRepository.find({ where: { barcode: In(barcodes) } })
      : [];

    const foodMap = new Map(existingFoods.map((f) => [f.barcode, f]));
    const foodsToCreate: Food[] = [];

    for (const item of items) {
      const barcodeKey = item.barcode || item.id;
      if (!foodMap.has(barcodeKey)) {
        const food = this.foodRepository.create({
          name: item.name,
          barcode: barcodeKey,
          source: FoodSource.DATABASE,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          servingSize: item.servingSize,
          servingUnit: item.servingUnit,
          imageUrl: item.imageUrl ?? null,
        });
        foodsToCreate.push(food);
      }
    }

    if (foodsToCreate.length > 0) {
      const savedFoods = await this.foodRepository.save(foodsToCreate);
      savedFoods.forEach((f) => foodMap.set(f.barcode, f));
    }

    return items
      .map((item) => foodMap.get(item.barcode || item.id))
      .filter((f): f is Food => !!f);
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

  async scanFood(imageBase64: string): Promise<any> {
    const apiKey = this.configService.get<string>('app.geminiApiKey');
    if (!apiKey) {
      // Mock Demo mode: simulate AI processing
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        name: 'AI Scan: Caesar Chicken Salad',
        calories: 320,
        protein: 28,
        carbs: 10,
        fat: 18,
        servingSize: 300,
        servingUnit: 'g',
      };
    }

    try {
      // Clean base64 string if it contains URI headers like "data:image/jpeg;base64,"
      let cleanBase64 = imageBase64;
      let mimeType = 'image/jpeg';
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        cleanBase64 = parts[1];
        mimeType = parts[0].split('data:')[1] || 'image/jpeg';
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              {
                text: 'Analyze the attached image and estimate the nutritional information of the food item shown. Output a JSON object matching this schema:\n{\n  "name": "Description of the food",\n  "calories": number,\n  "protein": number,\n  "carbs": number,\n  "fat": number,\n  "servingSize": number,\n  "servingUnit": "string"\n}\nOnly output the valid JSON object, without any markdown formatting or extra text.',
              },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      };

      let response: Response = null as any;
      const attempts = 3;
      let delay = 1000;

      for (let i = 0; i < attempts; i++) {
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          break;
        }

        if (response.status === 503 || response.status === 429) {
          console.warn(`Gemini API returned status ${response.status}. Retrying in ${delay}ms... (Attempt ${i + 1} of ${attempts})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw new Error(`Gemini API returned status ${response.status}`);
        }
      }

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status} after ${attempts} attempts`);
      }

      const data = await response.json() as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Empty response from Gemini API');
      }

      const result = JSON.parse(text);
      return {
        name: result.name || 'AI Scanned Food',
        calories: Number(result.calories) || 0,
        protein: Number(result.protein) || 0,
        carbs: Number(result.carbs) || 0,
        fat: Number(result.fat) || 0,
        servingSize: Number(result.servingSize) || 100,
        servingUnit: result.servingUnit || 'g',
      };
    } catch (err) {
      console.error('Failed to analyze food image with Gemini:', err.message || err);
      throw new Error(`Failed to analyze food image: ${err.message || err}`);
    }
  }
}
