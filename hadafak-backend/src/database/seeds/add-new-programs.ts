import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { ExternalSyncService } from '../../modules/exercises/external-sync.service';
import { Program, ProgramLevel } from '../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../modules/programs/entities/program-day-exercise.entity';
import { Exercise, ExerciseDifficulty, ExerciseSource } from '../../modules/exercises/entities/exercise.entity';
import { MuscleGroup } from '../../modules/exercises/entities/muscle-group.entity';
import { Equipment } from '../../modules/exercises/entities/equipment.entity';
import { normalizeExerciseName } from '../../modules/exercises/utils/normalize';

const workoutPlans = [
  {
    "id": "push-pull-legs-6day",
    "name": "6-Day Push/Pull/Legs (PPL)",
    "experience_level": "Intermediate to Advanced",
    "days_per_week": 6,
    "objective": "Hypertrophy & Strength",
    "description": "A highly effective high-frequency split targeting specific muscle groups twice a week for maximum muscle growth.",
    "schedule": ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest"],
    "routine": [
      {
        "day": "Day 1: Push A (Chest, Shoulders, Triceps)",
        "exercises": [
          {"name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "rest_seconds": 120},
          {"name": "Overhead Press (OHP)", "sets": 3, "reps": "8-10", "rest_seconds": 90},
          {"name": "Incline Dumbbell Flyes", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Lateral Raises", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Tricep Rope Pushdowns", "sets": 3, "reps": "10-12", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 2: Pull A (Back, Biceps, Rear Delts)",
        "exercises": [
          {"name": "Conventional Deadlift", "sets": 3, "reps": "5", "rest_seconds": 150},
          {"name": "Lat Pulldowns", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Seated Cable Rows", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Face Pulls", "sets": 4, "reps": "15-20", "rest_seconds": 60},
          {"name": "Barbell Bicep Curls", "sets": 3, "reps": "10-12", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 3: Legs A (Quads, Hamstrings, Calves)",
        "exercises": [
          {"name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "rest_seconds": 120},
          {"name": "Romanian Deadlift (RDL)", "sets": 3, "reps": "8-10", "rest_seconds": 90},
          {"name": "Leg Press", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Leg Curls", "sets": 3, "reps": "12-15", "rest_seconds": 60},
          {"name": "Standing Calf Raises", "sets": 4, "reps": "15-20", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "upper-lower-4day",
    "name": "4-Day Upper/Lower Split",
    "experience_level": "Beginner to Intermediate",
    "days_per_week": 4,
    "objective": "Balanced Hypertrophy & Recovery",
    "description": "Hits each muscle group twice weekly while allowing 3 full rest days, optimizing recovery and consistent progression.",
    "schedule": ["Upper A", "Lower A", "Rest", "Upper B", "Lower B", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Upper A",
        "exercises": [
          {"name": "Incline Dumbbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Bent-Over Barbell Rows", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Dumbbell Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Pull-Ups / Chin-Ups", "sets": 3, "reps": "Max", "rest_seconds": 90},
          {"name": "Incline Dumbbell Curls", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Tricep Overhead Extension", "sets": 3, "reps": "10-12", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 2: Lower A",
        "exercises": [
          {"name": "Barbell Back Squat", "sets": 4, "reps": "6-8", "rest_seconds": 120},
          {"name": "Romanian Deadlift", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Walking Lunges", "sets": 3, "reps": "12 per leg", "rest_seconds": 60},
          {"name": "Seated Calf Raises", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Hanging Leg Raises", "sets": 3, "reps": "15", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "full-body-3day",
    "name": "3-Day Classic Full Body",
    "experience_level": "Beginner",
    "days_per_week": 3,
    "objective": "Foundation Building & Fat Loss",
    "description": "Perfect for beginners or busy individuals. Focuses on heavy compound movements to maximize energy expenditure and master core lifts.",
    "schedule": ["Full Body A", "Rest", "Full Body B", "Rest", "Full Body C", "Rest", "Rest"],
    "routine": [
      {
        "day": "Full Body A (Sample Day)",
        "exercises": [
          {"name": "Barbell Back Squat", "sets": 3, "reps": "8-10", "rest_seconds": 90},
          {"name": "Flat Barbell Bench Press", "sets": 3, "reps": "8-10", "rest_seconds": 90},
          {"name": "Lat Pulldowns", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Dumbbell Lateral Raises", "sets": 3, "reps": "12-15", "rest_seconds": 60},
          {"name": "Plank", "sets": 3, "reps": "60 seconds", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "arnold-split-6day",
    "name": "6-Day Arnold Split",
    "experience_level": "Advanced",
    "days_per_week": 6,
    "objective": "Maximum Hypertrophy & Aesthetic Proportions",
    "description": "Popularized by Arnold Schwarzenegger. Pairs opposing muscle groups (Chest/Back) for intense pumps and high volume.",
    "schedule": ["Chest & Back", "Shoulders & Arms", "Legs", "Chest & Back", "Shoulders & Arms", "Legs", "Rest"],
    "routine": [
      {
        "day": "Day 1: Chest & Back",
        "exercises": [
          {"name": "Flat Barbell Bench Press", "sets": 4, "reps": "8", "rest_seconds": 90},
          {"name": "Incline Dumbbell Press", "sets": 4, "reps": "10", "rest_seconds": 90},
          {"name": "Wide-Grip Pull-ups", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "T-Bar Row", "sets": 4, "reps": "10", "rest_seconds": 90},
          {"name": "Dumbbell Pullovers", "sets": 3, "reps": "12", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "bro-split-5day",
    "name": "5-Day Traditional 'Bro' Split",
    "experience_level": "Intermediate",
    "days_per_week": 5,
    "objective": "Targeted Hypertrophy & Muscle Isolation",
    "description": "Dedicates an entire training session to a single major muscle group, allowing for extreme volume and complete isolation.",
    "schedule": ["Chest", "Back", "Shoulders", "Legs", "Arms", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Chest Day",
        "exercises": [
          {"name": "Barbell Bench Press", "sets": 4, "reps": "8-12", "rest_seconds": 90},
          {"name": "Incline Barbell Press", "sets": 3, "reps": "8-12", "rest_seconds": 90},
          {"name": "Decline Dumbbell Press", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Cable Crossovers", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Push-ups to Failure", "sets": 3, "reps": "Max", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "phul-4day",
    "name": "PHUL (Power Hypertrophy Upper Lower)",
    "experience_level": "Intermediate to Advanced",
    "days_per_week": 4,
    "objective": "Blended Strength and Size",
    "description": "Combines powerlifting elements (low reps, high weight) with bodybuilding principles (high reps, isolation) across a 4-day split.",
    "schedule": ["Upper Power", "Lower Power", "Rest", "Upper Hypertrophy", "Lower Hypertrophy", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Upper Power",
        "exercises": [
          {"name": "Barbell Bench Press", "sets": 4, "reps": "3-5", "rest_seconds": 180},
          {"name": "Barbell Row", "sets": 4, "reps": "3-5", "rest_seconds": 180},
          {"name": "Overhead Press", "sets": 3, "reps": "5-8", "rest_seconds": 120},
          {"name": "Lat Pulldown", "sets": 3, "reps": "6-8", "rest_seconds": 90},
          {"name": "Barbell Curl", "sets": 3, "reps": "6-8", "rest_seconds": 90}
        ]
      }
    ]
  },
  {
    "id": "531-powerlifting",
    "name": "Wendler's 5/3/1 Strength Program",
    "experience_level": "Intermediate to Advanced",
    "days_per_week": 4,
    "objective": "Raw Core Compound Strength",
    "description": "A world-renowned wave-loading progression model focused purely on increasing your 1-Rep Max on the four core lifts.",
    "schedule": ["Military Press Day", "Deadlift Day", "Rest", "Bench Press Day", "Squat Day", "Rest", "Rest"],
    "routine": [
      {
        "day": "Core Lift Progression (Applies to main exercise)",
        "exercises": [
          {"name": "Week 1: Warmup + Main Lift", "sets": 3, "reps": "5 / 5 / 5+", "rest_seconds": 180},
          {"name": "Week 2: Warmup + Main Lift", "sets": 3, "reps": "3 / 3 / 3+", "rest_seconds": 180},
          {"name": "Week 3: Warmup + Main Lift", "sets": 3, "reps": "5 / 3 / 1+", "rest_seconds": 240},
          {"name": "Boring But Big (BBB) Accessory", "sets": 5, "reps": "10", "rest_seconds": 90}
        ]
      }
    ]
  },
  {
    "id": "push-pull-4day",
    "name": "4-Day Push/Pull (No Dedicated Leg Day Split)",
    "experience_level": "Intermediate",
    "days_per_week": 4,
    "objective": "Athletic Functionality & Upper-Body Focus",
    "description": "Splits the body strictly by movement mechanics (pushing vs pulling). Quads/Calves go to Push day; Hamstrings/Glutes go to Pull day.",
    "schedule": ["Push A", "Pull A", "Rest", "Push B", "Pull B", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Push A",
        "exercises": [
          {"name": "Barbell Squat", "sets": 4, "reps": "6-8", "rest_seconds": 120},
          {"name": "Flat Dumbbell Press", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Incline Dumbbell Flyes", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Leg Extensions", "sets": 3, "reps": "12-15", "rest_seconds": 60},
          {"name": "Standing Overhead Tricep Extension", "sets": 3, "reps": "10-12", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "calisthenics-weighted-4day",
    "name": "4-Day Hybrid Calisthenics & Weighted Gym Plan",
    "experience_level": "Intermediate",
    "days_per_week": 4,
    "objective": "Relative Strength & Gymnastic Control",
    "description": "Blends heavy bodyweight movements with gym weight infrastructure for extreme functional core strength and control.",
    "schedule": ["Push (Calisthenics Focused)", "Pull (Calisthenics Focused)", "Rest", "Legs (Gym Weights)", "Core & Mobility", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Push (Calisthenics Focus)",
        "exercises": [
          {"name": "Weighted Dips", "sets": 4, "reps": "6-8", "rest_seconds": 120},
          {"name": "Pike Push-ups (or Handstand Push-up progressions)", "sets": 3, "reps": "8-10", "rest_seconds": 90},
          {"name": "Ring Push-ups (Deficit)", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Decline Diamond Push-ups", "sets": 3, "reps": "12-15", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "upper-lower-arms-5day",
    "name": "5-Day Upper/Lower + Arm Day Split",
    "experience_level": "Intermediate",
    "days_per_week": 5,
    "objective": "Arm Hypertrophy Accentuation",
    "description": "Standard Upper/Lower baseline cadence but reserves a highly focused fifth day explicitly for biceps, triceps, and forearms.",
    "schedule": ["Upper", "Lower", "Rest", "Upper", "Lower", "Arms Focus", "Rest"],
    "routine": [
      {
        "day": "Day 5: Dedicated Arm Day",
        "exercises": [
          {"name": "Close-Grip Bench Press", "sets": 4, "reps": "6-8", "rest_seconds": 90},
          {"name": "EZ-Bar Preacher Curls", "sets": 4, "reps": "8-10", "rest_seconds": 90},
          {"name": "Tricep Overhead Cable Extensions", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Incline Hammer Curls", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Reverse Barbell Wrist Curls", "sets": 3, "reps": "15", "rest_seconds": 45}
        ]
      }
    ]
  },
  {
    "id": "bodyweight-fullbody-3day-complete",
    "name": "3-Day Classic Bodyweight Full Body Complete",
    "experience_level": "Beginner to Intermediate",
    "days_per_week": 3,
    "objective": "General Fitness & Muscle Conditioning",
    "description": "A fully realized zero-equipment macro-cycle. It rotates distinct movement profiles across three full-body training days to prevent adaptive plateaus and joint fatigue.",
    "schedule": ["Full Body A", "Rest", "Full Body B", "Rest", "Full Body C", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Full Body A",
        "exercises": [
          {"name": "Standard Bodyweight Squats", "sets": 3, "reps": "15-20", "rest_seconds": 60},
          {"name": "Standard Push-ups (or Incline)", "sets": 3, "reps": "10-15", "rest_seconds": 60},
          {"name": "Doorframe or Sturdy Table Rows", "sets": 3, "reps": "8-12", "rest_seconds": 60},
          {"name": "Glute Bridges", "sets": 3, "reps": "15", "rest_seconds": 45},
          {"name": "Forearm Plank Hold", "sets": 3, "reps": "30-60 sec", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 2: Full Body B",
        "exercises": [
          {"name": "Bodyweight Romanian Deadlifts (Single-Leg)", "sets": 3, "reps": "10-12 per leg", "rest_seconds": 60},
          {"name": "Pike Push-ups (Shoulder Focus)", "sets": 3, "reps": "8-12", "rest_seconds": 60},
          {"name": "Towel Lat Pulldowns (Isometric Floor Pull)", "sets": 3, "reps": "12-15", "rest_seconds": 45},
          {"name": "Single-Leg Calf Raises", "sets": 4, "reps": "15-20", "rest_seconds": 45},
          {"name": "Bicycle Crunches", "sets": 3, "reps": "20 total", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 3: Full Body C",
        "exercises": [
          {"name": "Walking Lunges", "sets": 3, "reps": "12 per leg", "rest_seconds": 60},
          {"name": "Diamond Push-ups (Tricep Focus) or Bench Dips", "sets": 3, "reps": "8-12", "rest_seconds": 60},
          {"name": "Prone 'YWT' Hyper-Extensions (Posterior Chain)", "sets": 3, "reps": "12", "rest_seconds": 45},
          {"name": "Mountain Climbers", "sets": 3, "reps": "45 sec work", "rest_seconds": 45},
          {"name": "Side Planks", "sets": 3, "reps": "30 sec per side", "rest_seconds": 45}
        ]
      }
    ]
  },
  {
    "id": "dumbbells-only-ppl-6day-complete",
    "name": "6-Day Dumbbell-Only Push/Pull/Legs Complete",
    "experience_level": "Intermediate",
    "days_per_week": 6,
    "objective": "Hypertrophy & Home Muscle Building",
    "description": "A comprehensive 6-day cycle requiring only adjustable dumbbells and a flat surface/bench. Uses unique A and B sessions to cover all muscle targets efficiently.",
    "schedule": ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B", "Rest"],
    "routine": [
      {
        "day": "Day 1: Push A",
        "exercises": [
          {"name": "Dumbbell Floor Press", "sets": 4, "reps": "10-12", "rest_seconds": 90},
          {"name": "Dumbbell Overhead Press", "sets": 3, "reps": "10-12", "rest_seconds": 90},
          {"name": "Dumbbell Lateral Raises", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Overhead Dumbbell Tricep Extension", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Dumbbell Floor Flyes", "sets": 3, "reps": "12", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 2: Pull A",
        "exercises": [
          {"name": "Two-Arm Dumbbell Row (Bent Over)", "sets": 4, "reps": "8-12", "rest_seconds": 90},
          {"name": "Dumbbell Pullovers (Floor/Bench)", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Dumbbell Bicep Curls", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Dumbbell Rear Delt Flyes (Bent Over)", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Dumbbell Shrugs", "sets": 3, "reps": "12-15", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 3: Legs A",
        "exercises": [
          {"name": "Dumbbell Goblet Squats", "sets": 4, "reps": "10-12", "rest_seconds": 90},
          {"name": "Dumbbell Romanian Deadlifts", "sets": 4, "reps": "10-12", "rest_seconds": 90},
          {"name": "Dumbbell Bulgarian Split Squats", "sets": 3, "reps": "8-10 per leg", "rest_seconds": 90},
          {"name": "Dumbbell Standing Calf Raises", "sets": 4, "reps": "15-20", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 4: Push B",
        "exercises": [
          {"name": "Dumbbell Deficit Push-Ups (Hands on DB handles)", "sets": 4, "reps": "Max / 12-15", "rest_seconds": 90},
          {"name": "Dumbbell Arnold Press", "sets": 3, "reps": "10", "rest_seconds": 90},
          {"name": "Dumbbell Front Raises", "sets": 3, "reps": "12", "rest_seconds": 60},
          {"name": "Dumbbell Kickbacks", "sets": 3, "reps": "12", "rest_seconds": 60},
          {"name": "Close-Grip Dumbbell Floor Press", "sets": 3, "reps": "10-12", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 5: Pull B",
        "exercises": [
          {"name": "Single-Arm Dumbbell Rows", "sets": 4, "reps": "10 per arm", "rest_seconds": 60},
          {"name": "Dumbbell Hammer Curls", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Dumbbell Inverted Face-Pulls (Lying on floor pull)", "sets": 3, "reps": "12-15", "rest_seconds": 60},
          {"name": "Concentration Curls", "sets": 3, "reps": "12 per arm", "rest_seconds": 60},
          {"name": "Dumbbell Farmer's Walks", "sets": 3, "reps": "60 seconds", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 6: Legs B",
        "exercises": [
          {"name": "Dumbbell Dumbbell Lunges (Reverse)", "sets": 3, "reps": "10 per leg", "rest_seconds": 60},
          {"name": "Dumbbell Sumo Squats", "sets": 4, "reps": "12", "rest_seconds": 90},
          {"name": "Single-Leg Dumbbell Glute Bridges", "sets": 3, "reps": "12 per leg", "rest_seconds": 60},
          {"name": "Dumbbell Weighted Russian Twists", "sets": 3, "reps": "20 total", "rest_seconds": 45},
          {"name": "Hanging Leg Raises (If home bar available) or Reverse Crunches", "sets": 3, "reps": "15", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "hiit-fatloss-4day-complete",
    "name": "4-Day High-Intensity Interval Training (HIIT) Complete",
    "experience_level": "Intermediate",
    "days_per_week": 4,
    "objective": "Cardiovascular Endurance & Fat Loss",
    "description": "A high-octane conditioning routine requiring zero equipment. Uses interval timers to spike your heart rate and maximize post-exercise oxygen consumption.",
    "schedule": ["HIIT Cardio", "Core & Lower", "Rest", "HIIT Upper Focus", "Full Body Circuit", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: HIIT Cardio Interval",
        "exercises": [
          {"name": "Burpees", "sets": 4, "reps": "45s/15s", "rest_seconds": 60},
          {"name": "Mountain Climbers", "sets": 4, "reps": "45s/15s", "rest_seconds": 60},
          {"name": "Jump Squats", "sets": 4, "reps": "45s/15s", "rest_seconds": 60},
          {"name": "High Knees", "sets": 4, "reps": "45s/15s", "rest_seconds": 60},
          {"name": "Plank Jacks", "sets": 4, "reps": "45s/15s", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 2: Core & Lower Conditioning",
        "exercises": [
          {"name": "Bodyweight Sumo Squats", "sets": 3, "reps": "20", "rest_seconds": 45},
          {"name": "Flutter Kicks", "sets": 3, "reps": "45s", "rest_seconds": 45},
          {"name": "Reverse Lunges", "sets": 3, "reps": "15/leg", "rest_seconds": 45},
          {"name": "Russian Twists", "sets": 3, "reps": "30", "rest_seconds": 30},
          {"name": "Glute Bridge Marches", "sets": 3, "reps": "16", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 3: HIIT Upper Focus",
        "exercises": [
          {"name": "Plyometric Push-ups (or explosive push-ups)", "sets": 4, "reps": "30s/30s", "rest_seconds": 60},
          {"name": "Bear Crawls", "sets": 4, "reps": "45s", "rest_seconds": 60},
          {"name": "Pike Push-ups", "sets": 3, "reps": "10-12", "rest_seconds": 45},
          {"name": "Tricep Dips on Chair", "sets": 3, "reps": "15", "rest_seconds": 45},
          {"name": "Commando Planks (Plank up-downs)", "sets": 3, "reps": "12", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 4: Full Body Circuit",
        "exercises": [
          {"name": "Skaters (Lateral Jumps)", "sets": 4, "reps": "45s", "rest_seconds": 45},
          {"name": "Inchworms with Push-up", "sets": 4, "reps": "10", "rest_seconds": 60},
          {"name": "Bicycle Crunches", "sets": 4, "reps": "45s", "rest_seconds": 45},
          {"name": "Tuck Jumps or Power Jacks", "sets": 4, "reps": "30s", "rest_seconds": 60}
        ]
      }
    ]
  },
  {
    "id": "resistance-bands-4day-complete",
    "name": "4-Day Full-Body Resistance Band Split Complete",
    "experience_level": "Beginner to Intermediate",
    "days_per_week": 4,
    "objective": "Hypertrophy & Constant Tension",
    "description": "Utilizes loop or anchorable tube resistance bands to maintain tension throughout entire structural movement pathways.",
    "schedule": ["Upper A", "Lower A", "Rest", "Upper B", "Lower B", "Rest", "Rest"],
    "routine": [
      {
        "day": "Day 1: Upper A",
        "exercises": [
          {"name": "Banded Anchored Chest Press", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Banded Seated Rows (Feet braced)", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Banded Overhead Shoulder Press", "sets": 3, "reps": "10-12", "rest_seconds": 60},
          {"name": "Banded Face Pulls", "sets": 3, "reps": "15-20", "rest_seconds": 45},
          {"name": "Banded Bicep Curls (Standing on band)", "sets": 3, "reps": "15", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 2: Lower A",
        "exercises": [
          {"name": "Banded Front Squats (Band looped under feet and over shoulders)", "sets": 4, "reps": "12-15", "rest_seconds": 90},
          {"name": "Banded Pull-Throughs (Anchored low posterior pull)", "sets": 4, "reps": "15", "rest_seconds": 60},
          {"name": "Banded Lateral Crab Walks", "sets": 3, "reps": "15/side", "rest_seconds": 45},
          {"name": "Standing Banded Calf Raises", "sets": 4, "reps": "20", "rest_seconds": 45},
          {"name": "Banded Pallof Press (Anti-rotation core hold)", "sets": 3, "reps": "12/side", "rest_seconds": 45}
        ]
      },
      {
        "day": "Day 3: Upper B",
        "exercises": [
          {"name": "Banded Lat Pulldowns (High anchor setup)", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Banded Upward Chest Flyes", "sets": 3, "reps": "12-15", "rest_seconds": 60},
          {"name": "Banded Pull-Aparts (Rear delt focus)", "sets": 4, "reps": "20", "rest_seconds": 45},
          {"name": "Banded Tricep Overhead Extensions", "sets": 3, "reps": "12-15", "rest_seconds": 45},
          {"name": "Banded Push-ups (Band slung across back)", "sets": 3, "reps": "Max", "rest_seconds": 60}
        ]
      },
      {
        "day": "Day 4: Lower B",
        "exercises": [
          {"name": "Banded Romanian Deadlifts", "sets": 4, "reps": "12-15", "rest_seconds": 60},
          {"name": "Banded Lying Leg Curls (Anchored to heavy door/post)", "sets": 4, "reps": "12", "rest_seconds": 60},
          {"name": "Banded Donkey Kicks", "sets": 3, "reps": "15/side", "rest_seconds": 45},
          {"name": "Banded Glute Bridges (Band across hips)", "sets": 4, "reps": "20", "rest_seconds": 45},
          {"name": "Banded Kneeling Ab Crunches", "sets": 3, "reps": "15-20", "rest_seconds": 45}
        ]
      }
    ]
  }
];

const exerciseDbIdMap: Record<string, string> = {
  // Bodyweight Full Body exercises
  "Standard Bodyweight Squats": "1510",
  "Standard Push-ups (or Incline)": "0662",
  "Doorframe or Sturdy Table Rows": "0497",
  "Glute Bridges": "0483",
  "Forearm Plank Hold": "0486",
  "Bodyweight Romanian Deadlifts (Single-Leg)": "1440",
  "Pike Push-ups (Shoulder Focus)": "0627",
  "Towel Lat Pulldowns (Isometric Floor Pull)": "0150",
  "Single-Leg Calf Raises": "0409",
  "Bicycle Crunches": "0112",
  "Walking Lunges": "1460",
  "Diamond Push-ups (Tricep Focus) or Bench Dips": "0262",
  "Prone 'YWT' Hyper-Extensions (Posterior Chain)": "1314",
  "Mountain Climbers": "0630",
  "Side Planks": "3544",

  // Dumbbells-only exercises
  "Dumbbell Floor Press": "0289",
  "Dumbbell Overhead Press": "0405",
  "Dumbbell Lateral Raises": "0334",
  "Overhead Dumbbell Tricep Extension": "0344",
  "Dumbbell Floor Flyes": "0308",
  "Two-Arm Dumbbell Row (Bent Over)": "0293",
  "Dumbbell Pullovers (Floor/Bench)": "0382",
  "Dumbbell Bicep Curls": "0312",
  "Dumbbell Rear Delt Flyes (Bent Over)": "0373",
  "Dumbbell Shrugs": "0406",
  "Dumbbell Goblet Squats": "1760",
  "Dumbbell Romanian Deadlifts": "0376",
  "Dumbbell Bulgarian Split Squats": "2133",
  "Dumbbell Standing Calf Raises": "0417",
  "Dumbbell Deficit Push-Ups (Hands on DB handles)": "0662",
  "Dumbbell Arnold Press": "2137",
  "Dumbbell Front Raises": "0310",
  "Dumbbell Kickbacks": "0333",
  "Close-Grip Dumbbell Floor Press": "0289",
  "Single-Arm Dumbbell Rows": "0293",
  "Dumbbell Hammer Curls": "0313",
  "Dumbbell Inverted Face-Pulls (Lying on floor pull)": "0172",
  "Concentration Curls": "0297",
  "Dumbbell Farmer's Walks": "2133",
  "Dumbbell Dumbbell Lunges (Reverse)": "0381",
  "Dumbbell Sumo Squats": "1760",
  "Single-Leg Dumbbell Glute Bridges": "0483",
  "Dumbbell Weighted Russian Twists": "0846",
  "Hanging Leg Raises (If home bar available) or Reverse Crunches": "0455",

  // HIIT Fat Loss exercises
  "Burpees": "1160",
  "Jump Squats": "0514",
  "High Knees": "3655",
  "Plank Jacks": "0486",
  "Bodyweight Sumo Squats": "1460",
  "Flutter Kicks": "0459",
  "Reverse Lunges": "0381",
  "Russian Twists": "0687",
  "Glute Bridge Marches": "1409",
  "Plyometric Push-ups (or explosive push-ups)": "0662",
  "Bear Crawls": "3360",
  "Pike Push-ups": "0627",
  "Tricep Dips on Chair": "0129",
  "Commando Planks (Plank up-downs)": "0486",
  "Skaters (Lateral Jumps)": "3361",
  "Inchworms with Push-up": "1471",
  "Tuck Jumps or Power Jacks": "0514",

  // Resistance Band exercises
  "Banded Anchored Chest Press": "0991",
  "Banded Seated Rows (Feet braced)": "0991",
  "Banded Overhead Shoulder Press": "0997",
  "Banded Face Pulls": "0991",
  "Banded Bicep Curls (Standing on band)": "0976",
  "Banded Front Squats (Band looped under feet and over shoulders)": "1004",
  "Banded Pull-Throughs (Anchored low posterior pull)": "0991",
  "Banded Lateral Crab Walks": "1004",
  "Standing Banded Calf Raises": "0991",
  "Banded Pallof Press (Anti-rotation core hold)": "0991",
  "Banded Lat Pulldowns (High anchor setup)": "0991",
  "Banded Upward Chest Flyes": "0991",
  "Banded Pull-Aparts (Rear delt focus)": "0991",
  "Banded Tricep Overhead Extensions": "0991",
  "Banded Push-ups (Band slung across back)": "0991",
  "Banded Romanian Deadlifts": "0991",
  "Banded Lying Leg Curls (Anchored to heavy door/post)": "0991",
  "Banded Donkey Kicks": "0991",
  "Banded Glute Bridges (Band across hips)": "0991",
  "Banded Kneeling Ab Crunches": "0991",

  // Gym plans
  "Barbell Bench Press": "0025",
  "Overhead Press (OHP)": "0097",
  "Incline Dumbbell Flyes": "0308",
  "Lateral Raises": "0334",
  "Tricep Rope Pushdowns": "0200",
  "Conventional Deadlift": "0032",
  "Lat Pulldowns": "0150",
  "Seated Cable Rows": "0180",
  "Face Pulls": "0172",
  "Barbell Bicep Curls": "0031",
  "Barbell Back Squat": "0043",
  "Romanian Deadlift (RDL)": "0089",
  "Leg Press": "0739",
  "Leg Curls": "0599",
  "Standing Calf Raises": "0417",
  "Incline Dumbbell Bench Press": "0314",
  "Bent-Over Barbell Rows": "0027",
  "Dumbbell Shoulder Press": "0405",
  "Pull-Ups / Chin-Ups": "0652",
  "Incline Dumbbell Curls": "0312",
  "Tricep Overhead Extension": "0344",
  "Romanian Deadlift": "0089",
  "Seated Calf Raises": "0379",
  "Hanging Leg Raises": "0455",
  "Flat Barbell Bench Press": "0025",
  "Plank": "0486",
  "Incline Dumbbell Press": "0314",
  "Wide-Grip Pull-ups": "0861",
  "T-Bar Row": "0843",
  "Dumbbell Pullovers": "0382",
  "Incline Barbell Press": "0047",
  "Decline Dumbbell Press": "0291",
  "Cable Crossovers": "0164",
  "Push-ups to Failure": "0662",
  "Barbell Row": "0027",
  "Overhead Press": "0097",
  "Lat Pulldown": "0150",
  "Barbell Curl": "0031",
  "Week 1: Warmup + Main Lift": "0025",
  "Week 2: Warmup + Main Lift": "0043",
  "Week 3: Warmup + Main Lift": "0032",
  "Boring But Big (BBB) Accessory": "0097",
  "Barbell Squat": "0043",
  "Flat Dumbbell Press": "0289",
  "Leg Extensions": "0571",
  "Standing Overhead Tricep Extension": "0344",
  "Weighted Dips": "0381",
  "Pike Push-ups (or Handstand Push-up progressions)": "0627",
  "Ring Push-ups (Deficit)": "1542",
  "Decline Diamond Push-ups": "0262",
  "Close-Grip Bench Press": "0101",
  "EZ-Bar Preacher Curls": "0447",
  "Tricep Overhead Cable Extensions": "0204",
  "Incline Hammer Curls": "0313",
  "Reverse Barbell Wrist Curls": "0082"
};

const mapLevel = (levelStr: string): ProgramLevel => {
  const l = levelStr.toLowerCase();
  if (l.includes('advanced')) return ProgramLevel.ADVANCED;
  if (l.includes('intermediate')) return ProgramLevel.INTERMEDIATE;
  return ProgramLevel.BEGINNER;
};

const capitalize = (s: string): string => {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const guessMuscleGroup = (displayName: string): string => {
  let muscleName = 'chest';
  const lowerName = displayName.toLowerCase();
  if (lowerName.includes('squat') || lowerName.includes('leg') || lowerName.includes('calf') || lowerName.includes('lunge') || lowerName.includes('press')) {
    if (lowerName.includes('bench') || lowerName.includes('chest') || lowerName.includes('shoulder')) {
      // Upper body presses
    } else if (lowerName.includes('calf') || lowerName.includes('calves')) {
      muscleName = 'calves';
    } else {
      muscleName = 'quads';
    }
  }
  if (lowerName.includes('deadlift') || (lowerName.includes('curl') && lowerName.includes('leg')) || lowerName.includes('hamstring')) {
    muscleName = 'hamstrings';
  } else if (lowerName.includes('row') || lowerName.includes('pull-up') || lowerName.includes('chin-up') || lowerName.includes('pulldown') || lowerName.includes('face pull')) {
    muscleName = 'back';
  } else if (lowerName.includes('overhead') || lowerName.includes('shoulder') || lowerName.includes('press') && lowerName.includes('military') || lowerName.includes('lateral raise') || lowerName.includes('rear delt') || lowerName.includes('pike')) {
    muscleName = 'shoulders';
  } else if (lowerName.includes('bicep') || lowerName.includes('curl')) {
    muscleName = 'biceps';
  } else if (lowerName.includes('tricep') || lowerName.includes('dip') || lowerName.includes('pushdown')) {
    muscleName = 'triceps';
  } else if (lowerName.includes('abs') || lowerName.includes('leg raise') || lowerName.includes('plank') || lowerName.includes('core')) {
    muscleName = 'abs';
  }
  return muscleName;
};

const guessEquipment = (displayName: string): string => {
  let eqName = 'barbell';
  const lowerName = displayName.toLowerCase();
  if (lowerName.includes('dumbbell')) {
    eqName = 'dumbbell';
  } else if (lowerName.includes('cable') || lowerName.includes('pulldown') || lowerName.includes('pushdown')) {
    eqName = 'cable';
  } else if (lowerName.includes('pull-up') || lowerName.includes('chin-up') || lowerName.includes('dip') || lowerName.includes('push-up') || lowerName.includes('plank') || lowerName.includes('leg raise') || lowerName.includes('hanging')) {
    eqName = 'bodyweight';
  } else if (lowerName.includes('leg press') || lowerName.includes('leg curl') || lowerName.includes('extension')) {
    eqName = 'machine';
  }
  return eqName;
};

export async function appendNewPrograms(appContext: any) {
  let globalRateLimited = false;
  const dataSource = appContext.get(DataSource);
  const exerciseRepository = dataSource.getRepository(Exercise);
  const muscleGroupRepository = dataSource.getRepository(MuscleGroup);
  const equipmentRepository = dataSource.getRepository(Equipment);
  const programRepository = dataSource.getRepository(Program);
  const programDayRepository = dataSource.getRepository(ProgramDay);
  const programDayExerciseRepository = dataSource.getRepository(ProgramDayExercise);
  const externalSyncService = appContext.get(ExternalSyncService);

  const getOrCreateMuscleGroup = async (name: string): Promise<MuscleGroup> => {
    const normalized = name.toLowerCase().trim();
    let muscle = await muscleGroupRepository.findOne({ where: { name: normalized } });
    if (!muscle) {
      muscle = muscleGroupRepository.create({ name: normalized });
      await muscleGroupRepository.save(muscle);
    }
    return muscle;
  };

  const getOrCreateEquipment = async (name: string): Promise<Equipment> => {
    const normalized = name.toLowerCase().trim();
    let eq = await equipmentRepository.findOne({ where: { name: normalized } });
    if (!eq) {
      eq = equipmentRepository.create({ name: normalized });
      await equipmentRepository.save(eq);
    }
    return eq;
  };

  const getOrCreateExerciseFromExerciseDbId = async (id: string, customDisplayName: string): Promise<string> => {
    let exercise = await exerciseRepository.findOne({ where: { externalId: id } });
    if (exercise) {
      console.log(`Exercise "${customDisplayName}" already exists in DB (External ID: ${id}).`);
      if (!exercise.gifUrl && !globalRateLimited) {
        try {
          console.log(`Caching missing GIF for exercise ${id}...`);
          const gif = await externalSyncService.downloadAndCacheGif(id);
          if (gif) exercise.gifUrl = gif;
        } catch (err) {
          console.warn(`Failed to cache GIF: ${err.message}`);
          if (err.message?.includes('429')) {
            globalRateLimited = true;
          }
        }
      }
      return exercise.id;
    }

    let raw: any = null;
    if (!globalRateLimited) {
      console.log(`Fetching exercise details for "${customDisplayName}" (ID: ${id}) from ExerciseDB...`);
      const apiKey = process.env.EXERCISEDB_API_KEY;
      if (!apiKey) {
        throw new Error('EXERCISEDB_API_KEY is not defined in environment.');
      }

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay between requests to stay under 5 req/sec limit
          const url = `https://exercisedb.p.rapidapi.com/exercises/exercise/${id}`;
          const res = await fetch(url, {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
            },
          });

          if (res.status === 429) {
            console.warn(`Rate limited (429) on attempt ${attempt} for ID ${id}. Fast fallback enabled...`);
            globalRateLimited = true;
            break;
          }

          if (!res.ok) {
            console.warn(`Failed to fetch ID ${id} on attempt ${attempt} with status ${res.status}`);
            continue;
          }

          const text = await res.text();
          if (!text) {
            console.warn(`Empty response body on attempt ${attempt} for ID ${id}`);
            continue;
          }

          raw = JSON.parse(text);
          break; // Success!
        } catch (err) {
          console.warn(`Fetch error for ID ${id} on attempt ${attempt}: ${err.message}`);
          if (err.message?.includes('429')) {
            globalRateLimited = true;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    } else {
      console.log(`Skipping ExerciseDB fetch for "${customDisplayName}" (ID: ${id}) due to rate limits. Using fallback creation...`);
    }

    const displayName = customDisplayName;
    const name = normalizeExerciseName(displayName);

    let exerciseByName = await exerciseRepository.findOne({ where: { name } });
    if (exerciseByName) {
      console.log(`Exercise with name "${name}" already exists. Linking to external ID ${id}.`);
      exerciseByName.externalId = id;
      if (raw && !exerciseByName.gifUrl) {
        try {
          const gif = await externalSyncService.downloadAndCacheGif(id);
          if (gif) exerciseByName.gifUrl = gif;
        } catch (err) {
          console.warn(`Failed to cache GIF: ${err.message}`);
        }
      }
      const saved = await exerciseRepository.save(exerciseByName);
      return saved.id;
    }

    const targetMuscle = raw?.target || guessMuscleGroup(displayName);
    const equipmentUsed = raw?.equipment || guessEquipment(displayName);
    const description = raw?.description || `Targeting ${targetMuscle} using ${equipmentUsed}.`;
    const instructions = raw?.instructions || ['Perform the exercise with correct form.'];

    const muscle = await getOrCreateMuscleGroup(targetMuscle);
    const eq = await getOrCreateEquipment(equipmentUsed);

    const newEx = exerciseRepository.create({
      name,
      displayName: capitalize(displayName),
      description,
      muscleGroup: muscle,
      equipment: eq,
      difficulty: ExerciseDifficulty.BEGINNER,
      instructions,
      source: ExerciseSource.EXERCIDEDB,
      externalId: id,
      gifUrl: `/api/v1/exercises/image/${id}`,
    });

    const savedEx = await exerciseRepository.save(newEx);

    if (raw) {
      try {
        console.log(`Downloading/Caching GIF for new exercise ${id}...`);
        const gif = await externalSyncService.downloadAndCacheGif(id);
        if (gif) {
          savedEx.gifUrl = gif;
          await exerciseRepository.save(savedEx);
        }
      } catch (err) {
        console.warn(`Failed to cache GIF: ${err.message}`);
      }
    }

    return savedEx.id;
  };

  const exerciseIdMap: Record<string, string> = {};
  const uniqueExercises = Array.from(
    new Set(
      workoutPlans.flatMap((p) => p.routine.flatMap((r) => r.exercises.map((e) => e.name)))
    )
  );

  console.log(`Resolving ${uniqueExercises.length} unique exercises directly from ExerciseDB...`);
  for (const exName of uniqueExercises) {
    const id = exerciseDbIdMap[exName];
    if (!id) {
      console.warn(`No ExerciseDB ID mapped for "${exName}". Using fallback creation...`);
      exerciseIdMap[exName] = await getOrCreateExerciseFromExerciseDbId("0025", exName);
    } else {
      exerciseIdMap[exName] = await getOrCreateExerciseFromExerciseDbId(id, exName);
    }
  }

  for (const plan of workoutPlans) {
    console.log(`Processing program: "${plan.name}"...`);

    const existing = await programRepository.findOne({ where: { name: plan.name } });
    if (existing) {
      console.log(`Removing pre-existing program "${plan.name}"...`);
      await programRepository.delete(existing.id);
    }

    const newProg = programRepository.create({
      name: plan.name,
      description: plan.description,
      level: mapLevel(plan.experience_level),
    });
    const savedProg = await programRepository.save(newProg);

    let dayIndex = 1;
    for (const routineDay of plan.routine) {
      const dayTitle = routineDay.day.substring(routineDay.day.indexOf(':') + 1).trim();
      const savedDay = await programDayRepository.save(
        programDayRepository.create({
          programId: savedProg.id,
          dayNumber: dayIndex++,
          title: dayTitle || routineDay.day,
        })
      );

      let order = 1;
      for (const ex of routineDay.exercises) {
        const exerciseId = exerciseIdMap[ex.name];
        let restTime = typeof ex.rest_seconds === 'number' ? ex.rest_seconds : 90;
        
        await programDayExerciseRepository.save(
          programDayExerciseRepository.create({
            programDayId: savedDay.id,
            exerciseId,
            order: order++,
            targetSets: ex.sets,
            targetRepsRange: String(ex.reps),
            targetRestTime: restTime,
          })
        );
      }
    }
    console.log(`Successfully seeded program: "${plan.name}".`);
  }
}

async function run() {
  console.log('Initializing NestJS application context...');
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('Context established. Appending new premium programs...');
  await appendNewPrograms(app);
  await app.close();
  console.log('Finished seeding workout plans. Database connection closed.');
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Error during execution:', err);
    process.exit(1);
  });
}
