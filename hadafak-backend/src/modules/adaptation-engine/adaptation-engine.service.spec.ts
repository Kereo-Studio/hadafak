import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AdaptationEngineService } from './adaptation-engine.service';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';
import { Profile, FitnessLevel } from '../profiles/entities/profile.entity';
import { PerformanceLog, DifficultyFeedback } from '../performance-tracking/entities/performance-log.entity';

import { ProgramDayExercise } from '../programs/entities/program-day-exercise.entity';

describe('AdaptationEngineService', () => {
  let service: AdaptationEngineService;
  let profileRepo: any;
  let workoutExerciseRepo: any;
  let programDayExerciseRepo: any;

  beforeEach(async () => {
    profileRepo = {
      findOne: jest.fn().mockResolvedValue({
        userId: 'u1',
        fitnessLevel: FitnessLevel.BEGINNER,
      }),
    };

    workoutExerciseRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'we1',
        sets: 3,
        reps: '8-12',
        weight: 20,
      }),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
    };

    programDayExerciseRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pde1',
        targetSets: 3,
        targetRepsRange: '8-12',
      }),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdaptationEngineService,
        { provide: getRepositoryToken(Profile), useValue: profileRepo },
        { provide: getRepositoryToken(WorkoutExercise), useValue: workoutExerciseRepo },
        { provide: getRepositoryToken(ProgramDayExercise), useValue: programDayExerciseRepo },
      ],
    }).compile();

    service = module.get<AdaptationEngineService>(AdaptationEngineService);
  });

  it('should adjust reps or weight on success logs', async () => {
    const log = {
      workoutId: 'w1',
      exerciseId: 'ex1',
      completedReps: 36, // 3 sets * 12 reps
      plannedReps: 30,
      completedSets: 3,
      plannedSets: 3,
      weightUsed: 20,
      difficultyFeedback: DifficultyFeedback.EASY,
      fatigueRating: 3,
      skipped: false,
    } as PerformanceLog;

    await service.adaptFromPerformance('u1', log);
    expect(workoutExerciseRepo.save).toHaveBeenCalled();
    const updated = workoutExerciseRepo.save.mock.calls[0][0];
    expect(updated.weight).toBeGreaterThan(20);
  });
});
