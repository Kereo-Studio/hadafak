import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  async findByBarcode(barcode: string): Promise<any | null> {
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
      this.logger.log(`Fetching product from Open Food Facts: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HadafakApp - MobileClient - Version 1.0 - https://hadafak.com',
        },
      });

      if (!response.ok) {
        this.logger.warn(`Open Food Facts API returned status ${response.status}`);
        return null;
      }

      const data = await response.json() as any;

      if (data && data.status === 1 && data.product) {
        const product = data.product;
        const nutriments = product.nutriments || {};

        // Parse energy in kcal, fallback to kJ/4.184
        let calories = nutriments['energy-kcal_100g'] || nutriments['energy-kcal'];
        if (calories === undefined || calories === null) {
          const energyKj = nutriments['energy-kj_100g'] || nutriments['energy-kj'];
          if (energyKj) {
            calories = Math.round(Number(energyKj) / 4.184);
          } else {
            calories = 0;
          }
        }

        const protein = Number(nutriments.proteins_100g || nutriments.proteins || 0);
        const carbs = Number(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0);
        const fat = Number(nutriments.fat_100g || nutriments.fat || 0);

        // Serving size parsing
        let servingSize = 100;
        let servingUnit = 'g';

        if (product.serving_quantity) {
          servingSize = Number(product.serving_quantity);
        } else if (product.serving_size) {
          const parsed = this.parseServingSizeStr(product.serving_size);
          if (parsed) {
            servingSize = parsed.size;
            servingUnit = parsed.unit;
          }
        }

        const name = product.product_name || product.generic_name || `Barcode Product (${barcode})`;
        const imageUrl = product.image_front_url || product.image_url || null;

        return {
          name,
          barcode,
          calories: Math.round(Number(calories)),
          protein: Number(protein.toFixed(1)),
          carbs: Number(carbs.toFixed(1)),
          fat: Number(fat.toFixed(1)),
          servingSize,
          servingUnit,
          imageUrl,
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Error querying Open Food Facts for barcode ${barcode}: ${error.message}`);
      return null;
    }
  }

  private parseServingSizeStr(servingSizeStr: string): { size: number; unit: string } | null {
    try {
      const match = servingSizeStr.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz|tbsp|tsp|pieces|piece|servings|serving)?/i);
      if (match) {
        return {
          size: parseFloat(match[1]),
          unit: match[2] ? match[2].toLowerCase() : 'g',
        };
      }
    } catch (e) {
      this.logger.warn(`Failed to parse serving size string "${servingSizeStr}": ${e.message}`);
    }
    return null;
  }
}
