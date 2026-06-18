import { FoodSource } from '../../../modules/nutrition/entities/food.entity';

/**
 * Base whole-food library. Macros are per 100g/ml unless the serving unit says
 * otherwise. These give the TheMealDB import pipeline real foods to link
 * ingredients against (improving macro accuracy) and power the in-app food
 * search. Seeded idempotently by `name`.
 */
export interface FoodSeed {
  name: string;
  source: FoodSource;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

export const FOODS: FoodSeed[] = [
  // Proteins
  { name: 'chicken breast', source: FoodSource.DATABASE, calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: 'g' },
  { name: 'chicken thigh', source: FoodSource.DATABASE, calories: 209, protein: 26, carbs: 0, fat: 11, servingSize: 100, servingUnit: 'g' },
  { name: 'turkey breast', source: FoodSource.DATABASE, calories: 135, protein: 30, carbs: 0, fat: 1, servingSize: 100, servingUnit: 'g' },
  { name: 'ground beef', source: FoodSource.DATABASE, calories: 250, protein: 26, carbs: 0, fat: 17, servingSize: 100, servingUnit: 'g' },
  { name: 'beef steak', source: FoodSource.DATABASE, calories: 271, protein: 25, carbs: 0, fat: 19, servingSize: 100, servingUnit: 'g' },
  { name: 'salmon', source: FoodSource.DATABASE, calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 100, servingUnit: 'g' },
  { name: 'tuna', source: FoodSource.DATABASE, calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: 100, servingUnit: 'g' },
  { name: 'shrimp', source: FoodSource.DATABASE, calories: 99, protein: 24, carbs: 0.2, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  { name: 'egg', source: FoodSource.DATABASE, calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: 50, servingUnit: 'pcs' },
  { name: 'egg white', source: FoodSource.DATABASE, calories: 52, protein: 11, carbs: 0.7, fat: 0.2, servingSize: 100, servingUnit: 'g' },
  { name: 'greek yogurt', source: FoodSource.DATABASE, calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: 'g' },
  { name: 'cottage cheese', source: FoodSource.DATABASE, calories: 98, protein: 11, carbs: 3.4, fat: 4.3, servingSize: 100, servingUnit: 'g' },
  { name: 'whey protein', source: FoodSource.DATABASE, calories: 400, protein: 80, carbs: 6, fat: 6, servingSize: 30, servingUnit: 'scoop' },
  { name: 'tofu', source: FoodSource.DATABASE, calories: 76, protein: 8, carbs: 1.9, fat: 4.8, servingSize: 100, servingUnit: 'g' },
  // Carbs / grains
  { name: 'white rice', source: FoodSource.DATABASE, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  { name: 'brown rice', source: FoodSource.DATABASE, calories: 123, protein: 2.7, carbs: 26, fat: 1, servingSize: 100, servingUnit: 'g' },
  { name: 'oats', source: FoodSource.DATABASE, calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, servingSize: 100, servingUnit: 'g' },
  { name: 'quinoa', source: FoodSource.DATABASE, calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, servingSize: 100, servingUnit: 'g' },
  { name: 'pasta', source: FoodSource.DATABASE, calories: 131, protein: 5, carbs: 25, fat: 1.1, servingSize: 100, servingUnit: 'g' },
  { name: 'bread', source: FoodSource.DATABASE, calories: 265, protein: 9, carbs: 49, fat: 3.2, servingSize: 100, servingUnit: 'g' },
  { name: 'whole wheat tortilla', source: FoodSource.DATABASE, calories: 218, protein: 8, carbs: 36, fat: 5, servingSize: 60, servingUnit: 'pcs' },
  { name: 'potato', source: FoodSource.DATABASE, calories: 77, protein: 2, carbs: 17, fat: 0.1, servingSize: 100, servingUnit: 'g' },
  { name: 'sweet potato', source: FoodSource.DATABASE, calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: 'g' },
  { name: 'granola', source: FoodSource.DATABASE, calories: 489, protein: 10, carbs: 64, fat: 22, servingSize: 100, servingUnit: 'g' },
  // Vegetables
  { name: 'broccoli', source: FoodSource.DATABASE, calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: 'g' },
  { name: 'spinach', source: FoodSource.DATABASE, calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: 'g' },
  { name: 'mixed vegetables', source: FoodSource.DATABASE, calories: 65, protein: 3, carbs: 13, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  { name: 'tomato', source: FoodSource.DATABASE, calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, servingSize: 100, servingUnit: 'g' },
  { name: 'onion', source: FoodSource.DATABASE, calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, servingSize: 100, servingUnit: 'g' },
  { name: 'garlic', source: FoodSource.DATABASE, calories: 149, protein: 6.4, carbs: 33, fat: 0.5, servingSize: 5, servingUnit: 'clove' },
  { name: 'bell pepper', source: FoodSource.DATABASE, calories: 31, protein: 1, carbs: 6, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  // Fruits
  { name: 'banana', source: FoodSource.DATABASE, calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, servingSize: 120, servingUnit: 'pcs' },
  { name: 'apple', source: FoodSource.DATABASE, calories: 52, protein: 0.3, carbs: 14, fat: 0.2, servingSize: 150, servingUnit: 'pcs' },
  { name: 'mixed berries', source: FoodSource.DATABASE, calories: 57, protein: 0.7, carbs: 13.8, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  { name: 'avocado', source: FoodSource.DATABASE, calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: 150, servingUnit: 'pcs' },
  { name: 'lemon', source: FoodSource.DATABASE, calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, servingSize: 60, servingUnit: 'pcs' },
  // Fats / dairy / misc
  { name: 'olive oil', source: FoodSource.DATABASE, calories: 884, protein: 0, carbs: 0, fat: 100, servingSize: 15, servingUnit: 'tbsp' },
  { name: 'butter', source: FoodSource.DATABASE, calories: 717, protein: 0.9, carbs: 0.1, fat: 81, servingSize: 14, servingUnit: 'tbsp' },
  { name: 'peanut butter', source: FoodSource.DATABASE, calories: 588, protein: 25, carbs: 20, fat: 50, servingSize: 32, servingUnit: 'g' },
  { name: 'almonds', source: FoodSource.DATABASE, calories: 579, protein: 21, carbs: 22, fat: 50, servingSize: 28, servingUnit: 'g' },
  { name: 'milk', source: FoodSource.DATABASE, calories: 42, protein: 3.4, carbs: 5, fat: 1, servingSize: 100, servingUnit: 'ml' },
  { name: 'cheddar cheese', source: FoodSource.DATABASE, calories: 402, protein: 25, carbs: 1.3, fat: 33, servingSize: 30, servingUnit: 'g' },
  { name: 'honey', source: FoodSource.DATABASE, calories: 304, protein: 0.3, carbs: 82, fat: 0, servingSize: 21, servingUnit: 'tbsp' },
];
