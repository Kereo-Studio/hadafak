import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PerformanceTrackingService } from './performance-tracking.service';
import { PerformanceLog, DifficultyFeedback } from './entities/performance-log.entity';
import { AdaptationEngineService } from '../adaptation-engine/adaptation-engine.service';

describe('PerformanceTrackingService', () => {
  let service: PerformanceTrackingService;
  let logRepo: any;
  let adaptationService: any;

  beforeEach(async () => {
    logRepo = {
      create: jest.fn().mockImplementation(dto => dto),
      save: jest.fn().mockImplementation(log => Promise.resolve({ id: 'log-123', ...log })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    adaptationService = {
      adaptFromPerformance: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceTrackingService,
        { provide: getRepositoryToken(PerformanceLog), useValue: logRepo },
        { provide: AdaptationEngineService, useValue: adaptationService },
      ],
    }).compile();

    service = module.get<PerformanceTrackingService>(PerformanceTrackingService);
  });

  it('should log user performance and trigger adaptation', async () => {
    const dto = {
      workoutId: 'w-1',
      exerciseId: 'ex-1',
      completedReps: 30,
      plannedReps: 30,
      completedSets: 3,
      plannedSets: 3,
      weightUsed: 25,
      difficultyFeedback: DifficultyFeedback.OK,
      fatigueRating: 5,
      skipped: false,
    };

    const res = await service.logPerformance('u-1', dto);
    expect(res).toBeDefined();
    expect(res.id).toBe('log-123');
    expect(logRepo.save).toHaveBeenCalled();
    expect(adaptationService.adaptFromPerformance).toHaveBeenCalled();
  });
});
