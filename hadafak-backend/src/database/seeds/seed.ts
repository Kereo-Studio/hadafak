import { AppDataSource } from '../data-source';
import { Program, ProgramLevel } from '../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../modules/programs/entities/program-day-exercise.entity';
import { Exercise } from '../../modules/exercises/entities/exercise.entity';
import { Food, FoodSource } from '../../modules/nutrition/entities/food.entity';
import { Recipe, RecipeSource } from '../../modules/recipes/entities/recipe.entity';
import { RecipeIngredient } from '../../modules/recipes/entities/recipe-ingredient.entity';

async function seed() {
  console.log('Initializing database connection for seeding...');
  await AppDataSource.initialize();
  console.log('Database connection initialized successfully.');

  console.log('Cleaning existing tables...');
  await AppDataSource.getRepository(RecipeIngredient).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(Recipe).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(ProgramDayExercise).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(ProgramDay).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(Program).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(Exercise).createQueryBuilder().delete().execute();
  await AppDataSource.getRepository(Food).createQueryBuilder().delete().execute();
  console.log('Cleanup complete.');

  console.log('Seeding exercises...');
  const exercisesData = [
    { name: 'Bench Press', muscleGroup: 'Chest' },
    { name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
    { name: 'Barbell Squat', muscleGroup: 'Quads' },
    { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
    { name: 'Pull-up', muscleGroup: 'Back' },
    { name: 'Barbell Row', muscleGroup: 'Back' },
    { name: 'Overhead Press', muscleGroup: 'Shoulders' },
    { name: 'Dumbbell Lateral Raise', muscleGroup: 'Shoulders' },
    { name: 'Bicep Curl', muscleGroup: 'Biceps' },
    { name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
    { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings' },
    { name: 'Leg Extension', muscleGroup: 'Quads' },
  ];

  const exerciseRepository = AppDataSource.getRepository(Exercise);
  const seededExercises = await exerciseRepository.save(
    exercisesData.map((e) => exerciseRepository.create(e)),
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
  ];
  
  const foodRepository = AppDataSource.getRepository(Food);
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

  const recipeRepository = AppDataSource.getRepository(Recipe);
  const recipeIngredientRepository = AppDataSource.getRepository(RecipeIngredient);

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

  console.log('Seeded 2 global database recipes.');

  const getExId = (name: string): string => {
    const found = seededExercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`Exercise not found during seeding: ${name}`);
    return found.id;
  };

  const programRepository = AppDataSource.getRepository(Program);
  const programDayRepository = AppDataSource.getRepository(ProgramDay);
  const programDayExerciseRepository = AppDataSource.getRepository(ProgramDayExercise);

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

  console.log('Programs, ProgramDays, and Foods seeded successfully!');
  await AppDataSource.destroy();
  console.log('Database connection closed.');
}

seed().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
