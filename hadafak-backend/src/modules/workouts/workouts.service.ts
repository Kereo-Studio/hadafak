import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from './entities/workout-session.entity';
import { ExerciseLog, ExerciseSetLog } from './entities/exercise-log.entity';
import { WorkoutPlan } from './entities/workout-plan.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { AddExerciseToPlanDto } from './dto/add-exercise-to-plan.dto';
import { ExercisesService } from '../exercises/exercises.service';
import { AdaptationEngineService } from '../adaptation-engine/adaptation-engine.service';
import { DifficultyFeedback, PerformanceLog } from '../performance-tracking/entities/performance-log.entity';

@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);

  constructor(
    @InjectRepository(WorkoutSession)
    private readonly workoutSessionRepository: Repository<WorkoutSession>,
    @InjectRepository(ExerciseLog)
    private readonly exerciseLogRepository: Repository<ExerciseLog>,
    @InjectRepository(WorkoutPlan)
    private readonly workoutPlanRepository: Repository<WorkoutPlan>,
    @InjectRepository(WorkoutExercise)
    private readonly workoutExerciseRepository: Repository<WorkoutExercise>,
    private readonly exercisesService: ExercisesService,
    private readonly adaptationEngineService: AdaptationEngineService,
  ) {}

  // ==========================================
  // EXERCISES / LOGGING LOGIC
  // ==========================================

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
      const logs = await Promise.all(dto.logs.map(async (logDto) => {
        const resolvedExerciseId = await this.exercisesService.resolveExerciseId(logDto.exerciseId);
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
          exerciseId: resolvedExerciseId,
          sets,
          reps: bestRep,
          weight: bestWeight,
          oneRepMax: Math.round(maxOneRepMax * 100) / 100,
          rpe: maxRpe > 0 ? maxRpe : null,
        });
      }));
      await this.exerciseLogRepository.save(logs);

      // Trigger adaptation engine when session is completed
      // Adjusts sets/reps/weight on the user's workout plan based on performance
      if (dto.completed) {
        const plans = await this.workoutPlanRepository.find({
          where: { userId },
          relations: { workoutExercises: true },
          order: { createdAt: 'DESC' },
        });

        const sessionRpe = dto.rpe || 7;
        let difficultyFeedback = DifficultyFeedback.OK;
        if (sessionRpe <= 5) {
          difficultyFeedback = DifficultyFeedback.EASY;
        } else if (sessionRpe >= 8) {
          difficultyFeedback = DifficultyFeedback.HARD;
        }

        for (const log of logs) {
          try {
            // Find target plan containing the exercise. If none, default to the latest plan.
            let targetPlan = plans.find(p => p.workoutExercises.some(we => we.exerciseId === log.exerciseId));
            if (!targetPlan && plans.length > 0) {
              targetPlan = plans[0];
            }

            if (!targetPlan) {
              continue; // No plan found for user to adapt
            }

            const workoutExercise = targetPlan.workoutExercises.find(we => we.exerciseId === log.exerciseId);
            const plannedSets = workoutExercise ? workoutExercise.sets : 3;
            let plannedReps = 10 * plannedSets;
            if (workoutExercise && workoutExercise.reps) {
              const parts = String(workoutExercise.reps).split('-');
              if (parts.length > 1) {
                plannedReps = Math.round((parseInt(parts[0], 10) + parseInt(parts[1], 10)) / 2) * plannedSets;
              } else {
                plannedReps = (parseInt(workoutExercise.reps, 10) || 10) * plannedSets;
              }
            }

            const validSets = (log.sets || []).filter(s => s.reps > 0);
            const completedSets = validSets.length;
            const completedReps = validSets.reduce((sum, s) => sum + s.reps, 0);
            const weightUsed = validSets.length > 0 ? Math.max(...validSets.map(s => s.weight)) : 0;

            const mockPerfLog = {
              workoutId: targetPlan.id,
              exerciseId: log.exerciseId,
              plannedSets,
              completedSets,
              plannedReps,
              completedReps,
              weightUsed,
              fatigueRating: sessionRpe,
              difficultyFeedback,
              skipped: completedSets === 0,
              date: dto.date || new Date().toISOString().split('T')[0],
            } as PerformanceLog;

            await this.adaptationEngineService.adaptFromPerformance(userId, mockPerfLog);
          } catch (adaptErr) {
            // Never let adaptation failures abort the workout save
            this.logger.warn(`Adaptation engine failed for exercise ${log.exerciseId}: ${adaptErr.message}`);
          }
        }
      }
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
    const resolvedExerciseId = await this.exercisesService.resolveExerciseId(exerciseId);
    const logs = await this.exerciseLogRepository.find({
      where: {
        exerciseId: resolvedExerciseId,
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

  async deleteSession(id: string, userId: string): Promise<void> {
    const session = await this.workoutSessionRepository.findOne({
      where: { id, userId },
    });
    if (!session) {
      throw new NotFoundException(`Workout session ${id} not found`);
    }
    await this.workoutSessionRepository.remove(session);
  }

  // ==========================================
  // WORKOUT BUILDER / PLANS LOGIC
  // ==========================================

  async createWorkoutPlan(userId: string | null, dto: CreateWorkoutPlanDto): Promise<WorkoutPlan> {
    const plan = this.workoutPlanRepository.create({
      name: dto.name,
      goal: dto.goal,
      level: dto.level,
      userId,
      isTemplate: dto.isTemplate || false,
    });

    const savedPlan = await this.workoutPlanRepository.save(plan);

    if (dto.exercises && dto.exercises.length > 0) {
      const workoutExercises = await Promise.all(dto.exercises.map(async (ex, index) => {
        const resolvedExerciseId = await this.exercisesService.resolveExerciseId(ex.exerciseId);
        return this.workoutExerciseRepository.create({
          workoutPlanId: savedPlan.id,
          exerciseId: resolvedExerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restTimeSeconds: ex.restTimeSeconds || 90,
          orderIndex: index,
        });
      }));
      await this.workoutExerciseRepository.save(workoutExercises);
    }

    return this.findWorkoutPlanById(savedPlan.id);
  }

  async findWorkoutPlanById(id: string): Promise<WorkoutPlan> {
    const plan = await this.workoutPlanRepository.findOne({
      where: { id },
      relations: {
        workoutExercises: {
          exercise: {
            muscleGroup: true,
            equipment: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Workout plan ${id} not found`);
    }

    // Sort exercises by their order index to keep presentation consistent
    if (plan.workoutExercises) {
      plan.workoutExercises.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return plan;
  }

  async findAllWorkoutPlans(userId: string | null): Promise<WorkoutPlan[]> {
    // Returns user custom plans or templates if userId is null
    const plans = await this.workoutPlanRepository.find({
      where: userId ? { userId } : { isTemplate: true },
      relations: {
        workoutExercises: {
          exercise: {
            muscleGroup: true,
            equipment: true,
          },
        },
      },
      order: { createdAt: 'DESC' },
    });

    plans.forEach((plan) => {
      if (plan.workoutExercises) {
        plan.workoutExercises.sort((a, b) => a.orderIndex - b.orderIndex);
      }
    });

    return plans;
  }

  async updateWorkoutPlan(id: string, userId: string | null, dto: UpdateWorkoutPlanDto): Promise<WorkoutPlan> {
    const plan = await this.findWorkoutPlanById(id);

    if (userId && plan.userId !== userId) {
      throw new ForbiddenException('You do not own this workout plan');
    }

    if (dto.name !== undefined) plan.name = dto.name;
    if (dto.goal !== undefined) plan.goal = dto.goal;
    if (dto.level !== undefined) plan.level = dto.level;
    if (dto.isTemplate !== undefined) plan.isTemplate = dto.isTemplate;

    await this.workoutPlanRepository.save(plan);

    if (dto.exercises) {
      // Re-create exercise items to update them completely
      await this.workoutExerciseRepository.delete({ workoutPlanId: plan.id });

      const workoutExercises = await Promise.all(dto.exercises.map(async (ex, index) => {
        const resolvedExerciseId = await this.exercisesService.resolveExerciseId(ex.exerciseId);
        return this.workoutExerciseRepository.create({
          workoutPlanId: plan.id,
          exerciseId: resolvedExerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restTimeSeconds: ex.restTimeSeconds || 90,
          orderIndex: index,
          dayNumber: ex.dayNumber || 1,
        });
      }));
      await this.workoutExerciseRepository.save(workoutExercises);
    }

    return this.findWorkoutPlanById(id);
  }

  async deleteWorkoutPlan(id: string, userId: string | null): Promise<void> {
    const plan = await this.findWorkoutPlanById(id);

    if (userId && plan.userId !== userId) {
      throw new ForbiddenException('You do not own this workout plan');
    }

    await this.workoutPlanRepository.remove(plan);
  }

  async addExerciseToPlan(planId: string, userId: string | null, dto: AddExerciseToPlanDto): Promise<WorkoutExercise> {
    const plan = await this.findWorkoutPlanById(planId);

    if (userId && plan.userId !== userId) {
      throw new ForbiddenException('You do not own this workout plan');
    }

    const maxOrderEx = await this.workoutExerciseRepository.findOne({
      where: { workoutPlanId: planId },
      order: { orderIndex: 'DESC' },
    });

    const nextOrderIndex = maxOrderEx ? maxOrderEx.orderIndex + 1 : 0;

    const resolvedExerciseId = await this.exercisesService.resolveExerciseId(dto.exerciseId);
    const workoutEx = this.workoutExerciseRepository.create({
      workoutPlanId: planId,
      exerciseId: resolvedExerciseId,
      sets: dto.sets || 3,
      reps: dto.reps || '8-12',
      weight: dto.weight,
      restTimeSeconds: dto.restTimeSeconds || 90,
      orderIndex: nextOrderIndex,
      dayNumber: dto.dayNumber || 1,
    });

    return this.workoutExerciseRepository.save(workoutEx);
  }

  async reorderExercises(planId: string, userId: string | null, workoutExerciseIds: string[]): Promise<WorkoutPlan> {
    const plan = await this.findWorkoutPlanById(planId);

    if (userId && plan.userId !== userId) {
      throw new ForbiddenException('You do not own this workout plan');
    }

    const currentExercises = await this.workoutExerciseRepository.find({
      where: { workoutPlanId: planId },
    });

    const exerciseMap = new Map(currentExercises.map((e) => [e.id, e]));

    // Reassign indices according to list order
    const updatedExercises: WorkoutExercise[] = [];
    workoutExerciseIds.forEach((id, index) => {
      const ex = exerciseMap.get(id);
      if (ex) {
        ex.orderIndex = index;
        updatedExercises.push(ex);
      }
    });

    await this.workoutExerciseRepository.save(updatedExercises);
    return this.findWorkoutPlanById(planId);
  }

  async cloneWorkoutPlan(templateId: string, userId: string, newName?: string): Promise<WorkoutPlan> {
    const template = await this.findWorkoutPlanById(templateId);

    const clonedPlan = this.workoutPlanRepository.create({
      name: newName || `${template.name} (Clone)`,
      goal: template.goal,
      level: template.level,
      userId,
      isTemplate: false,
    });

    const savedPlan = await this.workoutPlanRepository.save(clonedPlan);

    if (template.workoutExercises && template.workoutExercises.length > 0) {
      const clonedExercises = template.workoutExercises.map((ex) => {
        return this.workoutExerciseRepository.create({
          workoutPlanId: savedPlan.id,
          exerciseId: ex.exerciseId,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight,
          restTimeSeconds: ex.restTimeSeconds,
          orderIndex: ex.orderIndex,
        });
      });
      await this.workoutExerciseRepository.save(clonedExercises);
    }

    return this.findWorkoutPlanById(savedPlan.id);
  }
}
