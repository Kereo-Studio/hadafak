export interface ExternalRecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface ExternalRecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ExternalRecipe {
  externalId: string;
  title: string;
  description: string;
  instructions: string[];
  prepTime: number;
  cookTime: number;
  servings: number;
  imageUrl?: string | null;
  tags: string[];
  ingredients: ExternalRecipeIngredient[];
  nutrition?: ExternalRecipeNutrition | null;
}

export interface RecipeProvider {
  getProviderName(): string;
  fetchRecipes(options: {
    limit: number;
    offset: number;
    filePath?: string;
    query?: string;
    apiKey?: string;
  }): Promise<ExternalRecipe[]>;
}
