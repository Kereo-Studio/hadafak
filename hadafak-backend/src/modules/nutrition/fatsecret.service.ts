import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FatSecretFoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string | null;
}

@Injectable()
export class FatSecretService {
  private readonly logger = new Logger(FatSecretService.name);
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {}

  private get credentials() {
    return {
      clientId: this.configService.get<string>('FATSECRET_CLIENT_ID'),
      clientSecret: this.configService.get<string>('FATSECRET_CLIENT_SECRET'),
    };
  }

  private isConfigured(): boolean {
    const { clientId, clientSecret } = this.credentials;
    return !!(clientId && clientSecret);
  }

  private async getAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) {
      this.logger.warn('FatSecret API is not configured: Client ID or Secret is missing.');
      return null;
    }

    if (this.accessToken && Date.now() < this.tokenExpiresAt - 30000) {
      return this.accessToken;
    }

    try {
      const { clientId, clientSecret } = this.credentials;
      const authHeader = 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const body = new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'basic',
      });

      const response = await fetch('https://oauth.fatsecret.com/connect/token', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Failed to fetch FatSecret token: ${response.status} ${errText}`);
        return null;
      }

      const data = await response.json() as { access_token: string; expires_in: number };
      this.accessToken = data.access_token;
      this.tokenExpiresAt = Date.now() + data.expires_in * 1000;
      return this.accessToken;
    } catch (e) {
      this.logger.error('Error authenticating with FatSecret OAuth 2.0', e);
      return null;
    }
  }

  private parseFoodDescription(desc: string): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingUnit: string;
  } {
    let calories = 0;
    let fat = 0;
    let carbs = 0;
    let protein = 0;
    let servingSize = 100;
    let servingUnit = 'g';

    if (!desc) {
      return { calories, protein, carbs, fat, servingSize, servingUnit };
    }

    // Parse Serving string (e.g. "Per 100g - " or "Per 1 cup (240ml) - ")
    const servingMatch = desc.match(/Per\s+([^-\|]+?)\s+-/i);
    if (servingMatch) {
      const servingStr = servingMatch[1].trim();
      const numMatch = servingStr.match(/^([\d\.\/]+)\s*(.*)$/);
      if (numMatch) {
        let sizeVal = 1;
        const valStr = numMatch[1];
        if (valStr.includes('/')) {
          const parts = valStr.split('/');
          sizeVal = (parseFloat(parts[0]) || 1) / (parseFloat(parts[1]) || 1);
        } else {
          sizeVal = parseFloat(valStr) || 1;
        }
        servingSize = sizeVal;
        servingUnit = numMatch[2] ? numMatch[2].trim() : 'serving';
      } else {
        servingUnit = servingStr;
        servingSize = 1;
      }
    }

    // Parse nutrition tags
    const calMatch = desc.match(/Calories:\s*([\d\.]+)kcal/i);
    const fatMatch = desc.match(/Fat:\s*([\d\.]+)g/i);
    const carbsMatch = desc.match(/Carbs:\s*([\d\.]+)g/i);
    const proteinMatch = desc.match(/Protein:\s*([\d\.]+)g/i);

    if (calMatch) calories = parseFloat(calMatch[1]) || 0;
    if (fatMatch) fat = parseFloat(fatMatch[1]) || 0;
    if (carbsMatch) carbs = parseFloat(carbsMatch[1]) || 0;
    if (proteinMatch) protein = parseFloat(proteinMatch[1]) || 0;

    return { calories, protein, carbs, fat, servingSize, servingUnit };
  }

  /**
   * Search foods by query string
   */
  async searchFoods(query: string): Promise<FatSecretFoodItem[]> {
    const token = await this.getAccessToken();
    if (!token) return [];

    try {
      const body = new URLSearchParams({
        method: 'foods.search',
        search_expression: query,
        format: 'json',
        max_results: '15',
      });

      const response = await fetch('https://platform.fatsecret.com/rest/server.api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        this.logger.error(`FatSecret foods.search failed: ${response.status}`);
        return [];
      }

      const data = await response.json() as any;
      const foodsList = data?.foods?.food;
      if (!foodsList) return [];

      const rawItems = Array.isArray(foodsList) ? foodsList : [foodsList];

      return rawItems.map((item: any) => {
        const parsed = this.parseFoodDescription(item.food_description);
        return {
          id: `fs:${item.food_id}`,
          name: item.food_name,
          calories: parsed.calories,
          protein: parsed.protein,
          carbs: parsed.carbs,
          fat: parsed.fat,
          servingSize: parsed.servingSize,
          servingUnit: parsed.servingUnit,
        };
      });
    } catch (e) {
      this.logger.error('Error calling FatSecret searchFoods API', e);
      return [];
    }
  }

  /**
   * Get detailed food item by barcode
   */
  async findByBarcode(barcode: string): Promise<FatSecretFoodItem | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      // Find food ID associated with barcode
      const findBody = new URLSearchParams({
        method: 'food.find_id_by_barcode',
        barcode: barcode,
        format: 'json',
      });

      const response = await fetch('https://platform.fatsecret.com/rest/server.api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: findBody.toString(),
      });

      if (!response.ok) return null;

      const data = await response.json() as any;
      const foodId = data?.food_id?.value;
      if (!foodId) return null;

      return this.getFoodDetails(foodId, barcode);
    } catch (e) {
      this.logger.error(`Error looking up barcode ${barcode} in FatSecret`, e);
      return null;
    }
  }

  /**
   * Fetch detailed food details (servings and nutrients) by food ID
   */
  async getFoodDetails(foodId: string, barcode?: string): Promise<FatSecretFoodItem | null> {
    const token = await this.getAccessToken();
    if (!token) return null;

    try {
      const body = new URLSearchParams({
        method: 'food.get.v2',
        food_id: foodId,
        format: 'json',
      });

      const response = await fetch('https://platform.fatsecret.com/rest/server.api', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) return null;

      const data = await response.json() as any;
      const food = data?.food;
      if (!food) return null;

      const servings = food.servings?.serving;
      if (!servings) return null;

      // Select default primary serving (either first serving or 100g serving if available)
      const servingsList = Array.isArray(servings) ? servings : [servings];
      const selectedServing = servingsList.find((s: any) => s.metric_serving_unit === 'g' && parseFloat(s.metric_serving_amount) === 100) || servingsList[0];

      return {
        id: `fs:${foodId}`,
        name: food.food_name,
        calories: parseFloat(selectedServing.calories) || 0,
        protein: parseFloat(selectedServing.protein) || 0,
        carbs: parseFloat(selectedServing.carbohydrate) || 0,
        fat: parseFloat(selectedServing.fat) || 0,
        servingSize: parseFloat(selectedServing.metric_serving_amount) || parseFloat(selectedServing.number_of_units) || 1,
        servingUnit: selectedServing.metric_serving_unit || selectedServing.measurement_description || 'serving',
        barcode: barcode || null,
      };
    } catch (e) {
      this.logger.error(`Error fetching food details for ID ${foodId}`, e);
      return null;
    }
  }
}
