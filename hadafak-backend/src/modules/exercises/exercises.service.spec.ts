import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ExercisesService } from './exercises.service';
import { Exercise, ExerciseDifficulty } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { Equipment } from './entities/equipment.entity';
import { normalizeExerciseName } from './utils/normalize';
import { ConflictException } from '@nestjs/common';
import { ExternalSyncService } from './external-sync.service';

describe('ExercisesService', () => {
  let service: ExercisesService;
  let exerciseRepoMock: any;
  let muscleGroupRepoMock: any;
  let equipmentRepoMock: any;
  let externalSyncServiceMock: any;

  beforeEach(async () => {
    externalSyncServiceMock = {
      syncExercisesForQuery: jest.fn(),
    };

    exerciseRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      })),
    };

    muscleGroupRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    equipmentRepoMock = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExercisesService,
        {
          provide: getRepositoryToken(Exercise),
          useValue: exerciseRepoMock,
        },
        {
          provide: getRepositoryToken(MuscleGroup),
          useValue: muscleGroupRepoMock,
        },
        {
          provide: getRepositoryToken(Equipment),
          useValue: equipmentRepoMock,
        },
        {
          provide: ExternalSyncService,
          useValue: externalSyncServiceMock,
        },
      ],
    }).compile();

    service = module.get<ExercisesService>(ExercisesService);
  });

  it('should normalize exercise names correctly', () => {
    expect(normalizeExerciseName('  Bench   Press!  ')).toBe('bench-press');
    expect(normalizeExerciseName('Pushups')).toBe('pushup');
  });

  describe('create', () => {
    it('should throw ConflictException if exercise already exists', async () => {
      exerciseRepoMock.findOne.mockResolvedValue({ id: '1', name: 'bench-press' });

      await expect(
        service.create({
          displayName: 'Bench Press',
          muscleGroupName: 'chest',
          equipmentName: 'barbell',
          difficulty: ExerciseDifficulty.BEGINNER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create exercise if it does not exist', async () => {
      exerciseRepoMock.findOne.mockResolvedValue(null);
      muscleGroupRepoMock.findOne.mockResolvedValue({ id: 'm1', name: 'chest' });
      equipmentRepoMock.findOne.mockResolvedValue({ id: 'e1', name: 'barbell' });
      
      const createdEx = {
        name: 'bench-press',
        displayName: 'Bench Press',
        muscleGroup: { id: 'm1', name: 'chest' },
        equipment: { id: 'e1', name: 'barbell' },
      };
      
      exerciseRepoMock.create.mockReturnValue(createdEx);
      exerciseRepoMock.save.mockResolvedValue(createdEx);

      const result = await service.create({
        displayName: 'Bench Press',
        muscleGroupName: 'chest',
        equipmentName: 'barbell',
        difficulty: ExerciseDifficulty.BEGINNER,
      });

      expect(result).toEqual(createdEx);
    });
  });
});
