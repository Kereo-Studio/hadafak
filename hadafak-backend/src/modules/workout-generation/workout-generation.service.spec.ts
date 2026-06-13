import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WorkoutGenerationService } from './workout-generation.service';
import { Profile, FitnessGoal, FitnessLevel, EquipmentAccess } from '../profiles/entities/profile.entity';
import { Exercise, ExerciseDifficulty } from '../exercises/entities/exercise.entity';
import { WorkoutPlan } from '../workouts/entities/workout-plan.entity';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';

describe('WorkoutGenerationService', () => {
  let service: WorkoutGenerationService;
  let profileRepo: any;
  let exerciseRepo: any;
  let workoutPlanRepo: any;
  let workoutExerciseRepo: any;

  const mockProfile = {
    userId: 'user-123',
    goal: FitnessGoal.HYPERTROPHY,
    fitnessLevel: FitnessLevel.BEGINNER,
    daysPerWeekAvailable: 3,
    sessionDurationMinutes: 60,
    equipmentAccess: EquipmentAccess.GYM,
    injuries: [],
  };

  const mockExercises = [
    {
      id: 'ex-1',
      name: 'bench-press',
      displayName: 'Bench Press',
      difficulty: ExerciseDifficulty.BEGINNER,
      muscleGroup: { name: 'chest' },
      equipment: { name: 'barbell' },
      secondaryMuscles: [],
    },
    {
      id: 'ex-2',
      name: 'squat',
      displayName: 'Squat',
      difficulty: ExerciseDifficulty.BEGINNER,
      muscleGroup: { name: 'quads' },
      equipment: { name: 'barbell' },
      secondaryMuscles: [],
    },
    {
      id: 'ex-3',
      name: 'pull-up',
      displayName: 'Pull Up',
      difficulty: ExerciseDifficulty.BEGINNER,
      muscleGroup: { name: 'back' },
      equipment: { name: 'bodyweight' },
      secondaryMuscles: [],
    },
  ];

  beforeEach(async () => {
    profileRepo = {
      findOne: jest.fn().mockResolvedValue(mockProfile),
    };
    exerciseRepo = {
      find: jest.fn().mockResolvedValue(mockExercises),
    };
    workoutPlanRepo = {
      create: jest.fn().mockImplementation(dto => ({ id: 'plan-123', ...dto })),
      save: jest.fn().mockImplementation(plan => Promise.resolve(plan)),
    };
    workoutExerciseRepo = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(ex => Promise.resolve(ex)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutGenerationService,
        { provide: getRepositoryToken(Profile), useValue: profileRepo },
        { provide: getRepositoryToken(Exercise), useValue: exerciseRepo },
        { provide: getRepositoryToken(WorkoutPlan), useValue: workoutPlanRepo },
        { provide: getRepositoryToken(WorkoutExercise), useValue: workoutExerciseRepo },
      ],
    }).compile();

    service = module.get<WorkoutGenerationService>(WorkoutGenerationService);
  });

  it('should generate a workout plan successfully', async () => {
    const plan = await service.generateWorkoutPlan('user-123');
    expect(plan).toBeDefined();
    expect(plan.name).toContain('Hypertrophy Plan');
    expect(workoutPlanRepo.save).toHaveBeenCalled();
  });
});
