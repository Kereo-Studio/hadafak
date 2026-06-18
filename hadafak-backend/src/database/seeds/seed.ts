import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Program, ProgramLevel } from '../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../modules/programs/entities/program-day-exercise.entity';
import { Exercise, ExerciseDifficulty, ExerciseSource } from '../../modules/exercises/entities/exercise.entity';
import { MuscleGroup } from '../../modules/exercises/entities/muscle-group.entity';
import { Equipment } from '../../modules/exercises/entities/equipment.entity';
import { WorkoutPlan, WorkoutGoal, WorkoutLevel } from '../../modules/workouts/entities/workout-plan.entity';
import { WorkoutExercise } from '../../modules/workouts/entities/workout-exercise.entity';
import { PerformanceLog } from '../../modules/performance-tracking/entities/performance-log.entity';
import { Food, FoodSource } from '../../modules/nutrition/entities/food.entity';
import { Recipe, RecipeSource } from '../../modules/recipes/entities/recipe.entity';
import { RecipeIngredient } from '../../modules/recipes/entities/recipe-ingredient.entity';
import { normalizeExerciseName } from '../../modules/exercises/utils/normalize';

export async function runSeeding(dataSource: DataSource) {
  console.log('Cleaning existing tables...');
  try {
    await dataSource.getRepository(PerformanceLog).createQueryBuilder().delete().execute();
  } catch (err) {
    // Table might not exist yet if running before synchronization
  }
  await dataSource.getRepository(WorkoutExercise).createQueryBuilder().delete().execute();
  await dataSource.getRepository(WorkoutPlan).createQueryBuilder().delete().execute();
  await dataSource.getRepository(RecipeIngredient).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Recipe).createQueryBuilder().delete().execute();
  await dataSource.getRepository(ProgramDayExercise).createQueryBuilder().delete().execute();
  await dataSource.getRepository(ProgramDay).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Program).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Exercise).createQueryBuilder().delete().execute();
  await dataSource.getRepository(MuscleGroup).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Equipment).createQueryBuilder().delete().execute();
  await dataSource.getRepository(Food).createQueryBuilder().delete().execute();
  console.log('Cleanup complete.');

  console.log('Seeding muscle groups and equipment...');
  const muscleGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'quads', 'hamstrings', 'biceps', 'triceps'];
  const equipmentTypes = ['bodyweight', 'dumbbell', 'barbell', 'machine', 'cable', 'kettlebell'];

  const muscleGroupRepo = dataSource.getRepository(MuscleGroup);
  const equipmentRepo = dataSource.getRepository(Equipment);

  const seededMuscles = await Promise.all(
    muscleGroups.map(name => {
      const item = muscleGroupRepo.create({ name });
      return muscleGroupRepo.save(item);
    })
  );

  const seededEquipment = await Promise.all(
    equipmentTypes.map(name => {
      const item = equipmentRepo.create({ name });
      return equipmentRepo.save(item);
    })
  );

  const getMuscle = (name: string): MuscleGroup => {
    const found = seededMuscles.find(m => m.name === name.toLowerCase());
    if (!found) throw new Error(`Seeding Error: Muscle group ${name} not found`);
    return found;
  };

  const getEquipment = (name: string): Equipment => {
    const found = seededEquipment.find(e => e.name === name.toLowerCase());
    if (!found) throw new Error(`Seeding Error: Equipment ${name} not found`);
    return found;
  };

  console.log('Seeding exercises...');
  const exercisesData = [
    { displayName: 'Bench Press', muscleGroupName: 'chest', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0025', gifUrl: '/api/v1/exercises/image/0025' },
    { displayName: 'Incline Dumbbell Press', muscleGroupName: 'chest', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0314', gifUrl: '/api/v1/exercises/image/0314' },
    { displayName: 'Barbell Squat', muscleGroupName: 'quads', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0042', gifUrl: '/api/v1/exercises/image/0042' },
    { displayName: 'Romanian Deadlift', muscleGroupName: 'hamstrings', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0086', gifUrl: '/api/v1/exercises/image/0086' },
    { displayName: 'Pull-up', muscleGroupName: 'back', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0652', gifUrl: '/api/v1/exercises/image/0652' },
    { displayName: 'Barbell Row', muscleGroupName: 'back', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0027', gifUrl: '/api/v1/exercises/image/0027' },
    { displayName: 'Overhead Press', muscleGroupName: 'shoulders', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0373', gifUrl: '/api/v1/exercises/image/0373' },
    { displayName: 'Dumbbell Lateral Raise', muscleGroupName: 'shoulders', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0335', gifUrl: '/api/v1/exercises/image/0335' },
    { displayName: 'Bicep Curl', muscleGroupName: 'biceps', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '1653', gifUrl: '/api/v1/exercises/image/1653' },
    { displayName: 'Tricep Pushdown', muscleGroupName: 'triceps', equipmentName: 'cable', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0242', gifUrl: '/api/v1/exercises/image/0242' },
    { displayName: 'Lying Leg Curl', muscleGroupName: 'hamstrings', equipmentName: 'machine', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0394', gifUrl: '/api/v1/exercises/image/0394' },
    { displayName: 'Leg Extension', muscleGroupName: 'quads', equipmentName: 'machine', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0586', gifUrl: '/api/v1/exercises/image/0586' },
    // Bodyweight
    { displayName: 'Push-Up', muscleGroupName: 'chest', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0662', gifUrl: '/api/v1/exercises/image/0662' },
    { displayName: 'Chin-Up', muscleGroupName: 'biceps', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '1326', gifUrl: '/api/v1/exercises/image/1326' },
    { displayName: 'Forward Lunge', muscleGroupName: 'legs', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '3470', gifUrl: '/api/v1/exercises/image/3470' },
    { displayName: 'Mountain Climber', muscleGroupName: 'core', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0630', gifUrl: '/api/v1/exercises/image/0630' },
    { displayName: 'Burpee', muscleGroupName: 'legs', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '1160', gifUrl: '/api/v1/exercises/image/1160' },
    { displayName: 'Jump Squat', muscleGroupName: 'legs', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0514', gifUrl: '/api/v1/exercises/image/0514' },
    { displayName: 'Bench Dip', muscleGroupName: 'triceps', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0129', gifUrl: '/api/v1/exercises/image/0129' },
    { displayName: 'Glute Bridge', muscleGroupName: 'hamstrings', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '3523', gifUrl: '/api/v1/exercises/image/3523' },
    { displayName: 'Bodyweight Calf Raise', muscleGroupName: 'legs', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '1373', gifUrl: '/api/v1/exercises/image/1373' },
    { displayName: 'Inverted Row', muscleGroupName: 'back', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0499', gifUrl: '/api/v1/exercises/image/0499' },
    { displayName: 'Crunch', muscleGroupName: 'core', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0274', gifUrl: '/api/v1/exercises/image/0274' },
    { displayName: 'Close-Grip Push-Up', muscleGroupName: 'triceps', equipmentName: 'bodyweight', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0259', gifUrl: '/api/v1/exercises/image/0259' },
    // Dumbbell
    { displayName: 'Dumbbell Bench Press', muscleGroupName: 'chest', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0289', gifUrl: '/api/v1/exercises/image/0289' },
    { displayName: 'Dumbbell Fly', muscleGroupName: 'chest', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0308', gifUrl: '/api/v1/exercises/image/0308' },
    { displayName: 'Dumbbell Romanian Deadlift', muscleGroupName: 'hamstrings', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '1459', gifUrl: '/api/v1/exercises/image/1459' },
    { displayName: 'Dumbbell Goblet Squat', muscleGroupName: 'legs', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '1760', gifUrl: '/api/v1/exercises/image/1760' },
    { displayName: 'Dumbbell Bent Over Row', muscleGroupName: 'back', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0293', gifUrl: '/api/v1/exercises/image/0293' },
    { displayName: 'Dumbbell Overhead Press', muscleGroupName: 'shoulders', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0426', gifUrl: '/api/v1/exercises/image/0426' },
    { displayName: 'Dumbbell Hammer Curl', muscleGroupName: 'biceps', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0298', gifUrl: '/api/v1/exercises/image/0298' },
    { displayName: 'Dumbbell Tricep Extension', muscleGroupName: 'triceps', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '1738', gifUrl: '/api/v1/exercises/image/1738' },
    { displayName: 'Dumbbell Lunge', muscleGroupName: 'legs', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0336', gifUrl: '/api/v1/exercises/image/0336' },
    { displayName: 'Dumbbell Step-Up', muscleGroupName: 'legs', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0431', gifUrl: '/api/v1/exercises/image/0431' },
    { displayName: 'Dumbbell Deadlift', muscleGroupName: 'back', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0300', gifUrl: '/api/v1/exercises/image/0300' },
    { displayName: 'Dumbbell Arnold Press', muscleGroupName: 'shoulders', equipmentName: 'dumbbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '2137', gifUrl: '/api/v1/exercises/image/2137' },
    // Gym
    { displayName: 'Barbell Deadlift', muscleGroupName: 'back', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0032', gifUrl: '/api/v1/exercises/image/0032' },
    { displayName: 'Barbell Sumo Deadlift', muscleGroupName: 'legs', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0117', gifUrl: '/api/v1/exercises/image/0117' },
    { displayName: 'Barbell Front Squat', muscleGroupName: 'quads', equipmentName: 'barbell', difficulty: ExerciseDifficulty.ADVANCED, externalId: '0024', gifUrl: '/api/v1/exercises/image/0024' },
    { displayName: 'Barbell Hack Squat', muscleGroupName: 'quads', equipmentName: 'barbell', difficulty: ExerciseDifficulty.INTERMEDIATE, externalId: '0046', gifUrl: '/api/v1/exercises/image/0046' },
    { displayName: 'Lever Leg Press', muscleGroupName: 'legs', equipmentName: 'machine', difficulty: ExerciseDifficulty.BEGINNER, externalId: '2287', gifUrl: '/api/v1/exercises/image/2287' },
    { displayName: 'Cable Lat Pulldown', muscleGroupName: 'back', equipmentName: 'cable', difficulty: ExerciseDifficulty.BEGINNER, externalId: '2330', gifUrl: '/api/v1/exercises/image/2330' },
    { displayName: 'Cable Seated Row', muscleGroupName: 'back', equipmentName: 'cable', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0861', gifUrl: '/api/v1/exercises/image/0861' },
    { displayName: 'Cable Curl', muscleGroupName: 'biceps', equipmentName: 'cable', difficulty: ExerciseDifficulty.BEGINNER, externalId: '0868', gifUrl: '/api/v1/exercises/image/0868' },
  ];

  const exerciseRepository = dataSource.getRepository(Exercise);
  const seededExercises = await Promise.all(
    exercisesData.map(e => {
      const item = exerciseRepository.create({
        name: normalizeExerciseName(e.displayName),
        displayName: e.displayName,
        muscleGroup: getMuscle(e.muscleGroupName),
        equipment: getEquipment(e.equipmentName),
        difficulty: e.difficulty,
        instructions: [`Set up for ${e.displayName}`, `Perform ${e.displayName} with correct form`],
        source: ExerciseSource.INTERNAL,
        externalId: e.externalId,
        gifUrl: e.gifUrl,
      });
      return exerciseRepository.save(item);
    })
  );
  console.log(`Seeded ${seededExercises.length} exercises.`);

  console.log('Seeding food catalog...');
  const foodsData = [
    { name: 'Oats', source: FoodSource.DATABASE, calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9, servingSize: 100, servingUnit: 'g' },
    { name: 'Chicken Breast', source: FoodSource.DATABASE, calories: 165, protein: 31, carbs: 0, fat: 3.6, servingSize: 100, servingUnit: 'g' },
    { name: 'White Rice', source: FoodSource.DATABASE, calories: 130, protein: 2.7, carbs: 28, fat: 0.3, servingSize: 100, servingUnit: 'g' },
    { name: 'Whole Egg', source: FoodSource.DATABASE, calories: 155, protein: 13, carbs: 1.1, fat: 11, servingSize: 50, servingUnit: 'pcs' },
    { name: 'Banana', source: FoodSource.DATABASE, calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3, servingSize: 120, servingUnit: 'pcs' },
    { name: 'Peanut Butter', source: FoodSource.DATABASE, calories: 588, protein: 25, carbs: 20, fat: 50, servingSize: 32, servingUnit: 'g' },
    { name: 'Salmon Fillet', source: FoodSource.DATABASE, calories: 208, protein: 20, carbs: 0, fat: 13, servingSize: 100, servingUnit: 'g' },
    { name: 'Broccoli', source: FoodSource.DATABASE, calories: 34, protein: 2.8, carbs: 7, fat: 0.4, servingSize: 100, servingUnit: 'g' },
    { name: 'Avocado', source: FoodSource.DATABASE, calories: 160, protein: 2, carbs: 9, fat: 15, servingSize: 150, servingUnit: 'pcs' },
    { name: 'Whey Protein', source: FoodSource.DATABASE, calories: 400, protein: 80, carbs: 6, fat: 6, servingSize: 30, servingUnit: 'scoop' },
    { name: 'Greek Yogurt', source: FoodSource.DATABASE, calories: 59, protein: 10, carbs: 3.6, fat: 0.4, servingSize: 100, servingUnit: 'g' },
    { name: 'Quinoa', source: FoodSource.DATABASE, calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9, servingSize: 100, servingUnit: 'g' },
    { name: 'Turkey Breast', source: FoodSource.DATABASE, calories: 135, protein: 30, carbs: 0, fat: 1, servingSize: 100, servingUnit: 'g' },
    { name: 'Canned Tuna', source: FoodSource.DATABASE, calories: 116, protein: 26, carbs: 0, fat: 1, servingSize: 100, servingUnit: 'g' },
    { name: 'Ground Beef', source: FoodSource.DATABASE, calories: 250, protein: 26, carbs: 0, fat: 17, servingSize: 100, servingUnit: 'g' },
    { name: 'Sweet Potato', source: FoodSource.DATABASE, calories: 86, protein: 1.6, carbs: 20, fat: 0.1, servingSize: 100, servingUnit: 'g' },
    { name: 'Mixed Berries', source: FoodSource.DATABASE, calories: 57, protein: 0.7, carbs: 13.8, fat: 0.3, servingSize: 100, servingUnit: 'g' },
    { name: 'Granola', source: FoodSource.DATABASE, calories: 489, protein: 10, carbs: 64, fat: 22, servingSize: 100, servingUnit: 'g' },
    { name: 'Whole Wheat Tortilla', source: FoodSource.DATABASE, calories: 218, protein: 8, carbs: 36, fat: 5, servingSize: 60, servingUnit: 'pcs' },
    { name: 'Mixed Vegetables', source: FoodSource.DATABASE, calories: 65, protein: 3, carbs: 13, fat: 0.3, servingSize: 100, servingUnit: 'g' },
  ];
  
  const foodRepository = dataSource.getRepository(Food);
  const seededFoods = await foodRepository.save(
    foodsData.map((f) => foodRepository.create(f)),
  );
  console.log(`Seeded ${seededFoods.length} foods.`);

  console.log('Seeding recipes...');
  const getFoodId = (name: string): string => {
    const found = seededFoods.find((f) => f.name.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`Food not found during seeding: ${name}`);
    return found.id;
  };

  const recipeRepository = dataSource.getRepository(Recipe);
  const recipeIngredientRepository = dataSource.getRepository(RecipeIngredient);

  // Pancake Recipe
  const pancakeRecipe = await recipeRepository.save(
    recipeRepository.create({
      title: 'Banana Oatmeal Pancakes',
      description: 'Delicious, macro-friendly pancakes made with oats, banana, and whole eggs. Packed with healthy fibers and clean proteins.',
      instructions: [
        'Place the oats in a blender and blend until fine like flour.',
        'Add the banana and whole eggs into the blender and mix until smooth.',
        'Preheat a non-stick frying pan over medium heat.',
        'Pour batter circles onto the pan and cook until bubbles form, then flip and cook other side.',
      ],
      prepTime: 5,
      cookTime: 10,
      servings: 2,
      calories: 403,
      protein: 22.1,
      carbs: 47.9,
      fat: 14.6,
      source: RecipeSource.DATABASE,
      tags: ['Breakfast', 'High-Protein', 'Vegetarian'],
    })
  );

  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: pancakeRecipe.id, foodId: getFoodId('Oats'), amount: 1.0, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: pancakeRecipe.id, foodId: getFoodId('Whole Egg'), amount: 2.0, unit: 'pcs' }),
    recipeIngredientRepository.create({ recipeId: pancakeRecipe.id, foodId: getFoodId('Banana'), amount: 1.0, unit: 'pcs' }),
  ]);

  // Chicken Rice Bowl Recipe
  const chickenBowlRecipe = await recipeRepository.save(
    recipeRepository.create({
      title: 'Healthy Chicken & Rice Bowl',
      description: 'The gym-goer classic: lean grilled chicken breast served alongside steamed white rice and fresh broccoli heads.',
      instructions: [
        'Season chicken breast with salt, pepper, and garlic powder.',
        'Grill chicken on a pan for 6-8 minutes per side until fully cooked.',
        'Steam broccoli florets in boiling water for 3-5 minutes.',
        'Assemble your bowl: white rice at the bottom, topped with sliced chicken and broccoli.',
      ],
      prepTime: 10,
      cookTime: 15,
      servings: 1,
      calories: 641,
      protein: 71.6,
      carbs: 66.5,
      fat: 8.4,
      source: RecipeSource.DATABASE,
      tags: ['Lunch', 'Dinner', 'High-Protein', 'Low-Fat'],
    })
  );

  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: chickenBowlRecipe.id, foodId: getFoodId('Chicken Breast'), amount: 2.0, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: chickenBowlRecipe.id, foodId: getFoodId('White Rice'), amount: 2.0, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: chickenBowlRecipe.id, foodId: getFoodId('Broccoli'), amount: 1.5, unit: '100g' }),
  ]);

  // Greek Yogurt Parfait
  const parfaitRecipe = await recipeRepository.save(
    recipeRepository.create({
      title: 'Greek Yogurt Parfait',
      description: 'Creamy Greek yogurt layered with fresh berries and crunchy granola. A fast high-protein breakfast ready in under 5 minutes.',
      instructions: [
        'Spoon Greek yogurt into a bowl or glass.',
        'Layer mixed berries on top.',
        'Sprinkle granola over the berries.',
        'Serve immediately or refrigerate overnight.',
      ],
      prepTime: 5, cookTime: 0, servings: 1,
      calories: 322, protein: 27.7, carbs: 36.8, fat: 7.2,
      source: RecipeSource.DATABASE,
      tags: ['Breakfast', 'High-Protein', 'Quick', 'No-Cook'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: parfaitRecipe.id, foodId: getFoodId('Greek Yogurt'), amount: 2.0, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: parfaitRecipe.id, foodId: getFoodId('Mixed Berries'), amount: 0.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: parfaitRecipe.id, foodId: getFoodId('Granola'), amount: 0.3, unit: '100g' }),
  ]);

  // Salmon & Quinoa Bowl
  const salmonBowl = await recipeRepository.save(
    recipeRepository.create({
      title: 'Salmon & Quinoa Bowl',
      description: 'Omega-3-rich pan-seared salmon served over fluffy quinoa with a side of steamed broccoli. Clean, balanced macros.',
      instructions: [
        'Cook quinoa in water (2:1 ratio) for 15 minutes until fluffy.',
        'Season salmon fillet with salt, pepper, and lemon juice.',
        'Pan-sear salmon on medium-high heat for 4 minutes per side.',
        'Steam broccoli for 3-4 minutes.',
        'Assemble bowl: quinoa base, salmon on top, broccoli on the side.',
      ],
      prepTime: 10, cookTime: 20, servings: 1,
      calories: 518, protein: 42.4, carbs: 42.6, fat: 14.3,
      source: RecipeSource.DATABASE,
      tags: ['Lunch', 'Dinner', 'Omega-3', 'High-Protein', 'Gluten-Free'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: salmonBowl.id, foodId: getFoodId('Salmon Fillet'), amount: 1.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: salmonBowl.id, foodId: getFoodId('Quinoa'), amount: 1.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: salmonBowl.id, foodId: getFoodId('Broccoli'), amount: 1.0, unit: '100g' }),
  ]);

  // Protein Banana Smoothie
  const smoothie = await recipeRepository.save(
    recipeRepository.create({
      title: 'Protein Banana Smoothie',
      description: 'Post-workout shake with banana, whey protein, and oats blended smooth. Hits 35g of protein and digests fast.',
      instructions: [
        'Add banana, whey protein scoop, oats, and cold water to a blender.',
        'Blend on high for 30-45 seconds until smooth.',
        'Adjust consistency with water if needed.',
        'Drink immediately for best taste.',
      ],
      prepTime: 3, cookTime: 0, servings: 1,
      calories: 398, protein: 35.1, carbs: 52.3, fat: 4.8,
      source: RecipeSource.DATABASE,
      tags: ['Breakfast', 'Post-Workout', 'High-Protein', 'Quick'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: smoothie.id, foodId: getFoodId('Banana'), amount: 1.0, unit: 'pcs' }),
    recipeIngredientRepository.create({ recipeId: smoothie.id, foodId: getFoodId('Whey Protein'), amount: 1.0, unit: 'scoop' }),
    recipeIngredientRepository.create({ recipeId: smoothie.id, foodId: getFoodId('Oats'), amount: 0.4, unit: '100g' }),
  ]);

  // Turkey & Veggie Stir-Fry
  const turkeyStirFry = await recipeRepository.save(
    recipeRepository.create({
      title: 'Turkey & Veggie Stir-Fry',
      description: 'Lean ground turkey sautéed with mixed vegetables over a light sauce. Low-carb, high-protein, and done in 20 minutes.',
      instructions: [
        'Cook ground turkey in a hot pan with olive oil until browned, breaking it apart.',
        'Add mixed vegetables and stir-fry for 5-7 minutes until tender.',
        'Season with soy sauce, garlic, and ginger.',
        'Serve immediately.',
      ],
      prepTime: 5, cookTime: 15, servings: 1,
      calories: 418, protein: 45.0, carbs: 13.0, fat: 17.3,
      source: RecipeSource.DATABASE,
      tags: ['Dinner', 'Low-Carb', 'High-Protein'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: turkeyStirFry.id, foodId: getFoodId('Turkey Breast'), amount: 1.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: turkeyStirFry.id, foodId: getFoodId('Mixed Vegetables'), amount: 1.5, unit: '100g' }),
  ]);

  // Avocado Toast with Eggs
  const avocadoToast = await recipeRepository.save(
    recipeRepository.create({
      title: 'Avocado Toast with Eggs',
      description: 'Mashed avocado on whole-grain toast topped with two fried eggs. Satisfying, nutritious, and full of healthy fats.',
      instructions: [
        'Mash half an avocado with a fork, season with salt, pepper, and lime juice.',
        'Toast bread until golden.',
        'Fry eggs in a pan to your liking (sunny-side up or over-easy).',
        'Spread avocado on toast, top with fried eggs.',
      ],
      prepTime: 5, cookTime: 5, servings: 1,
      calories: 485, protein: 24.1, carbs: 18.9, fat: 34.7,
      source: RecipeSource.DATABASE,
      tags: ['Breakfast', 'Healthy-Fats', 'Vegetarian'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: avocadoToast.id, foodId: getFoodId('Avocado'), amount: 1.0, unit: 'pcs' }),
    recipeIngredientRepository.create({ recipeId: avocadoToast.id, foodId: getFoodId('Whole Egg'), amount: 2.0, unit: 'pcs' }),
  ]);

  // Tuna Salad Wrap
  const tunaWrap = await recipeRepository.save(
    recipeRepository.create({
      title: 'Tuna Salad Wrap',
      description: 'Canned tuna mixed with a dash of lemon and wrapped in a whole-wheat tortilla. Fast lunch packed with lean protein.',
      instructions: [
        'Drain canned tuna and mix with lemon juice, salt, and pepper.',
        'Lay tortilla flat and add tuna mixture.',
        'Add optional lettuce and tomato.',
        'Wrap tightly and serve.',
      ],
      prepTime: 5, cookTime: 0, servings: 1,
      calories: 388, protein: 37.8, carbs: 36.0, fat: 6.0,
      source: RecipeSource.DATABASE,
      tags: ['Lunch', 'High-Protein', 'Quick', 'No-Cook'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: tunaWrap.id, foodId: getFoodId('Canned Tuna'), amount: 1.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: tunaWrap.id, foodId: getFoodId('Whole Wheat Tortilla'), amount: 1.0, unit: 'pcs' }),
  ]);

  // Beef & Sweet Potato Bowl
  const beefBowl = await recipeRepository.save(
    recipeRepository.create({
      title: 'Beef & Sweet Potato Bowl',
      description: 'Seasoned ground beef over roasted sweet potato — a bulking-friendly meal rich in protein, complex carbs, and iron.',
      instructions: [
        'Dice sweet potatoes and roast at 200°C (400°F) for 25 minutes until tender.',
        'Brown ground beef in a pan over medium-high heat, seasoning with cumin and paprika.',
        'Serve beef over roasted sweet potato chunks.',
      ],
      prepTime: 10, cookTime: 25, servings: 1,
      calories: 586, protein: 39.6, carbs: 40.0, fat: 17.0,
      source: RecipeSource.DATABASE,
      tags: ['Dinner', 'High-Protein', 'High-Carb', 'Bulking'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: beefBowl.id, foodId: getFoodId('Ground Beef'), amount: 1.5, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: beefBowl.id, foodId: getFoodId('Sweet Potato'), amount: 2.0, unit: '100g' }),
  ]);

  // Overnight Oats
  const overnightOats = await recipeRepository.save(
    recipeRepository.create({
      title: 'Overnight Oats',
      description: 'Prep-ahead breakfast: oats soaked overnight with Greek yogurt and banana. Ready to eat straight from the fridge.',
      instructions: [
        'Combine oats, Greek yogurt, and a splash of water in a jar or bowl.',
        'Stir in whey protein powder until smooth.',
        'Slice banana and add on top.',
        'Cover and refrigerate overnight (at least 6 hours).',
        'Eat cold in the morning.',
      ],
      prepTime: 5, cookTime: 0, servings: 1,
      calories: 414, protein: 37.4, carbs: 52.1, fat: 5.6,
      source: RecipeSource.DATABASE,
      tags: ['Breakfast', 'Meal-Prep', 'High-Protein', 'No-Cook'],
    })
  );
  await recipeIngredientRepository.save([
    recipeIngredientRepository.create({ recipeId: overnightOats.id, foodId: getFoodId('Oats'), amount: 0.8, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: overnightOats.id, foodId: getFoodId('Greek Yogurt'), amount: 1.0, unit: '100g' }),
    recipeIngredientRepository.create({ recipeId: overnightOats.id, foodId: getFoodId('Whey Protein'), amount: 1.0, unit: 'scoop' }),
    recipeIngredientRepository.create({ recipeId: overnightOats.id, foodId: getFoodId('Banana'), amount: 1.0, unit: 'pcs' }),
  ]);

  console.log('Seeded 10 global database recipes.');

  const getExId = (name: string): string => {
    const found = seededExercises.find((e) => e.displayName.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`Exercise not found during seeding: ${name}`);
    return found.id;
  };

  const programRepository = dataSource.getRepository(Program);
  const programDayRepository = dataSource.getRepository(ProgramDay);
  const programDayExerciseRepository = dataSource.getRepository(ProgramDayExercise);

  console.log('Seeding programs...');

  // 1. PPL
  const ppl = programRepository.create({
    name: 'Push Pull Legs (PPL)',
    description: 'Classic 3-day split focusing on movement patterns: Push (Chest/Shoulders/Triceps), Pull (Back/Biceps), Legs (Quads/Hamstrings/Calves).',
    level: ProgramLevel.INTERMEDIATE,
  });
  const savedPpl = await programRepository.save(ppl);
  
  const pplDays = await programDayRepository.save([
    programDayRepository.create({ programId: savedPpl.id, dayNumber: 1, title: 'Push Day' }),
    programDayRepository.create({ programId: savedPpl.id, dayNumber: 2, title: 'Pull Day' }),
    programDayRepository.create({ programId: savedPpl.id, dayNumber: 3, title: 'Legs Day' }),
  ]);

  // PPL Exercises mapping
  await programDayExerciseRepository.save([
    // Push Day
    programDayExerciseRepository.create({ programDayId: pplDays[0].id, exerciseId: getExId('Bench Press'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: pplDays[0].id, exerciseId: getExId('Incline Dumbbell Press'), order: 2, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: pplDays[0].id, exerciseId: getExId('Overhead Press'), order: 3, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: pplDays[0].id, exerciseId: getExId('Tricep Pushdown'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Pull Day
    programDayExerciseRepository.create({ programDayId: pplDays[1].id, exerciseId: getExId('Pull-up'), order: 1, targetSets: 4, targetRepsRange: '8-10', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: pplDays[1].id, exerciseId: getExId('Barbell Row'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: pplDays[1].id, exerciseId: getExId('Dumbbell Lateral Raise'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: pplDays[1].id, exerciseId: getExId('Bicep Curl'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Legs Day
    programDayExerciseRepository.create({ programDayId: pplDays[2].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: pplDays[2].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: pplDays[2].id, exerciseId: getExId('Leg Extension'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: pplDays[2].id, exerciseId: getExId('Lying Leg Curl'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
  ]);

  // 2. Upper Lower
  const ul = programRepository.create({
    name: 'Upper Lower Split',
    description: 'Efficient 4-day split alternating between upper body muscles and lower body muscles. Great for hypertrophy.',
    level: ProgramLevel.INTERMEDIATE,
  });
  const savedUl = await programRepository.save(ul);
  
  const ulDays = await programDayRepository.save([
    programDayRepository.create({ programId: savedUl.id, dayNumber: 1, title: 'Upper Body A' }),
    programDayRepository.create({ programId: savedUl.id, dayNumber: 2, title: 'Lower Body A' }),
    programDayRepository.create({ programId: savedUl.id, dayNumber: 3, title: 'Upper Body B' }),
    programDayRepository.create({ programId: savedUl.id, dayNumber: 4, title: 'Lower Body B' }),
  ]);

  // Upper Lower Exercises mapping
  await programDayExerciseRepository.save([
    // Upper A
    programDayExerciseRepository.create({ programDayId: ulDays[0].id, exerciseId: getExId('Bench Press'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: ulDays[0].id, exerciseId: getExId('Barbell Row'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: ulDays[0].id, exerciseId: getExId('Overhead Press'), order: 3, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: ulDays[0].id, exerciseId: getExId('Bicep Curl'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Lower A
    programDayExerciseRepository.create({ programDayId: ulDays[1].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: ulDays[1].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: ulDays[1].id, exerciseId: getExId('Leg Extension'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: ulDays[1].id, exerciseId: getExId('Lying Leg Curl'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Upper B
    programDayExerciseRepository.create({ programDayId: ulDays[2].id, exerciseId: getExId('Incline Dumbbell Press'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: ulDays[2].id, exerciseId: getExId('Pull-up'), order: 2, targetSets: 4, targetRepsRange: '8-10', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: ulDays[2].id, exerciseId: getExId('Dumbbell Lateral Raise'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: ulDays[2].id, exerciseId: getExId('Tricep Pushdown'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Lower B
    programDayExerciseRepository.create({ programDayId: ulDays[3].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: ulDays[3].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: ulDays[3].id, exerciseId: getExId('Lying Leg Curl'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: ulDays[3].id, exerciseId: getExId('Leg Extension'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
  ]);

  // 3. Full Body
  const fb = programRepository.create({
    name: 'Full Body Workout',
    description: 'Perfect 3-day split for beginners. Focuses on compound exercises that target all major muscle groups in a single session.',
    level: ProgramLevel.BEGINNER,
  });
  const savedFb = await programRepository.save(fb);
  
  const fbDays = await programDayRepository.save([
    programDayRepository.create({ programId: savedFb.id, dayNumber: 1, title: 'Full Body Day 1' }),
    programDayRepository.create({ programId: savedFb.id, dayNumber: 2, title: 'Full Body Day 2' }),
    programDayRepository.create({ programId: savedFb.id, dayNumber: 3, title: 'Full Body Day 3' }),
  ]);

  // Full Body Exercises mapping
  await programDayExerciseRepository.save([
    // Day 1
    programDayExerciseRepository.create({ programDayId: fbDays[0].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: fbDays[0].id, exerciseId: getExId('Bench Press'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[0].id, exerciseId: getExId('Barbell Row'), order: 3, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[0].id, exerciseId: getExId('Dumbbell Lateral Raise'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Day 2
    programDayExerciseRepository.create({ programDayId: fbDays[1].id, exerciseId: getExId('Romanian Deadlift'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: fbDays[1].id, exerciseId: getExId('Incline Dumbbell Press'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[1].id, exerciseId: getExId('Pull-up'), order: 3, targetSets: 3, targetRepsRange: '8-10', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[1].id, exerciseId: getExId('Bicep Curl'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Day 3
    programDayExerciseRepository.create({ programDayId: fbDays[2].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: fbDays[2].id, exerciseId: getExId('Overhead Press'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[2].id, exerciseId: getExId('Pull-up'), order: 3, targetSets: 3, targetRepsRange: '8-10', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: fbDays[2].id, exerciseId: getExId('Tricep Pushdown'), order: 4, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
  ]);

  // 4. Fat Loss Conditioning (HIIT & Strength)
  const flc = programRepository.create({
    name: 'Fat Loss Conditioning (HIIT & Strength)',
    description: 'High-intensity metabolic conditioning split designed to maximize fat loss, retain lean muscle, and boost cardiovascular health.',
    level: ProgramLevel.INTERMEDIATE,
  });
  const savedFlc = await programRepository.save(flc);
  
  const flcDays = await programDayRepository.save([
    programDayRepository.create({ programId: savedFlc.id, dayNumber: 1, title: 'Upper Body Burn' }),
    programDayRepository.create({ programId: savedFlc.id, dayNumber: 2, title: 'Lower Body Burn' }),
    programDayRepository.create({ programId: savedFlc.id, dayNumber: 3, title: 'Full Body Conditioning' }),
  ]);

  await programDayExerciseRepository.save([
    // Upper Body Burn
    programDayExerciseRepository.create({ programDayId: flcDays[0].id, exerciseId: getExId('Pull-up'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: flcDays[0].id, exerciseId: getExId('Bench Press'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: flcDays[0].id, exerciseId: getExId('Dumbbell Lateral Raise'), order: 3, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    programDayExerciseRepository.create({ programDayId: flcDays[0].id, exerciseId: getExId('Bicep Curl'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    // Lower Body Burn
    programDayExerciseRepository.create({ programDayId: flcDays[1].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 75 }),
    programDayExerciseRepository.create({ programDayId: flcDays[1].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 75 }),
    programDayExerciseRepository.create({ programDayId: flcDays[1].id, exerciseId: getExId('Leg Extension'), order: 3, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    programDayExerciseRepository.create({ programDayId: flcDays[1].id, exerciseId: getExId('Lying Leg Curl'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    // Full Body Conditioning
    programDayExerciseRepository.create({ programDayId: flcDays[2].id, exerciseId: getExId('Overhead Press'), order: 1, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: flcDays[2].id, exerciseId: getExId('Barbell Row'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: flcDays[2].id, exerciseId: getExId('Bench Press'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: flcDays[2].id, exerciseId: getExId('Barbell Squat'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 75 }),
  ]);

  // 5. Advanced Strength & Power Split
  const asp = programRepository.create({
    name: 'Advanced Strength & Power Split',
    description: 'Heavy resistance program focusing on raw power output, targeting compound lift strength, and building dense muscle tissue.',
    level: ProgramLevel.ADVANCED,
  });
  const savedAsp = await programRepository.save(asp);

  const aspDays = await programDayRepository.save([
    programDayRepository.create({ programId: savedAsp.id, dayNumber: 1, title: 'Push Power' }),
    programDayRepository.create({ programId: savedAsp.id, dayNumber: 2, title: 'Pull & Legs Power' }),
    programDayRepository.create({ programId: savedAsp.id, dayNumber: 3, title: 'Upper Hypertrophy' }),
    programDayRepository.create({ programId: savedAsp.id, dayNumber: 4, title: 'Lower Hypertrophy' }),
  ]);

  await programDayExerciseRepository.save([
    // Push Power
    programDayExerciseRepository.create({ programDayId: aspDays[0].id, exerciseId: getExId('Bench Press'), order: 1, targetSets: 5, targetRepsRange: '5', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: aspDays[0].id, exerciseId: getExId('Overhead Press'), order: 2, targetSets: 5, targetRepsRange: '5', targetRestTime: 120 }),
    programDayExerciseRepository.create({ programDayId: aspDays[0].id, exerciseId: getExId('Incline Dumbbell Press'), order: 3, targetSets: 4, targetRepsRange: '6-8', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: aspDays[0].id, exerciseId: getExId('Tricep Pushdown'), order: 4, targetSets: 4, targetRepsRange: '8-10', targetRestTime: 75 }),
    // Pull & Legs Power
    programDayExerciseRepository.create({ programDayId: aspDays[1].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 5, targetRepsRange: '5', targetRestTime: 150 }),
    programDayExerciseRepository.create({ programDayId: aspDays[1].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 5, targetRepsRange: '5', targetRestTime: 150 }),
    programDayExerciseRepository.create({ programDayId: aspDays[1].id, exerciseId: getExId('Pull-up'), order: 3, targetSets: 4, targetRepsRange: '6-8', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: aspDays[1].id, exerciseId: getExId('Barbell Row'), order: 4, targetSets: 4, targetRepsRange: '6-8', targetRestTime: 90 }),
    // Upper Hypertrophy
    programDayExerciseRepository.create({ programDayId: aspDays[2].id, exerciseId: getExId('Bench Press'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: aspDays[2].id, exerciseId: getExId('Barbell Row'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: aspDays[2].id, exerciseId: getExId('Overhead Press'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 90 }),
    programDayExerciseRepository.create({ programDayId: aspDays[2].id, exerciseId: getExId('Bicep Curl'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Lower Hypertrophy
    programDayExerciseRepository.create({ programDayId: aspDays[3].id, exerciseId: getExId('Barbell Squat'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 100 }),
    programDayExerciseRepository.create({ programDayId: aspDays[3].id, exerciseId: getExId('Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 100 }),
    programDayExerciseRepository.create({ programDayId: aspDays[3].id, exerciseId: getExId('Leg Extension'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    programDayExerciseRepository.create({ programDayId: aspDays[3].id, exerciseId: getExId('Lying Leg Curl'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
  ]);

  console.log('Programs, ProgramDays, and Foods seeded successfully!');
}

async function seed() {
  console.log('Initializing database connection for seeding...');
  await AppDataSource.initialize();
  console.log('Database connection initialized successfully.');
  console.log('Synchronizing schema (dropping existing tables)...');
  await AppDataSource.synchronize(true);
  console.log('Schema synchronized.');
  await runSeeding(AppDataSource);
  await AppDataSource.destroy();
  console.log('Database connection closed.');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Error during seeding:', err);
    process.exit(1);
  });
}
