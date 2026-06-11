import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from './entities/workout-session.entity';
import { ExerciseLog, ExerciseSetLog } from './entities/exercise-log.entity';
import { LogWorkoutDto } from './dto/log-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(WorkoutSession)
    private readonly workoutSessionRepository: Repository<WorkoutSession>,
    @InjectRepository(ExerciseLog)
    private readonly exerciseLogRepository: Repository<ExerciseLog>,
  ) {}

  async getActiveSession(userId: string): Promise<WorkoutSession | null> {
    return this.workoutSessionRepository.findOne({
      where: { userId, status: 'active' },
      relations: {
        exerciseLogs: {
          exercise: true,
        },
        programDay: true,
      },
    });
  }

  async startSession(userId: string, programDayId?: string): Promise<WorkoutSession> {
    const active = await this.getActiveSession(userId);
    if (active) {
      return active;
    }

    const session = this.workoutSessionRepository.create({
      userId,
      programDayId: programDayId || null,
      status: 'active',
      completed: false,
      date: new Date().toISOString().split('T')[0],
    });

    return this.workoutSessionRepository.save(session);
  }

  async completeSession(
    id: string,
    userId: string,
    duration?: number,
    rpe?: number,
  ): Promise<WorkoutSession> {
    const session = await this.findSessionById(id, userId);
    session.status = 'completed';
    session.completed = true;
    if (duration !== undefined) session.duration = duration;
    if (rpe !== undefined) session.rpe = rpe;

    return this.workoutSessionRepository.save(session);
  }

  async logSession(userId: string, dto: LogWorkoutDto): Promise<WorkoutSession> {
    let session = await this.getActiveSession(userId);

    if (!session) {
      session = this.workoutSessionRepository.create({
        userId,
        programDayId: dto.programDayId || null,
        date: dto.date || new Date().toISOString().split('T')[0],
        status: dto.completed ? 'completed' : 'active',
        completed: dto.completed,
      });
      session = await this.workoutSessionRepository.save(session);
    } else {
      if (dto.programDayId) {
        session.programDayId = dto.programDayId;
      }
      if (dto.date) {
        session.date = dto.date;
      }
      session.status = dto.completed ? 'completed' : 'active';
      session.completed = dto.completed;
    }

    session.duration = dto.duration;
    if (dto.rpe !== undefined) {
      session.rpe = dto.rpe;
    }
    await this.workoutSessionRepository.save(session);

    // Remove existing logs for this session to update them cleanly
    await this.exerciseLogRepository.delete({ workoutSessionId: session.id });

    if (dto.logs && dto.logs.length > 0) {
      const logs = dto.logs.map((logDto) => {
        let bestRep = 0;
        let bestWeight = 0;
        let highestVolume = 0;
        let maxOneRepMax = 0;
        let maxRpe = 0;

        const sets: ExerciseSetLog[] = logDto.sets.map((s) => {
          const reps = s.reps;
          const weight = s.weight;
          const setVolume = reps * weight;
          
          if (setVolume > highestVolume) {
            highestVolume = setVolume;
            bestRep = reps;
            bestWeight = weight;
          }

          // Calculate estimated 1RM using Brzycki formula
          const estimated1RM = reps > 1 ? weight / (1.0278 - 0.0278 * reps) : weight;
          if (estimated1RM > maxOneRepMax) {
            maxOneRepMax = estimated1RM;
          }

          if (s.rpe && s.rpe > maxRpe) {
            maxRpe = s.rpe;
          }

          return {
            setNumber: s.setNumber,
            reps,
            weight,
            type: s.type || 'normal',
            rpe: s.rpe,
          };
        });

        return this.exerciseLogRepository.create({
          workoutSessionId: session.id,
          exerciseId: logDto.exerciseId,
          sets,
          reps: bestRep,
          weight: bestWeight,
          oneRepMax: Math.round(maxOneRepMax * 100) / 100,
          rpe: maxRpe > 0 ? maxRpe : null,
        });
      });
      await this.exerciseLogRepository.save(logs);
    }

    return this.findSessionById(session.id, userId);
  }

  async getVolumeProgress(userId: string) {
    const sessions = await this.workoutSessionRepository.find({
      where: { userId },
      relations: {
        exerciseLogs: true,
      },
      order: { date: 'ASC' },
    });

    return sessions.map((s) => {
      let totalVolume = 0;
      for (const log of s.exerciseLogs) {
        if (log.sets) {
          for (const set of log.sets) {
            totalVolume += (set.weight || 0) * (set.reps || 0);
          }
        }
      }
      return {
        sessionId: s.id,
        date: s.date,
        duration: s.duration,
        status: s.status,
        totalVolume,
      };
    });
  }

  async getPersonalRecords(userId: string) {
    const logs = await this.exerciseLogRepository.find({
      where: {
        workoutSession: { userId },
      },
      relations: {
        exercise: true,
      },
    });

    const prs: { [exerciseName: string]: { maxWeight: number; maxOneRepMax: number; exerciseId: string } } = {};
    for (const log of logs) {
      const exName = log.exercise.name;
      const weightVal = Number(log.weight) || 0;
      const oneRepMaxVal = Number(log.oneRepMax) || 0;

      if (!prs[exName]) {
        prs[exName] = { maxWeight: weightVal, maxOneRepMax: oneRepMaxVal, exerciseId: log.exerciseId };
      } else {
        if (weightVal > prs[exName].maxWeight) prs[exName].maxWeight = weightVal;
        if (oneRepMaxVal > prs[exName].maxOneRepMax) prs[exName].maxOneRepMax = oneRepMaxVal;
      }
    }

    return Object.entries(prs).map(([name, data]) => ({
      exerciseName: name,
      exerciseId: data.exerciseId,
      maxWeight: data.maxWeight,
      maxOneRepMax: Math.round(data.maxOneRepMax * 100) / 100,
    }));
  }

  async findUserHistory(userId: string): Promise<WorkoutSession[]> {
    return this.workoutSessionRepository.find({
      where: { userId },
      relations: {
        exerciseLogs: {
          exercise: true,
        },
        programDay: true,
      },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async findSessionById(id: string, userId: string): Promise<WorkoutSession> {
    const session = await this.workoutSessionRepository.findOne({
      where: { id, userId },
      relations: {
        exerciseLogs: {
          exercise: true,
        },
        programDay: true,
      },
    });

    if (!session) {
      throw new NotFoundException(`Workout session ${id} not found`);
    }

    return session;
  }

  async getExerciseProgression(userId: string, exerciseId: string) {
    const logs = await this.exerciseLogRepository.find({
      where: {
        exerciseId,
        workoutSession: { userId, completed: true },
      },
      relations: {
        workoutSession: true,
      },
      order: {
        workoutSession: { date: 'ASC' },
      },
    });

    return logs.map((l) => {
      let maxWeight = Number(l.weight) || 0;
      let totalVolume = 0;
      if (l.sets) {
        for (const set of l.sets) {
          totalVolume += (set.weight || 0) * (set.reps || 0);
          if ((set.weight || 0) > maxWeight) {
            maxWeight = set.weight;
          }
        }
      }

      return {
        date: l.workoutSession.date,
        maxWeight,
        estimated1RM: Number(l.oneRepMax) || 0,
        totalVolume,
      };
    });
  }
}
