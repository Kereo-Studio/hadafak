import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Program, ProgramLevel } from '../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../modules/programs/entities/program-day-exercise.entity';
import { Exercise, ExerciseDifficulty, ExerciseSource } from '../../modules/exercises/entities/exercise.entity';
import { MuscleGroup } from '../../modules/exercises/entities/muscle-group.entity';
import { Equipment } from '../../modules/exercises/entities/equipment.entity';
import { WorkoutPlan } from '../../modules/workouts/entities/workout-plan.entity';
import { WorkoutExercise } from '../../modules/workouts/entities/workout-exercise.entity';
import { PerformanceLog } from '../../modules/performance-tracking/entities/performance-log.entity';
import { Food, FoodSource } from '../../modules/nutrition/entities/food.entity';
import { Recipe, RecipeSource } from '../../modules/recipes/entities/recipe.entity';
import { RecipeIngredient } from '../../modules/recipes/entities/recipe-ingredient.entity';
import { normalizeExerciseName } from '../../modules/exercises/utils/normalize';

// ─── Exercise seed data ────────────────────────────────────────────────────────
// All IDs reference exercises-dataset-main/data/exercises.json
// gifUrl served via /api/v1/exercises/image/:externalId
const CORE_EXERCISES = [
  // ── Gym / Barbell ──────────────────────────────────────────────────────────
  { displayName: 'Bench Press',               muscle: 'chest',      equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0025' },
  { displayName: 'Incline Dumbbell Press',    muscle: 'chest',      equip: 'dumbbell',   diff: ExerciseDifficulty.INTERMEDIATE, id: '0314' },
  { displayName: 'Barbell Squat',             muscle: 'quads',      equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0042' },
  { displayName: 'Romanian Deadlift',         muscle: 'hamstrings', equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0086' },
  { displayName: 'Barbell Row',               muscle: 'back',       equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0027' },
  { displayName: 'Overhead Press',            muscle: 'shoulders',  equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0373' },
  { displayName: 'Barbell Deadlift',          muscle: 'back',       equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0032' },
  { displayName: 'Barbell Sumo Deadlift',     muscle: 'legs',       equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0117' },
  { displayName: 'Barbell Front Squat',       muscle: 'quads',      equip: 'barbell',    diff: ExerciseDifficulty.ADVANCED,     id: '0024' },
  { displayName: 'Barbell Hack Squat',        muscle: 'quads',      equip: 'barbell',    diff: ExerciseDifficulty.INTERMEDIATE, id: '0046' },
  // ── Machine ────────────────────────────────────────────────────────────────
  { displayName: 'Lying Leg Curl',            muscle: 'hamstrings', equip: 'machine',    diff: ExerciseDifficulty.BEGINNER,     id: '0394' },
  { displayName: 'Leg Extension',             muscle: 'quads',      equip: 'machine',    diff: ExerciseDifficulty.BEGINNER,     id: '0586' },
  { displayName: 'Lever Leg Press',           muscle: 'legs',       equip: 'machine',    diff: ExerciseDifficulty.BEGINNER,     id: '2287' },
  // ── Cable ──────────────────────────────────────────────────────────────────
  { displayName: 'Tricep Pushdown',           muscle: 'triceps',    equip: 'cable',      diff: ExerciseDifficulty.BEGINNER,     id: '0242' },
  { displayName: 'Cable Lat Pulldown',        muscle: 'back',       equip: 'cable',      diff: ExerciseDifficulty.BEGINNER,     id: '2330' },
  { displayName: 'Cable Seated Row',          muscle: 'back',       equip: 'cable',      diff: ExerciseDifficulty.BEGINNER,     id: '0861' },
  { displayName: 'Cable Curl',                muscle: 'biceps',     equip: 'cable',      diff: ExerciseDifficulty.BEGINNER,     id: '0868' },
  // ── Dumbbell ───────────────────────────────────────────────────────────────
  { displayName: 'Dumbbell Lateral Raise',    muscle: 'shoulders',  equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0335' },
  { displayName: 'Bicep Curl',                muscle: 'biceps',     equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '1653' },
  { displayName: 'Dumbbell Bench Press',      muscle: 'chest',      equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0289' },
  { displayName: 'Dumbbell Fly',              muscle: 'chest',      equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0308' },
  { displayName: 'Dumbbell Romanian Deadlift',muscle: 'hamstrings', equip: 'dumbbell',   diff: ExerciseDifficulty.INTERMEDIATE, id: '1459' },
  { displayName: 'Dumbbell Goblet Squat',     muscle: 'legs',       equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '1760' },
  { displayName: 'Dumbbell Bent Over Row',    muscle: 'back',       equip: 'dumbbell',   diff: ExerciseDifficulty.INTERMEDIATE, id: '0293' },
  { displayName: 'Dumbbell Overhead Press',   muscle: 'shoulders',  equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0426' },
  { displayName: 'Dumbbell Hammer Curl',      muscle: 'biceps',     equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0298' },
  { displayName: 'Dumbbell Tricep Extension', muscle: 'triceps',    equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '1738' },
  { displayName: 'Dumbbell Lunge',            muscle: 'legs',       equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0336' },
  { displayName: 'Dumbbell Step-Up',          muscle: 'legs',       equip: 'dumbbell',   diff: ExerciseDifficulty.BEGINNER,     id: '0431' },
  { displayName: 'Dumbbell Deadlift',         muscle: 'back',       equip: 'dumbbell',   diff: ExerciseDifficulty.INTERMEDIATE, id: '0300' },
  { displayName: 'Dumbbell Arnold Press',     muscle: 'shoulders',  equip: 'dumbbell',   diff: ExerciseDifficulty.INTERMEDIATE, id: '2137' },
  // ── Bodyweight ─────────────────────────────────────────────────────────────
  { displayName: 'Pull-up',                   muscle: 'back',       equip: 'bodyweight', diff: ExerciseDifficulty.INTERMEDIATE, id: '0652' },
  { displayName: 'Push-Up',                   muscle: 'chest',      equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '0662' },
  { displayName: 'Chin-Up',                   muscle: 'biceps',     equip: 'bodyweight', diff: ExerciseDifficulty.INTERMEDIATE, id: '1326' },
  { displayName: 'Forward Lunge',             muscle: 'legs',       equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '3470' },
  { displayName: 'Mountain Climber',          muscle: 'core',       equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '0630' },
  { displayName: 'Burpee',                    muscle: 'legs',       equip: 'bodyweight', diff: ExerciseDifficulty.INTERMEDIATE, id: '1160' },
  { displayName: 'Jump Squat',                muscle: 'legs',       equip: 'bodyweight', diff: ExerciseDifficulty.INTERMEDIATE, id: '0514' },
  { displayName: 'Bench Dip',                 muscle: 'triceps',    equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '0129' },
  { displayName: 'Glute Bridge',              muscle: 'hamstrings', equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '3523' },
  { displayName: 'Bodyweight Calf Raise',     muscle: 'legs',       equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '1373' },
  { displayName: 'Inverted Row',              muscle: 'back',       equip: 'bodyweight', diff: ExerciseDifficulty.INTERMEDIATE, id: '0499' },
  { displayName: 'Crunch',                    muscle: 'core',       equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '0274' },
  { displayName: 'Close-Grip Push-Up',        muscle: 'triceps',    equip: 'bodyweight', diff: ExerciseDifficulty.BEGINNER,     id: '0259' },
];

// externalId → display name mapping for gym programs that reference exercises
// not in CORE_EXERCISES. Created on-demand during program seeding.
const GYM_EXERCISE_ID_MAP: Record<string, string> = {
  '0097': 'Overhead Press (Barbell)',
  '0150': 'Lat Pulldown',
  '0180': 'Seated Cable Row',
  '0172': 'Face Pull',
  '0031': 'Barbell Bicep Curl',
  '0043': 'Barbell Back Squat',
  '0089': 'Romanian Deadlift (RDL)',
  '0739': 'Leg Press (Machine)',
  '0599': 'Lying Leg Curl (Machine)',
  '0417': 'Standing Calf Raise',
  '0379': 'Seated Calf Raise',
  '0455': 'Hanging Leg Raise',
  '0486': 'Plank',
  '0047': 'Incline Barbell Press',
  '0291': 'Decline Dumbbell Press',
  '0164': 'Cable Crossover',
  '0101': 'Close-Grip Bench Press',
  '0447': 'EZ-Bar Preacher Curl',
  '0204': 'Tricep Overhead Cable Extension',
  '0313': 'Incline Hammer Curl',
  '0082': 'Reverse Barbell Wrist Curl',
  '0843': 'T-Bar Row',
  '0382': 'Dumbbell Pullover',
  '0571': 'Leg Extension (Machine)',
  '0344': 'Overhead Tricep Extension',
  '0405': 'Dumbbell Shoulder Press',
  '0312': 'Dumbbell Bicep Curl',
  '0381': 'Reverse Lunge',
  '1460': 'Walking Lunge',
  '0627': 'Pike Push-Up',
  '1542': 'Ring Push-Up',
  '0262': 'Diamond Push-Up',
  '1510': 'Bodyweight Squat',
  '0497': 'Australian Pull-Up',
  '0483': 'Glute Bridge (Floor)',
  '1440': 'Single-Leg Romanian Deadlift',
  '0112': 'Bicycle Crunch',
  '1314': 'Superman Hold',
  '3544': 'Side Plank',
  '0334': 'Dumbbell Lateral Raise (Alt)',
  '0376': 'Dumbbell Romanian Deadlift (Alt)',
  '2133': 'Dumbbell Bulgarian Split Squat',
  '0310': 'Dumbbell Front Raise',
  '0333': 'Dumbbell Kickback',
  '0406': 'Dumbbell Shrug',
  '0846': 'Dumbbell Russian Twist',
  '3655': 'High Knees',
  '0459': 'Flutter Kick',
  '0687': 'Russian Twist',
  '1409': 'Glute Bridge March',
  '3360': 'Bear Crawl',
  '3361': 'Lateral Skater Jump',
  '1471': 'Inchworm',
  '0991': 'Resistance Band Row',
  '0997': 'Resistance Band Shoulder Press',
  '0976': 'Resistance Band Bicep Curl',
  '1004': 'Resistance Band Squat',
  '0200': 'Tricep Rope Pushdown',
  '0861': 'Wide-Grip Lat Pulldown',
};

// ─── Gym programs data (from add-new-programs.ts) ─────────────────────────────
interface GymExercise { name: string; externalId: string; sets: number; reps: string; rest: number }
interface GymDay     { title: string; exercises: GymExercise[] }
interface GymProgram { name: string; description: string; level: ProgramLevel; days: GymDay[] }

const GYM_PROGRAMS: GymProgram[] = [
  {
    name: '6-Day Push/Pull/Legs (PPL)',
    description: 'High-frequency 6-day PPL split targeting each muscle group twice weekly for maximum hypertrophy.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Push A (Chest, Shoulders, Triceps)', exercises: [
        { name: 'Barbell Bench Press',     externalId: '0025', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Overhead Press (OHP)',    externalId: '0097', sets: 3, reps: '8-10',  rest: 90  },
        { name: 'Incline Dumbbell Press',  externalId: '0314', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Lateral Raises',          externalId: '0334', sets: 4, reps: '12-15', rest: 60  },
        { name: 'Tricep Rope Pushdowns',   externalId: '0200', sets: 3, reps: '10-12', rest: 60  },
      ]},
      { title: 'Pull A (Back, Biceps)', exercises: [
        { name: 'Conventional Deadlift',   externalId: '0032', sets: 3, reps: '5',     rest: 150 },
        { name: 'Lat Pulldowns',           externalId: '0150', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Seated Cable Rows',       externalId: '0180', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Face Pulls',              externalId: '0172', sets: 4, reps: '15-20', rest: 60  },
        { name: 'Barbell Bicep Curls',     externalId: '0031', sets: 3, reps: '10-12', rest: 60  },
      ]},
      { title: 'Legs A (Quads, Hamstrings, Calves)', exercises: [
        { name: 'Barbell Back Squat',      externalId: '0043', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Romanian Deadlift',       externalId: '0089', sets: 3, reps: '8-10',  rest: 90  },
        { name: 'Leg Press',               externalId: '0739', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Leg Curls',               externalId: '0599', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Standing Calf Raises',    externalId: '0417', sets: 4, reps: '15-20', rest: 60  },
      ]},
      { title: 'Push B (Chest, Shoulders, Triceps)', exercises: [
        { name: 'Incline Barbell Press',   externalId: '0047', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Dumbbell Shoulder Press', externalId: '0405', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Cable Crossover',         externalId: '0164', sets: 3, reps: '12-15', rest: 75  },
        { name: 'Lateral Raises',          externalId: '0334', sets: 4, reps: '12-15', rest: 60  },
        { name: 'Overhead Tricep Extension',externalId:'0344', sets: 3, reps: '10-12', rest: 60  },
      ]},
      { title: 'Pull B (Back, Biceps)', exercises: [
        { name: 'Barbell Row',             externalId: '0027', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Pull-Up',                 externalId: '0652', sets: 4, reps: '6-10',  rest: 90  },
        { name: 'Seated Cable Row',        externalId: '0861', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Face Pulls',              externalId: '0172', sets: 3, reps: '15-20', rest: 60  },
        { name: 'Dumbbell Hammer Curl',    externalId: '0298', sets: 3, reps: '10-12', rest: 60  },
      ]},
      { title: 'Legs B (Quads, Hamstrings, Calves)', exercises: [
        { name: 'Barbell Back Squat',      externalId: '0043', sets: 4, reps: '8-10',  rest: 120 },
        { name: 'Romanian Deadlift',       externalId: '0089', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Leg Extension',           externalId: '0586', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Lying Leg Curl',          externalId: '0394', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Seated Calf Raise',       externalId: '0379', sets: 4, reps: '15-20', rest: 60  },
      ]},
    ],
  },
  {
    name: '4-Day Upper/Lower Split',
    description: 'Hits each muscle group twice weekly with 3 full rest days — ideal for recovery and consistent progression.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Upper A', exercises: [
        { name: 'Incline Dumbbell Press',  externalId: '0314', sets: 4, reps: '8-10',  rest: 90 },
        { name: 'Bent-Over Barbell Row',   externalId: '0027', sets: 4, reps: '8-10',  rest: 90 },
        { name: 'Dumbbell Shoulder Press', externalId: '0405', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Pull-Up / Chin-Up',       externalId: '0652', sets: 3, reps: '6-10',  rest: 90 },
        { name: 'Dumbbell Bicep Curl',     externalId: '0312', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Overhead Tricep Extension',externalId:'0344', sets: 3, reps: '10-12', rest: 60 },
      ]},
      { title: 'Lower A', exercises: [
        { name: 'Barbell Back Squat',      externalId: '0043', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Romanian Deadlift',       externalId: '0089', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Walking Lunge',           externalId: '1460', sets: 3, reps: '12',    rest: 60  },
        { name: 'Seated Calf Raise',       externalId: '0379', sets: 4, reps: '12-15', rest: 60  },
        { name: 'Hanging Leg Raise',       externalId: '0455', sets: 3, reps: '15',    rest: 60  },
      ]},
      { title: 'Upper B', exercises: [
        { name: 'Bench Press',             externalId: '0025', sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Cable Lat Pulldown',      externalId: '2330', sets: 4, reps: '8-10',  rest: 90 },
        { name: 'Overhead Press',          externalId: '0373', sets: 3, reps: '8-12',  rest: 90 },
        { name: 'Lateral Raise',           externalId: '0335', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Tricep Pushdown',         externalId: '0242', sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Lower B', exercises: [
        { name: 'Barbell Deadlift',        externalId: '0032', sets: 4, reps: '5',     rest: 150 },
        { name: 'Leg Press',               externalId: '0739', sets: 4, reps: '10-12', rest: 90  },
        { name: 'Leg Extension',           externalId: '0586', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Lying Leg Curl',          externalId: '0394', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Standing Calf Raise',     externalId: '0417', sets: 4, reps: '15-20', rest: 60  },
      ]},
    ],
  },
  {
    name: '3-Day Classic Full Body',
    description: 'Perfect for beginners or busy individuals. Heavy compound movements to master core lifts and maximize energy expenditure.',
    level: ProgramLevel.BEGINNER,
    days: [
      { title: 'Full Body A', exercises: [
        { name: 'Barbell Back Squat',  externalId: '0043', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Bench Press',         externalId: '0025', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Lat Pulldown',        externalId: '0150', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Lateral Raise',       externalId: '0334', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Plank',               externalId: '0486', sets: 3, reps: '60s',   rest: 60 },
      ]},
      { title: 'Full Body B', exercises: [
        { name: 'Romanian Deadlift',   externalId: '0089', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Incline DB Press',    externalId: '0314', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Barbell Row',         externalId: '0027', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Dumbbell Curl',       externalId: '0312', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Plank',               externalId: '0486', sets: 3, reps: '60s',   rest: 60 },
      ]},
      { title: 'Full Body C', exercises: [
        { name: 'Barbell Back Squat',  externalId: '0043', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Overhead Press',      externalId: '0097', sets: 3, reps: '8-10',  rest: 90 },
        { name: 'Pull-Up',             externalId: '0652', sets: 3, reps: '6-10',  rest: 90 },
        { name: 'Tricep Pushdown',     externalId: '0242', sets: 3, reps: '10-15', rest: 60 },
        { name: 'Hanging Leg Raise',   externalId: '0455', sets: 3, reps: '12-15', rest: 60 },
      ]},
    ],
  },
  {
    name: '6-Day Arnold Split',
    description: 'Pairs opposing muscle groups (Chest/Back, Shoulders/Arms, Legs) for intense pumps and high volume. Arnold\'s classic routine.',
    level: ProgramLevel.ADVANCED,
    days: [
      { title: 'Chest & Back A', exercises: [
        { name: 'Bench Press',           externalId: '0025', sets: 4, reps: '8',    rest: 90 },
        { name: 'Incline Dumbbell Press',externalId: '0314', sets: 4, reps: '10',   rest: 90 },
        { name: 'Wide-Grip Pull-Up',     externalId: '0652', sets: 4, reps: '8-10', rest: 90 },
        { name: 'T-Bar Row',             externalId: '0843', sets: 4, reps: '10',   rest: 90 },
        { name: 'Dumbbell Pullover',     externalId: '0382', sets: 3, reps: '12',   rest: 60 },
      ]},
      { title: 'Shoulders & Arms A', exercises: [
        { name: 'Overhead Press',        externalId: '0097', sets: 4, reps: '8-10', rest: 90 },
        { name: 'Lateral Raise',         externalId: '0334', sets: 4, reps: '12-15',rest: 60 },
        { name: 'Barbell Bicep Curl',    externalId: '0031', sets: 4, reps: '8-10', rest: 75 },
        { name: 'Tricep Pushdown',       externalId: '0242', sets: 4, reps: '10-12',rest: 60 },
        { name: 'Hammer Curl',           externalId: '0298', sets: 3, reps: '10-12',rest: 60 },
      ]},
      { title: 'Legs A', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 4, reps: '8-10', rest: 120 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 4, reps: '8-10', rest: 90  },
        { name: 'Leg Press',             externalId: '0739', sets: 3, reps: '12',   rest: 90  },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '12-15',rest: 60  },
        { name: 'Standing Calf Raise',   externalId: '0417', sets: 4, reps: '15-20',rest: 60  },
      ]},
      { title: 'Chest & Back B', exercises: [
        { name: 'Incline Barbell Press', externalId: '0047', sets: 4, reps: '8-10', rest: 90 },
        { name: 'Cable Crossover',       externalId: '0164', sets: 3, reps: '12-15',rest: 75 },
        { name: 'Cable Seated Row',      externalId: '0861', sets: 4, reps: '8-10', rest: 90 },
        { name: 'Lat Pulldown',          externalId: '0150', sets: 4, reps: '10-12',rest: 90 },
        { name: 'Dumbbell Pullover',     externalId: '0382', sets: 3, reps: '12',   rest: 60 },
      ]},
      { title: 'Shoulders & Arms B', exercises: [
        { name: 'Dumbbell Arnold Press', externalId: '2137', sets: 4, reps: '10-12',rest: 90 },
        { name: 'Face Pull',             externalId: '0172', sets: 3, reps: '15-20',rest: 60 },
        { name: 'EZ-Bar Preacher Curl',  externalId: '0447', sets: 4, reps: '8-10', rest: 75 },
        { name: 'Overhead Tricep Cable', externalId: '0204', sets: 3, reps: '10-12',rest: 60 },
        { name: 'Incline Hammer Curl',   externalId: '0313', sets: 3, reps: '10-12',rest: 60 },
      ]},
      { title: 'Legs B', exercises: [
        { name: 'Barbell Front Squat',   externalId: '0024', sets: 4, reps: '6-8',  rest: 120 },
        { name: 'Barbell Deadlift',      externalId: '0032', sets: 3, reps: '5',    rest: 150 },
        { name: 'Leg Extension',         externalId: '0586', sets: 3, reps: '12-15',rest: 60  },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '12-15',rest: 60  },
        { name: 'Seated Calf Raise',     externalId: '0379', sets: 4, reps: '15-20',rest: 60  },
      ]},
    ],
  },
  {
    name: "5-Day Traditional 'Bro' Split",
    description: 'Dedicates an entire session to one muscle group for extreme volume and isolation. Classic bodybuilder approach.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Chest Day', exercises: [
        { name: 'Bench Press',           externalId: '0025', sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Incline Barbell Press', externalId: '0047', sets: 3, reps: '8-12',  rest: 90 },
        { name: 'Decline Dumbbell Press',externalId: '0291', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Cable Crossover',       externalId: '0164', sets: 4, reps: '12-15', rest: 60 },
        { name: 'Push-Up',               externalId: '0662', sets: 3, reps: '15-20', rest: 60 },
      ]},
      { title: 'Back Day', exercises: [
        { name: 'Barbell Deadlift',      externalId: '0032', sets: 4, reps: '5',     rest: 150 },
        { name: 'Barbell Row',           externalId: '0027', sets: 4, reps: '8-12',  rest: 90  },
        { name: 'Lat Pulldown',          externalId: '0150', sets: 4, reps: '10-12', rest: 90  },
        { name: 'Cable Seated Row',      externalId: '0861', sets: 3, reps: '10-12', rest: 90  },
        { name: 'T-Bar Row',             externalId: '0843', sets: 3, reps: '10-12', rest: 90  },
      ]},
      { title: 'Shoulders Day', exercises: [
        { name: 'Overhead Press',        externalId: '0097', sets: 4, reps: '8-10',  rest: 90 },
        { name: 'Dumbbell Arnold Press', externalId: '2137', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Lateral Raise',         externalId: '0334', sets: 4, reps: '12-15', rest: 60 },
        { name: 'Face Pull',             externalId: '0172', sets: 4, reps: '15-20', rest: 60 },
      ]},
      { title: 'Legs Day', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 4, reps: '8-12',  rest: 120 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 4, reps: '8-12',  rest: 90  },
        { name: 'Leg Press',             externalId: '0739', sets: 3, reps: '10-15', rest: 90  },
        { name: 'Leg Extension',         externalId: '0586', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Standing Calf Raise',   externalId: '0417', sets: 4, reps: '15-20', rest: 60  },
      ]},
      { title: 'Arms Day', exercises: [
        { name: 'Close-Grip Bench Press',externalId: '0101', sets: 4, reps: '6-8',   rest: 90 },
        { name: 'EZ-Bar Preacher Curl',  externalId: '0447', sets: 4, reps: '8-10',  rest: 90 },
        { name: 'Overhead Tricep Cable', externalId: '0204', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Incline Hammer Curl',   externalId: '0313', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Tricep Pushdown',       externalId: '0242', sets: 3, reps: '12-15', rest: 60 },
      ]},
    ],
  },
  {
    name: 'PHUL — Power Hypertrophy Upper Lower',
    description: 'Combines powerlifting (low reps) with bodybuilding (high reps) across 4 days. Best of both worlds.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Upper Power', exercises: [
        { name: 'Bench Press',           externalId: '0025', sets: 4, reps: '3-5',  rest: 180 },
        { name: 'Barbell Row',           externalId: '0027', sets: 4, reps: '3-5',  rest: 180 },
        { name: 'Overhead Press',        externalId: '0097', sets: 3, reps: '5-8',  rest: 120 },
        { name: 'Lat Pulldown',          externalId: '0150', sets: 3, reps: '6-8',  rest: 90  },
        { name: 'Barbell Bicep Curl',    externalId: '0031', sets: 3, reps: '6-8',  rest: 90  },
      ]},
      { title: 'Lower Power', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 4, reps: '3-5',  rest: 180 },
        { name: 'Barbell Deadlift',      externalId: '0032', sets: 3, reps: '3-5',  rest: 180 },
        { name: 'Leg Press',             externalId: '0739', sets: 3, reps: '6-10', rest: 90  },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '6-10', rest: 90  },
      ]},
      { title: 'Upper Hypertrophy', exercises: [
        { name: 'Incline Dumbbell Press',externalId: '0314', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Cable Seated Row',      externalId: '0861', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Lateral Raise',         externalId: '0334', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Bicep Curl',   externalId: '0312', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Tricep Pushdown',       externalId: '0242', sets: 3, reps: '10-12', rest: 60 },
      ]},
      { title: 'Lower Hypertrophy', exercises: [
        { name: 'Barbell Front Squat',   externalId: '0024', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Leg Extension',         externalId: '0586', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Standing Calf Raise',   externalId: '0417', sets: 4, reps: '15-20', rest: 60 },
      ]},
    ],
  },
  {
    name: "Wendler's 5/3/1 Strength Program",
    description: 'Wave-loading progression model focused purely on increasing your 1RM on four core barbell lifts.',
    level: ProgramLevel.ADVANCED,
    days: [
      { title: 'Military Press Day', exercises: [
        { name: 'Overhead Press (5s)',    externalId: '0097', sets: 3, reps: '5/5/5+',  rest: 180 },
        { name: 'Overhead Press (BBB)',   externalId: '0097', sets: 5, reps: '10',       rest: 90  },
        { name: 'Dumbbell Lateral Raise', externalId: '0335', sets: 3, reps: '15-20',   rest: 60  },
        { name: 'Face Pull',              externalId: '0172', sets: 3, reps: '15-20',   rest: 60  },
      ]},
      { title: 'Deadlift Day', exercises: [
        { name: 'Barbell Deadlift (5s)',  externalId: '0032', sets: 3, reps: '5/5/5+',  rest: 240 },
        { name: 'Barbell Deadlift (BBB)', externalId: '0032', sets: 5, reps: '10',       rest: 120 },
        { name: 'Pull-Up',                externalId: '0652', sets: 3, reps: '6-10',    rest: 90  },
        { name: 'Hanging Leg Raise',      externalId: '0455', sets: 3, reps: '15',      rest: 60  },
      ]},
      { title: 'Bench Press Day', exercises: [
        { name: 'Bench Press (5s)',       externalId: '0025', sets: 3, reps: '5/5/5+',  rest: 180 },
        { name: 'Bench Press (BBB)',      externalId: '0025', sets: 5, reps: '10',       rest: 90  },
        { name: 'Dumbbell Row',           externalId: '0293', sets: 3, reps: '10-12',   rest: 75  },
        { name: 'Tricep Pushdown',        externalId: '0242', sets: 3, reps: '10-15',   rest: 60  },
      ]},
      { title: 'Squat Day', exercises: [
        { name: 'Barbell Back Squat (5s)',externalId: '0043', sets: 3, reps: '5/5/5+',  rest: 180 },
        { name: 'Barbell Back Squat (BBB)',externalId:'0043', sets: 5, reps: '10',       rest: 120 },
        { name: 'Leg Press',              externalId: '0739', sets: 3, reps: '10-15',   rest: 90  },
        { name: 'Lying Leg Curl',         externalId: '0394', sets: 3, reps: '10-15',   rest: 60  },
      ]},
    ],
  },
  {
    name: '4-Day Push/Pull (Upper Focus)',
    description: 'Splits by movement mechanics. Quad/calf work slots into Push; hamstring/glute into Pull. Great for upper-body development.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Push A', exercises: [
        { name: 'Barbell Back Squat',     externalId: '0043', sets: 4, reps: '6-8',   rest: 120 },
        { name: 'Bench Press',            externalId: '0025', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Incline Dumbbell Fly',   externalId: '0308', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Leg Extension',          externalId: '0586', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Overhead Tricep Ext',    externalId: '0344', sets: 3, reps: '10-12', rest: 60  },
      ]},
      { title: 'Pull A', exercises: [
        { name: 'Barbell Deadlift',       externalId: '0032', sets: 4, reps: '5',     rest: 150 },
        { name: 'Barbell Row',            externalId: '0027', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Lying Leg Curl',         externalId: '0394', sets: 3, reps: '10-12', rest: 75  },
        { name: 'Lat Pulldown',           externalId: '0150', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Bicep Curl',             externalId: '1653', sets: 3, reps: '10-15', rest: 60  },
      ]},
      { title: 'Push B', exercises: [
        { name: 'Leg Press',              externalId: '0739', sets: 4, reps: '10-12', rest: 90  },
        { name: 'Overhead Press',         externalId: '0097', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Dumbbell Lateral Raise', externalId: '0335', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Cable Crossover',        externalId: '0164', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Tricep Pushdown',        externalId: '0242', sets: 3, reps: '12-15', rest: 60  },
      ]},
      { title: 'Pull B', exercises: [
        { name: 'Pull-Up',                externalId: '0652', sets: 4, reps: '6-10',  rest: 90  },
        { name: 'Romanian Deadlift',      externalId: '0089', sets: 4, reps: '8-10',  rest: 90  },
        { name: 'Face Pull',              externalId: '0172', sets: 3, reps: '15-20', rest: 60  },
        { name: 'Cable Seated Row',       externalId: '0861', sets: 3, reps: '10-12', rest: 90  },
        { name: 'Hammer Curl',            externalId: '0298', sets: 3, reps: '10-12', rest: 60  },
      ]},
    ],
  },
  {
    name: 'Fat Loss Conditioning (HIIT & Strength)',
    description: 'High-intensity metabolic conditioning split designed to maximize fat loss, retain lean muscle, and boost cardiovascular health.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Upper Body Burn', exercises: [
        { name: 'Pull-Up',               externalId: '0652', sets: 4, reps: '10-12', rest: 60 },
        { name: 'Bench Press',           externalId: '0025', sets: 4, reps: '12-15', rest: 60 },
        { name: 'Lateral Raise',         externalId: '0334', sets: 3, reps: '15-20', rest: 45 },
        { name: 'Bicep Curl',            externalId: '1653', sets: 3, reps: '12-15', rest: 45 },
      ]},
      { title: 'Lower Body Burn', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 4, reps: '12-15', rest: 75 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 4, reps: '12-15', rest: 75 },
        { name: 'Leg Extension',         externalId: '0586', sets: 3, reps: '15-20', rest: 45 },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '15-20', rest: 45 },
      ]},
      { title: 'Full Body Conditioning', exercises: [
        { name: 'Overhead Press',        externalId: '0097', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Barbell Row',           externalId: '0027', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Bench Press',           externalId: '0025', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 3, reps: '12-15', rest: 75 },
        { name: 'Burpee',                externalId: '1160', sets: 3, reps: '10-15', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Advanced Strength & Power Split',
    description: 'Heavy resistance program focusing on raw power output, compound lift strength, and building dense muscle tissue.',
    level: ProgramLevel.ADVANCED,
    days: [
      { title: 'Push Power', exercises: [
        { name: 'Bench Press',           externalId: '0025', sets: 5, reps: '5',     rest: 120 },
        { name: 'Overhead Press',        externalId: '0097', sets: 5, reps: '5',     rest: 120 },
        { name: 'Incline Dumbbell Press',externalId: '0314', sets: 4, reps: '6-8',   rest: 90  },
        { name: 'Tricep Pushdown',       externalId: '0242', sets: 4, reps: '8-10',  rest: 75  },
      ]},
      { title: 'Pull & Legs Power', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 5, reps: '5',     rest: 150 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 5, reps: '5',     rest: 150 },
        { name: 'Pull-Up',               externalId: '0652', sets: 4, reps: '6-8',   rest: 90  },
        { name: 'Barbell Row',           externalId: '0027', sets: 4, reps: '6-8',   rest: 90  },
      ]},
      { title: 'Upper Hypertrophy', exercises: [
        { name: 'Bench Press',           externalId: '0025', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Barbell Row',           externalId: '0027', sets: 4, reps: '10-12', rest: 90 },
        { name: 'Overhead Press',        externalId: '0097', sets: 3, reps: '10-12', rest: 90 },
        { name: 'Bicep Curl',            externalId: '1653', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Tricep Pushdown',       externalId: '0242', sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Lower Hypertrophy', exercises: [
        { name: 'Barbell Back Squat',    externalId: '0043', sets: 4, reps: '10-12', rest: 100 },
        { name: 'Romanian Deadlift',     externalId: '0089', sets: 4, reps: '10-12', rest: 100 },
        { name: 'Leg Extension',         externalId: '0586', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Lying Leg Curl',        externalId: '0394', sets: 3, reps: '12-15', rest: 60  },
        { name: 'Standing Calf Raise',   externalId: '0417', sets: 3, reps: '15-20', rest: 60  },
      ]},
    ],
  },
];

// ─── Home programs data ────────────────────────────────────────────────────────
// Uses displayName lookup (from CORE_EXERCISES above)
interface HomeExercise { name: string; sets: number; reps: string; rest: number }
interface HomeDay     { title: string; exercises: HomeExercise[] }
interface HomeProgram { name: string; description: string; level: ProgramLevel; days: HomeDay[] }

const HOME_PROGRAMS: HomeProgram[] = [
  {
    name: 'Beginner Bodyweight Full Body',
    description: 'Zero equipment. Three full-body sessions using bodyweight moves to build strength, endurance, and muscle control.',
    level: ProgramLevel.BEGINNER,
    days: [
      { title: 'Full Body A', exercises: [
        { name: 'Push-Up',            sets: 3, reps: '8-12',  rest: 60 },
        { name: 'Inverted Row',       sets: 3, reps: '8-10',  rest: 60 },
        { name: 'Forward Lunge',      sets: 3, reps: '10-12', rest: 60 },
        { name: 'Crunch',             sets: 3, reps: '15-20', rest: 45 },
      ]},
      { title: 'Full Body B', exercises: [
        { name: 'Bench Dip',          sets: 3, reps: '10-15', rest: 60 },
        { name: 'Chin-Up',            sets: 3, reps: '5-8',   rest: 75 },
        { name: 'Glute Bridge',       sets: 3, reps: '15-20', rest: 45 },
        { name: 'Mountain Climber',   sets: 3, reps: '20-30', rest: 45 },
      ]},
      { title: 'Full Body C', exercises: [
        { name: 'Push-Up',            sets: 3, reps: '10-15', rest: 60 },
        { name: 'Forward Lunge',      sets: 3, reps: '12-15', rest: 60 },
        { name: 'Bodyweight Calf Raise',sets:3, reps: '20-25',rest: 45 },
        { name: 'Crunch',             sets: 3, reps: '15-20', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Bodyweight Upper/Lower Split',
    description: 'Intermediate 4-day split alternating upper and lower body focus — no equipment needed.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Upper Body A', exercises: [
        { name: 'Push-Up',            sets: 4, reps: '12-15', rest: 60 },
        { name: 'Pull-up',            sets: 4, reps: '6-10',  rest: 75 },
        { name: 'Close-Grip Push-Up', sets: 3, reps: '10-12', rest: 60 },
        { name: 'Chin-Up',            sets: 3, reps: '6-8',   rest: 75 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 45 },
      ]},
      { title: 'Lower Body A', exercises: [
        { name: 'Forward Lunge',      sets: 4, reps: '12-15', rest: 60 },
        { name: 'Glute Bridge',       sets: 4, reps: '15-20', rest: 45 },
        { name: 'Jump Squat',         sets: 3, reps: '10-15', rest: 60 },
        { name: 'Bodyweight Calf Raise',sets:3, reps: '20-30',rest: 45 },
      ]},
      { title: 'Upper Body B', exercises: [
        { name: 'Inverted Row',       sets: 4, reps: '10-12', rest: 60 },
        { name: 'Push-Up',            sets: 4, reps: '15-20', rest: 60 },
        { name: 'Bench Dip',          sets: 3, reps: '12-15', rest: 60 },
        { name: 'Mountain Climber',   sets: 3, reps: '20-30', rest: 45 },
      ]},
      { title: 'Lower Body B', exercises: [
        { name: 'Burpee',             sets: 3, reps: '10-12', rest: 75 },
        { name: 'Forward Lunge',      sets: 4, reps: '12-15', rest: 60 },
        { name: 'Glute Bridge',       sets: 4, reps: '20-25', rest: 45 },
        { name: 'Bodyweight Calf Raise',sets:3, reps: '25-30',rest: 45 },
      ]},
    ],
  },
  {
    name: 'Dumbbell Full Body Starter',
    description: 'Three full-body sessions using only dumbbells — ideal for home gym beginners with adjustable dumbbells.',
    level: ProgramLevel.BEGINNER,
    days: [
      { title: 'Full Body A', exercises: [
        { name: 'Dumbbell Bench Press',      sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Bent Over Row',    sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Goblet Squat',     sets: 3, reps: '12-15', rest: 75 },
        { name: 'Dumbbell Overhead Press',   sets: 3, reps: '10-12', rest: 60 },
      ]},
      { title: 'Full Body B', exercises: [
        { name: 'Dumbbell Romanian Deadlift',sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Fly',              sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Lunge',            sets: 3, reps: '10-12', rest: 60 },
        { name: 'Dumbbell Lateral Raise',    sets: 3, reps: '12-15', rest: 45 },
      ]},
      { title: 'Full Body C', exercises: [
        { name: 'Dumbbell Goblet Squat',     sets: 3, reps: '12-15', rest: 75 },
        { name: 'Dumbbell Bent Over Row',    sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Hammer Curl',      sets: 3, reps: '12-15', rest: 45 },
        { name: 'Dumbbell Tricep Extension', sets: 3, reps: '12-15', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Dumbbell Upper/Lower Split',
    description: '4-day dumbbell-only split. Ideal intermediate home program for balanced hypertrophy.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Upper Body A', exercises: [
        { name: 'Dumbbell Bench Press',      sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Bent Over Row',    sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Overhead Press',   sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Lateral Raise',    sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Hammer Curl',      sets: 3, reps: '12-15', rest: 45 },
      ]},
      { title: 'Lower Body A', exercises: [
        { name: 'Dumbbell Goblet Squat',     sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Romanian Deadlift',sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Lunge',            sets: 3, reps: '10-12', rest: 60 },
        { name: 'Dumbbell Step-Up',          sets: 3, reps: '10-12', rest: 60 },
      ]},
      { title: 'Upper Body B', exercises: [
        { name: 'Dumbbell Fly',              sets: 4, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Deadlift',         sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Arnold Press',     sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Tricep Extension', sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Lower Body B', exercises: [
        { name: 'Dumbbell Romanian Deadlift',sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Goblet Squat',     sets: 4, reps: '12-15', rest: 75 },
        { name: 'Glute Bridge',              sets: 4, reps: '15-20', rest: 45 },
        { name: 'Bodyweight Calf Raise',     sets: 3, reps: '20-25', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Bodyweight Push/Pull/Legs',
    description: '5-day calisthenics PPL split. Build a lean athletic physique with push, pull, and leg movement patterns — no equipment.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Push Day', exercises: [
        { name: 'Push-Up',            sets: 4, reps: '15-20', rest: 60 },
        { name: 'Close-Grip Push-Up', sets: 3, reps: '12-15', rest: 60 },
        { name: 'Bench Dip',          sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Pull Day', exercises: [
        { name: 'Pull-up',            sets: 4, reps: '6-10',  rest: 90 },
        { name: 'Chin-Up',            sets: 3, reps: '6-10',  rest: 90 },
        { name: 'Inverted Row',       sets: 3, reps: '10-15', rest: 60 },
      ]},
      { title: 'Legs Day', exercises: [
        { name: 'Jump Squat',         sets: 4, reps: '12-15', rest: 75 },
        { name: 'Forward Lunge',      sets: 4, reps: '12-15', rest: 60 },
        { name: 'Glute Bridge',       sets: 3, reps: '20-25', rest: 45 },
        { name: 'Bodyweight Calf Raise',sets:3, reps: '25-30',rest: 45 },
      ]},
      { title: 'Push Day B', exercises: [
        { name: 'Push-Up',            sets: 5, reps: '15-25', rest: 60 },
        { name: 'Bench Dip',          sets: 4, reps: '15-20', rest: 60 },
        { name: 'Mountain Climber',   sets: 3, reps: '20-30', rest: 45 },
      ]},
      { title: 'Pull Day B', exercises: [
        { name: 'Pull-up',            sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Inverted Row',       sets: 4, reps: '12-15', rest: 60 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Home Fat Burn Circuit',
    description: 'High-rep bodyweight circuit to elevate heart rate, torch calories, and build muscular endurance — no equipment.',
    level: ProgramLevel.BEGINNER,
    days: [
      { title: 'Cardio & Core Circuit', exercises: [
        { name: 'Burpee',             sets: 4, reps: '10-15', rest: 45 },
        { name: 'Mountain Climber',   sets: 4, reps: '20-30', rest: 30 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 30 },
        { name: 'Jump Squat',         sets: 3, reps: '15-20', rest: 45 },
      ]},
      { title: 'Upper Body Circuit', exercises: [
        { name: 'Push-Up',            sets: 4, reps: '15-20', rest: 45 },
        { name: 'Close-Grip Push-Up', sets: 3, reps: '12-15', rest: 45 },
        { name: 'Burpee',             sets: 3, reps: '10-12', rest: 60 },
        { name: 'Mountain Climber',   sets: 3, reps: '25-30', rest: 30 },
      ]},
      { title: 'Lower Body Circuit', exercises: [
        { name: 'Jump Squat',         sets: 4, reps: '15-20', rest: 45 },
        { name: 'Forward Lunge',      sets: 4, reps: '15-20', rest: 45 },
        { name: 'Glute Bridge',       sets: 3, reps: '20-25', rest: 30 },
        { name: 'Bodyweight Calf Raise',sets:3, reps: '25-30',rest: 30 },
      ]},
    ],
  },
  {
    name: 'Core & Strength Foundation',
    description: '4-day bodyweight program pairing core work with compound pushing and pulling. Builds strong posture and athletic base.',
    level: ProgramLevel.BEGINNER,
    days: [
      { title: 'Push & Core A', exercises: [
        { name: 'Push-Up',            sets: 3, reps: '10-15', rest: 60 },
        { name: 'Bench Dip',          sets: 3, reps: '10-12', rest: 60 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 45 },
        { name: 'Mountain Climber',   sets: 3, reps: '20-25', rest: 45 },
      ]},
      { title: 'Pull & Core A', exercises: [
        { name: 'Chin-Up',            sets: 3, reps: '5-8',   rest: 75 },
        { name: 'Inverted Row',       sets: 3, reps: '8-12',  rest: 60 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 45 },
      ]},
      { title: 'Legs & Core', exercises: [
        { name: 'Forward Lunge',      sets: 3, reps: '12-15', rest: 60 },
        { name: 'Glute Bridge',       sets: 3, reps: '15-20', rest: 45 },
        { name: 'Jump Squat',         sets: 3, reps: '10-15', rest: 60 },
        { name: 'Mountain Climber',   sets: 3, reps: '20-30', rest: 45 },
      ]},
      { title: 'Full Body Core Circuit', exercises: [
        { name: 'Burpee',             sets: 3, reps: '10-12', rest: 60 },
        { name: 'Push-Up',            sets: 3, reps: '12-15', rest: 45 },
        { name: 'Crunch',             sets: 3, reps: '20-25', rest: 45 },
        { name: 'Forward Lunge',      sets: 3, reps: '12-15', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Dumbbell PPL',
    description: '6-day dumbbell-only Push/Pull/Legs program for intermediate home lifters with adjustable dumbbells.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Push A', exercises: [
        { name: 'Dumbbell Bench Press',      sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Overhead Press',   sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Lateral Raise',    sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Tricep Extension', sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Pull A', exercises: [
        { name: 'Dumbbell Bent Over Row',    sets: 4, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Deadlift',         sets: 3, reps: '8-12',  rest: 90 },
        { name: 'Dumbbell Hammer Curl',      sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Legs A', exercises: [
        { name: 'Dumbbell Goblet Squat',     sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Romanian Deadlift',sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Lunge',            sets: 3, reps: '10-12', rest: 60 },
      ]},
      { title: 'Push B', exercises: [
        { name: 'Dumbbell Fly',              sets: 4, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Arnold Press',     sets: 3, reps: '10-12', rest: 75 },
        { name: 'Close-Grip Push-Up',        sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Lateral Raise',    sets: 3, reps: '15-20', rest: 45 },
      ]},
      { title: 'Pull B', exercises: [
        { name: 'Dumbbell Bent Over Row',    sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Hammer Curl',      sets: 4, reps: '12-15', rest: 60 },
        { name: 'Chin-Up',                   sets: 3, reps: '6-10',  rest: 90 },
      ]},
      { title: 'Legs B', exercises: [
        { name: 'Dumbbell Step-Up',          sets: 4, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Romanian Deadlift',sets: 4, reps: '10-12', rest: 90 },
        { name: 'Glute Bridge',              sets: 3, reps: '20-25', rest: 45 },
        { name: 'Bodyweight Calf Raise',     sets: 3, reps: '25-30', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Advanced Calisthenics',
    description: 'High-volume bodyweight training for advanced athletes. Raw pulling and pushing strength with explosive power.',
    level: ProgramLevel.ADVANCED,
    days: [
      { title: 'Push Strength', exercises: [
        { name: 'Push-Up',            sets: 5, reps: '20-30', rest: 60 },
        { name: 'Close-Grip Push-Up', sets: 4, reps: '15-20', rest: 60 },
        { name: 'Bench Dip',          sets: 4, reps: '20-25', rest: 60 },
        { name: 'Mountain Climber',   sets: 3, reps: '30-40', rest: 45 },
      ]},
      { title: 'Pull Strength', exercises: [
        { name: 'Pull-up',            sets: 5, reps: '10-15', rest: 90 },
        { name: 'Chin-Up',            sets: 4, reps: '10-12', rest: 90 },
        { name: 'Inverted Row',       sets: 4, reps: '15-20', rest: 60 },
      ]},
      { title: 'Legs & Explosive', exercises: [
        { name: 'Jump Squat',         sets: 5, reps: '15-20', rest: 75 },
        { name: 'Burpee',             sets: 4, reps: '15-20', rest: 60 },
        { name: 'Forward Lunge',      sets: 4, reps: '15-20', rest: 60 },
        { name: 'Glute Bridge',       sets: 4, reps: '25-30', rest: 45 },
      ]},
      { title: 'Full Body Volume', exercises: [
        { name: 'Pull-up',            sets: 4, reps: '12-15', rest: 90 },
        { name: 'Push-Up',            sets: 4, reps: '20-25', rest: 60 },
        { name: 'Jump Squat',         sets: 4, reps: '15-20', rest: 75 },
        { name: 'Burpee',             sets: 3, reps: '15-20', rest: 60 },
        { name: 'Crunch',             sets: 3, reps: '25-30', rest: 45 },
      ]},
    ],
  },
  {
    name: 'Full Home Hybrid (BW + Dumbbells)',
    description: '5-day hybrid home program combining bodyweight and dumbbell exercises. Covers strength, hypertrophy, and conditioning.',
    level: ProgramLevel.INTERMEDIATE,
    days: [
      { title: 'Push & Chest', exercises: [
        { name: 'Dumbbell Bench Press',      sets: 4, reps: '10-12', rest: 90 },
        { name: 'Push-Up',                   sets: 3, reps: '15-20', rest: 60 },
        { name: 'Dumbbell Fly',              sets: 3, reps: '12-15', rest: 60 },
        { name: 'Close-Grip Push-Up',        sets: 3, reps: '12-15', rest: 60 },
      ]},
      { title: 'Pull & Back', exercises: [
        { name: 'Pull-up',                   sets: 4, reps: '6-10',  rest: 90 },
        { name: 'Dumbbell Bent Over Row',    sets: 4, reps: '10-12', rest: 90 },
        { name: 'Inverted Row',              sets: 3, reps: '10-15', rest: 60 },
        { name: 'Dumbbell Hammer Curl',      sets: 3, reps: '12-15', rest: 45 },
      ]},
      { title: 'Legs & Glutes', exercises: [
        { name: 'Dumbbell Goblet Squat',     sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Romanian Deadlift',sets: 4, reps: '10-12', rest: 90 },
        { name: 'Dumbbell Lunge',            sets: 3, reps: '12-15', rest: 60 },
        { name: 'Glute Bridge',              sets: 3, reps: '20-25', rest: 45 },
        { name: 'Bodyweight Calf Raise',     sets: 3, reps: '20-25', rest: 45 },
      ]},
      { title: 'Shoulders & Arms', exercises: [
        { name: 'Dumbbell Overhead Press',   sets: 4, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Arnold Press',     sets: 3, reps: '10-12', rest: 75 },
        { name: 'Dumbbell Lateral Raise',    sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Hammer Curl',      sets: 3, reps: '12-15', rest: 45 },
        { name: 'Dumbbell Tricep Extension', sets: 3, reps: '12-15', rest: 45 },
      ]},
      { title: 'Full Body Conditioning', exercises: [
        { name: 'Burpee',                    sets: 3, reps: '12-15', rest: 60 },
        { name: 'Dumbbell Goblet Squat',     sets: 3, reps: '12-15', rest: 60 },
        { name: 'Push-Up',                   sets: 3, reps: '15-20', rest: 45 },
        { name: 'Mountain Climber',          sets: 3, reps: '25-30', rest: 45 },
        { name: 'Crunch',                    sets: 3, reps: '20-25', rest: 45 },
      ]},
    ],
  },
];

// ─── Foods & Recipes ───────────────────────────────────────────────────────────
const FOODS = [
  { name: 'Oats',               source: FoodSource.DATABASE, calories: 389,  protein: 16.9, carbs: 66.3, fat: 6.9,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Chicken Breast',     source: FoodSource.DATABASE, calories: 165,  protein: 31,   carbs: 0,    fat: 3.6,  servingSize: 100, servingUnit: 'g'    },
  { name: 'White Rice',         source: FoodSource.DATABASE, calories: 130,  protein: 2.7,  carbs: 28,   fat: 0.3,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Whole Egg',          source: FoodSource.DATABASE, calories: 155,  protein: 13,   carbs: 1.1,  fat: 11,   servingSize: 50,  servingUnit: 'pcs'  },
  { name: 'Banana',             source: FoodSource.DATABASE, calories: 89,   protein: 1.1,  carbs: 22.8, fat: 0.3,  servingSize: 120, servingUnit: 'pcs'  },
  { name: 'Peanut Butter',      source: FoodSource.DATABASE, calories: 588,  protein: 25,   carbs: 20,   fat: 50,   servingSize: 32,  servingUnit: 'g'    },
  { name: 'Salmon Fillet',      source: FoodSource.DATABASE, calories: 208,  protein: 20,   carbs: 0,    fat: 13,   servingSize: 100, servingUnit: 'g'    },
  { name: 'Broccoli',           source: FoodSource.DATABASE, calories: 34,   protein: 2.8,  carbs: 7,    fat: 0.4,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Avocado',            source: FoodSource.DATABASE, calories: 160,  protein: 2,    carbs: 9,    fat: 15,   servingSize: 150, servingUnit: 'pcs'  },
  { name: 'Whey Protein',       source: FoodSource.DATABASE, calories: 400,  protein: 80,   carbs: 6,    fat: 6,    servingSize: 30,  servingUnit: 'scoop'},
  { name: 'Greek Yogurt',       source: FoodSource.DATABASE, calories: 59,   protein: 10,   carbs: 3.6,  fat: 0.4,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Quinoa',             source: FoodSource.DATABASE, calories: 120,  protein: 4.4,  carbs: 21.3, fat: 1.9,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Turkey Breast',      source: FoodSource.DATABASE, calories: 135,  protein: 30,   carbs: 0,    fat: 1,    servingSize: 100, servingUnit: 'g'    },
  { name: 'Canned Tuna',        source: FoodSource.DATABASE, calories: 116,  protein: 26,   carbs: 0,    fat: 1,    servingSize: 100, servingUnit: 'g'    },
  { name: 'Ground Beef',        source: FoodSource.DATABASE, calories: 250,  protein: 26,   carbs: 0,    fat: 17,   servingSize: 100, servingUnit: 'g'    },
  { name: 'Sweet Potato',       source: FoodSource.DATABASE, calories: 86,   protein: 1.6,  carbs: 20,   fat: 0.1,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Mixed Berries',      source: FoodSource.DATABASE, calories: 57,   protein: 0.7,  carbs: 13.8, fat: 0.3,  servingSize: 100, servingUnit: 'g'    },
  { name: 'Granola',            source: FoodSource.DATABASE, calories: 489,  protein: 10,   carbs: 64,   fat: 22,   servingSize: 100, servingUnit: 'g'    },
  { name: 'Whole Wheat Tortilla',source: FoodSource.DATABASE,calories: 218,  protein: 8,    carbs: 36,   fat: 5,    servingSize: 60,  servingUnit: 'pcs'  },
  { name: 'Mixed Vegetables',   source: FoodSource.DATABASE, calories: 65,   protein: 3,    carbs: 13,   fat: 0.3,  servingSize: 100, servingUnit: 'g'    },
];

// ─── Seeding logic ────────────────────────────────────────────────────────────
export async function runSeeding(dataSource: DataSource) {
  // ── Phase 1: Clean ──────────────────────────────────────────────────────────
  console.log('Cleaning tables...');
  try { await dataSource.getRepository(PerformanceLog).createQueryBuilder().delete().execute(); } catch {}
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
  console.log('Clean complete.');

  // ── Phase 2: Muscle groups & equipment ─────────────────────────────────────
  const muscleRepo = dataSource.getRepository(MuscleGroup);
  const equipRepo  = dataSource.getRepository(Equipment);

  const muscleNames = ['chest','back','legs','shoulders','arms','core','quads','hamstrings','biceps','triceps','abs','calves'];
  const equipNames  = ['bodyweight','dumbbell','barbell','machine','cable','kettlebell','band'];

  const muscles   = Object.fromEntries((await muscleRepo.save(muscleNames.map(n => muscleRepo.create({ name: n })))).map(m => [m.name, m]));
  const equipment = Object.fromEntries((await equipRepo.save(equipNames.map(n => equipRepo.create({ name: n })))).map(e => [e.name, e]));

  const getOrCreateMuscle = async (name: string): Promise<MuscleGroup> => {
    const key = name.toLowerCase().trim();
    if (muscles[key]) return muscles[key];
    const created = await muscleRepo.save(muscleRepo.create({ name: key }));
    muscles[key] = created;
    return created;
  };

  const getOrCreateEquip = async (name: string): Promise<Equipment> => {
    const key = name.toLowerCase().trim();
    if (equipment[key]) return equipment[key];
    const created = await equipRepo.save(equipRepo.create({ name: key }));
    equipment[key] = created;
    return created;
  };

  // ── Phase 3: Core exercises ─────────────────────────────────────────────────
  console.log('Seeding exercises...');
  const exerciseRepo = dataSource.getRepository(Exercise);
  await Promise.all(CORE_EXERCISES.map(e =>
    exerciseRepo.save(exerciseRepo.create({
      name: normalizeExerciseName(e.displayName),
      displayName: e.displayName,
      muscleGroup: muscles[e.muscle],
      equipment: equipment[e.equip],
      difficulty: e.diff,
      instructions: [`Set up for ${e.displayName}`, `Perform ${e.displayName} with correct form`],
      source: ExerciseSource.INTERNAL,
      externalId: e.id,
      gifUrl: `/api/v1/exercises/image/${e.id}`,
    }))
  ));
  console.log(`Seeded ${CORE_EXERCISES.length} exercises.`);

  // Helper: get exercise by displayName (for home programs)
  const byName = async (displayName: string): Promise<string> => {
    const ex = await exerciseRepo.findOne({ where: { displayName } });
    if (!ex) throw new Error(`Exercise not found: "${displayName}"`);
    return ex.id;
  };

  // Helper: get-or-create exercise by externalId (for gym programs)
  const byExternalId = async (externalId: string, displayName: string): Promise<string> => {
    let ex = await exerciseRepo.findOne({ where: { externalId } });
    if (ex) return ex.id;
    // Guess muscle and equipment from name for on-demand creation
    const lower = displayName.toLowerCase();
    let muscleName = 'chest';
    if (lower.includes('squat') || lower.includes('lunge') || lower.includes('leg') || lower.includes('calf')) muscleName = 'legs';
    if (lower.includes('deadlift') || lower.includes('hamstring') || lower.includes('curl') && lower.includes('leg')) muscleName = 'hamstrings';
    if (lower.includes('row') || lower.includes('pulldown') || lower.includes('pull-up') || lower.includes('chin-up') || lower.includes('face pull')) muscleName = 'back';
    if (lower.includes('lateral') || lower.includes('shoulder') || lower.includes('overhead') || lower.includes('pike') || lower.includes('press') && lower.includes('military')) muscleName = 'shoulders';
    if (lower.includes('bicep') || lower.includes('curl') && !lower.includes('leg')) muscleName = 'biceps';
    if (lower.includes('tricep') || lower.includes('pushdown') || lower.includes('dip') || lower.includes('extension') && lower.includes('tri')) muscleName = 'triceps';
    if (lower.includes('plank') || lower.includes('crunch') || lower.includes('abs') || lower.includes('core')) muscleName = 'core';

    let equipName = 'barbell';
    if (lower.includes('dumbbell')) equipName = 'dumbbell';
    else if (lower.includes('cable') || lower.includes('pulldown') || lower.includes('pushdown')) equipName = 'cable';
    else if (lower.includes('pull-up') || lower.includes('chin-up') || lower.includes('dip') || lower.includes('push-up') || lower.includes('plank') || lower.includes('leg raise') || lower.includes('hanging')) equipName = 'bodyweight';
    else if (lower.includes('machine') || lower.includes('leg press') || lower.includes('leg curl') || lower.includes('extension')) equipName = 'machine';
    else if (lower.includes('band') || lower.includes('banded') || lower.includes('resistance band')) equipName = 'band';

    ex = await exerciseRepo.save(exerciseRepo.create({
      name: normalizeExerciseName(displayName),
      displayName,
      muscleGroup: await getOrCreateMuscle(muscleName),
      equipment: await getOrCreateEquip(equipName),
      difficulty: ExerciseDifficulty.BEGINNER,
      instructions: [`Perform ${displayName} with correct form`],
      source: ExerciseSource.INTERNAL,
      externalId,
      gifUrl: `/api/v1/exercises/image/${externalId}`,
    }));
    return ex.id;
  };

  // ── Phase 4: Foods ──────────────────────────────────────────────────────────
  console.log('Seeding foods...');
  const foodRepo = dataSource.getRepository(Food);
  const seededFoods = await foodRepo.save(FOODS.map(f => foodRepo.create(f)));
  const getFood = (name: string): string => {
    const f = seededFoods.find(f => f.name.toLowerCase() === name.toLowerCase());
    if (!f) throw new Error(`Food not found: "${name}"`);
    return f.id;
  };
  console.log(`Seeded ${seededFoods.length} foods.`);

  // ── Phase 5: Recipes ────────────────────────────────────────────────────────
  console.log('Seeding recipes...');
  const recipeRepo = dataSource.getRepository(Recipe);
  const ingredientRepo = dataSource.getRepository(RecipeIngredient);

  const addRecipe = async (
    data: Partial<Recipe>,
    ingredients: { food: string; amount: number; unit: string }[]
  ) => {
    const recipe = await recipeRepo.save(recipeRepo.create({ ...data, source: RecipeSource.DATABASE }));
    await ingredientRepo.save(ingredients.map(i =>
      ingredientRepo.create({ recipeId: recipe.id, foodId: getFood(i.food), amount: i.amount, unit: i.unit })
    ));
  };

  await addRecipe(
    { title: 'Banana Oatmeal Pancakes', description: 'Macro-friendly pancakes made with oats, banana, and eggs.', instructions: ['Blend oats to flour', 'Add banana and eggs, blend smooth', 'Cook on non-stick pan, flip when bubbles form'], prepTime: 5, cookTime: 10, servings: 2, calories: 403, protein: 22.1, carbs: 47.9, fat: 14.6, tags: ['Breakfast','High-Protein','Vegetarian'] },
    [{ food: 'Oats', amount: 1.0, unit: '100g' }, { food: 'Whole Egg', amount: 2.0, unit: 'pcs' }, { food: 'Banana', amount: 1.0, unit: 'pcs' }]
  );
  await addRecipe(
    { title: 'Healthy Chicken & Rice Bowl', description: 'Grilled chicken breast with steamed rice and broccoli — the gym classic.', instructions: ['Season and grill chicken 6-8 min per side', 'Steam broccoli 3-5 min', 'Assemble bowl with rice base'], prepTime: 10, cookTime: 15, servings: 1, calories: 641, protein: 71.6, carbs: 66.5, fat: 8.4, tags: ['Lunch','Dinner','High-Protein','Low-Fat'] },
    [{ food: 'Chicken Breast', amount: 2.0, unit: '100g' }, { food: 'White Rice', amount: 2.0, unit: '100g' }, { food: 'Broccoli', amount: 1.5, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Greek Yogurt Parfait', description: 'Creamy yogurt layered with berries and crunchy granola. Ready in 5 minutes.', instructions: ['Layer yogurt in a glass', 'Add berries on top', 'Sprinkle granola and serve'], prepTime: 5, cookTime: 0, servings: 1, calories: 322, protein: 27.7, carbs: 36.8, fat: 7.2, tags: ['Breakfast','High-Protein','Quick','No-Cook'] },
    [{ food: 'Greek Yogurt', amount: 2.0, unit: '100g' }, { food: 'Mixed Berries', amount: 0.5, unit: '100g' }, { food: 'Granola', amount: 0.3, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Salmon & Quinoa Bowl', description: 'Omega-3-rich pan-seared salmon over fluffy quinoa with steamed broccoli.', instructions: ['Cook quinoa 15 min', 'Season and sear salmon 4 min per side', 'Steam broccoli, assemble bowl'], prepTime: 10, cookTime: 20, servings: 1, calories: 518, protein: 42.4, carbs: 42.6, fat: 14.3, tags: ['Lunch','Dinner','Omega-3','High-Protein','Gluten-Free'] },
    [{ food: 'Salmon Fillet', amount: 1.5, unit: '100g' }, { food: 'Quinoa', amount: 1.5, unit: '100g' }, { food: 'Broccoli', amount: 1.0, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Protein Banana Smoothie', description: 'Post-workout shake — banana, whey, and oats blended smooth. 35g protein.', instructions: ['Add all ingredients to blender', 'Blend on high 30-45 seconds', 'Drink immediately'], prepTime: 3, cookTime: 0, servings: 1, calories: 398, protein: 35.1, carbs: 52.3, fat: 4.8, tags: ['Breakfast','Post-Workout','High-Protein','Quick'] },
    [{ food: 'Banana', amount: 1.0, unit: 'pcs' }, { food: 'Whey Protein', amount: 1.0, unit: 'scoop' }, { food: 'Oats', amount: 0.4, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Turkey & Veggie Stir-Fry', description: 'Lean ground turkey with mixed vegetables. Low-carb, 45g protein, done in 20 min.', instructions: ['Brown turkey in hot pan', 'Add vegetables, stir-fry 5-7 min', 'Season with soy sauce and garlic'], prepTime: 5, cookTime: 15, servings: 1, calories: 418, protein: 45.0, carbs: 13.0, fat: 17.3, tags: ['Dinner','Low-Carb','High-Protein'] },
    [{ food: 'Turkey Breast', amount: 1.5, unit: '100g' }, { food: 'Mixed Vegetables', amount: 1.5, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Avocado Toast with Eggs', description: 'Mashed avocado on whole-grain toast with two fried eggs. Healthy fats and protein.', instructions: ['Mash avocado with salt and lime', 'Toast bread', 'Fry eggs to liking, assemble'], prepTime: 5, cookTime: 5, servings: 1, calories: 485, protein: 24.1, carbs: 18.9, fat: 34.7, tags: ['Breakfast','Healthy-Fats','Vegetarian'] },
    [{ food: 'Avocado', amount: 1.0, unit: 'pcs' }, { food: 'Whole Egg', amount: 2.0, unit: 'pcs' }]
  );
  await addRecipe(
    { title: 'Tuna Salad Wrap', description: 'Canned tuna with lemon in a whole-wheat tortilla. Fast, 38g protein lunch.', instructions: ['Drain tuna, mix with lemon and pepper', 'Lay on tortilla, roll tightly'], prepTime: 5, cookTime: 0, servings: 1, calories: 388, protein: 37.8, carbs: 36.0, fat: 6.0, tags: ['Lunch','High-Protein','Quick','No-Cook'] },
    [{ food: 'Canned Tuna', amount: 1.5, unit: '100g' }, { food: 'Whole Wheat Tortilla', amount: 1.0, unit: 'pcs' }]
  );
  await addRecipe(
    { title: 'Beef & Sweet Potato Bowl', description: 'Seasoned ground beef over roasted sweet potato. Bulking-friendly with 40g protein.', instructions: ['Roast sweet potato cubes at 200°C for 25 min', 'Brown beef with cumin and paprika', 'Serve beef over sweet potato'], prepTime: 10, cookTime: 25, servings: 1, calories: 586, protein: 39.6, carbs: 40.0, fat: 17.0, tags: ['Dinner','High-Protein','High-Carb','Bulking'] },
    [{ food: 'Ground Beef', amount: 1.5, unit: '100g' }, { food: 'Sweet Potato', amount: 2.0, unit: '100g' }]
  );
  await addRecipe(
    { title: 'Overnight Oats', description: 'Prep-ahead breakfast: oats soaked with yogurt and banana. Ready straight from the fridge.', instructions: ['Mix oats, yogurt, and protein powder in a jar', 'Slice banana on top', 'Refrigerate overnight (6+ hours)'], prepTime: 5, cookTime: 0, servings: 1, calories: 414, protein: 37.4, carbs: 52.1, fat: 5.6, tags: ['Breakfast','Meal-Prep','High-Protein','No-Cook'] },
    [{ food: 'Oats', amount: 0.8, unit: '100g' }, { food: 'Greek Yogurt', amount: 1.0, unit: '100g' }, { food: 'Whey Protein', amount: 1.0, unit: 'scoop' }, { food: 'Banana', amount: 1.0, unit: 'pcs' }]
  );
  console.log('Seeded 10 recipes.');

  // ── Phase 6: Gym programs ───────────────────────────────────────────────────
  console.log('Seeding gym programs...');
  const programRepo = dataSource.getRepository(Program);
  const dayRepo     = dataSource.getRepository(ProgramDay);
  const pdeRepo     = dataSource.getRepository(ProgramDayExercise);

  for (const prog of GYM_PROGRAMS) {
    const saved = await programRepo.save(programRepo.create({ name: prog.name, description: prog.description, level: prog.level }));
    for (let di = 0; di < prog.days.length; di++) {
      const d = prog.days[di];
      const savedDay = await dayRepo.save(dayRepo.create({ programId: saved.id, dayNumber: di + 1, title: d.title }));
      for (let ei = 0; ei < d.exercises.length; ei++) {
        const e = d.exercises[ei];
        const exerciseId = await byExternalId(e.externalId, e.name);
        await pdeRepo.save(pdeRepo.create({ programDayId: savedDay.id, exerciseId, order: ei + 1, targetSets: e.sets, targetRepsRange: e.reps, targetRestTime: e.rest }));
      }
    }
    console.log(`  ✓ ${prog.name}`);
  }

  // ── Phase 7: Home programs ──────────────────────────────────────────────────
  console.log('Seeding home programs...');
  for (const prog of HOME_PROGRAMS) {
    const saved = await programRepo.save(programRepo.create({ name: prog.name, description: prog.description, level: prog.level }));
    for (let di = 0; di < prog.days.length; di++) {
      const d = prog.days[di];
      const savedDay = await dayRepo.save(dayRepo.create({ programId: saved.id, dayNumber: di + 1, title: d.title }));
      for (let ei = 0; ei < d.exercises.length; ei++) {
        const e = d.exercises[ei];
        const exerciseId = await byName(e.name);
        await pdeRepo.save(pdeRepo.create({ programDayId: savedDay.id, exerciseId, order: ei + 1, targetSets: e.sets, targetRepsRange: e.reps, targetRestTime: e.rest }));
      }
    }
    console.log(`  ✓ ${prog.name}`);
  }

  console.log('\nSeeding complete:');
  console.log(`  ${CORE_EXERCISES.length} exercises`);
  console.log(`  ${FOODS.length} foods`);
  console.log('  10 recipes');
  console.log(`  ${GYM_PROGRAMS.length} gym programs`);
  console.log(`  ${HOME_PROGRAMS.length} home programs`);
}

async function seed() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();
  await AppDataSource.synchronize(true);
  await runSeeding(AppDataSource);
  await AppDataSource.destroy();
}

if (require.main === module) {
  seed().catch(err => { console.error(err); process.exit(1); });
}
