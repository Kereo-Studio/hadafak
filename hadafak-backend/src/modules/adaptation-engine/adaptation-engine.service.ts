import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';
import { Profile, FitnessLevel } from '../profiles/entities/profile.entity';
import { PerformanceLog, DifficultyFeedback } from '../performance-tracking/entities/performance-log.entity';
import { ProgramDayExercise } from '../programs/entities/program-day-exercise.entity';

@Injectable()
export class AdaptationEngineService {
  constructor(
    @InjectRepository(WorkoutExercise)
    private readonly workoutExerciseRepository: Repository<WorkoutExercise>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(ProgramDayExercise)
    private readonly programDayExerciseRepository: Repository<ProgramDayExercise>,
  ) {}

  async getProfile(userId: string): Promise<Profile | null> {
    return this.profileRepository.findOne({ where: { userId } });
  }

  async getProgramDayExercises(programDayId: string): Promise<ProgramDayExercise[]> {
    return this.programDayExerciseRepository.find({ where: { programDayId } });
  }

  async adaptFromPerformance(
    userId: string,
    log: PerformanceLog,
    profileInput?: Profile,
    workoutExerciseInput?: WorkoutExercise,
  ): Promise<void> {
    // 1. Fetch the user's fitness profile to check level and experience
    const profile = profileInput !== undefined ? profileInput : await this.profileRepository.findOne({ where: { userId } });
    const userLevel = profile?.fitnessLevel || FitnessLevel.BEGINNER;

    // 2. Find the WorkoutExercise record for this plan and exercise
    const workoutExercise = workoutExerciseInput !== undefined
      ? workoutExerciseInput
      : await this.workoutExerciseRepository.findOne({
          where: {
            workoutPlanId: log.workoutId,
            exerciseId: log.exerciseId,
          },
        });

    if (!workoutExercise) {
      // If it doesn't belong to a saved plan, skip updating targets
      return;
    }

    // Capture current values
    let currentSets = workoutExercise.sets;
    let currentWeight = Number(workoutExercise.weight || log.weightUsed || 0);
    let currentRepsStr = workoutExercise.reps; // could be "8-12" or "8"

    // Parse reps range
    let minReps = 8;
    let maxReps = 12;
    if (currentRepsStr.includes('-')) {
      const parts = currentRepsStr.split('-');
      minReps = parseInt(parts[0], 10) || 8;
      maxReps = parseInt(parts[1], 10) || 12;
    } else {
      minReps = parseInt(currentRepsStr, 10) || 8;
      maxReps = minReps;
    }

    // Set limits based on user level
    let maxAllowedSets = 3;
    if (userLevel === FitnessLevel.INTERMEDIATE) maxAllowedSets = 4;
    if (userLevel === FitnessLevel.ADVANCED) maxAllowedSets = 5;

    // 3. Apply Adaptation Rules
    if (log.skipped || log.difficultyFeedback === DifficultyFeedback.HARD || log.fatigueRating >= 7) {
      // --- WORKOUT TOO HARD ---
      // Reduce sets (min 2)
      if (currentSets > 2) {
        currentSets -= 1;
      }
      // Reduce weight by 10% (if weight is used)
      if (currentWeight > 0) {
        currentWeight = Math.round(currentWeight * 0.9 * 2) / 2; // round to nearest 0.5
      }
    } else if (log.difficultyFeedback === DifficultyFeedback.EASY || log.completedReps > log.plannedReps) {
      // --- WORKOUT TOO EASY ---
      // If completed reps met or exceeded target
      if (log.completedReps >= maxReps * currentSets) {
        // Progression: weight increase
        const weightAdd = currentWeight > 0 ? (currentWeight <= 20 ? 1 : 2.5) : 0;
        if (weightAdd > 0) {
          currentWeight += weightAdd;
          // Reset reps to range
          workoutExercise.reps = `${minReps}-${maxReps}`;
        } else {
          // If no weight used (bodyweight), increase reps range bounds or increase sets
          if (currentSets < maxAllowedSets) {
            currentSets += 1;
          } else {
            // Increase rep range bounds
            workoutExercise.reps = `${minReps + 2}-${maxReps + 4}`;
          }
        }
      } else {
        // Increase target sets if below max allowed
        if (currentSets < maxAllowedSets) {
          currentSets += 1;
        }
      }
    } else {
      // --- CONSISTENT PROGRESS (OK / OK FATIGUE) ---
      // If user successfully hit planned reps
      if (log.completedReps >= log.plannedReps) {
        // If they hit the max range reps across all sets, trigger progressive overload weight increase next time
        const repsPerSet = log.completedReps / Math.max(log.completedSets, 1);
        if (repsPerSet >= maxReps) {
          const weightAdd = currentWeight > 0 ? (currentWeight <= 20 ? 1 : 2.5) : 0;
          if (weightAdd > 0) {
            currentWeight += weightAdd;
          } else {
            // Bodyweight overload: add sets or increment target reps
            if (currentSets < maxAllowedSets) {
              currentSets += 1;
            } else {
              workoutExercise.reps = `${minReps + 1}-${maxReps + 2}`;
            }
          }
        }
      }
    }

    // Save progression changes back to WorkoutExercise
    workoutExercise.sets = currentSets;
    workoutExercise.weight = currentWeight > 0 ? currentWeight : null;

    await this.workoutExerciseRepository.save(workoutExercise);
  }

  // Adapts ProgramDayExercise targets when the user works from a Program (not a WorkoutPlan)
  async adaptProgramExercise(
    userId: string,
    programDayId: string,
    exerciseId: string,
    difficultyFeedback: DifficultyFeedback,
    fatigueRating: number,
    completedReps: number,
    completedSets: number,
    profileInput?: Profile,
    programDayExerciseInput?: ProgramDayExercise,
  ): Promise<void> {
    const profile = profileInput !== undefined ? profileInput : await this.profileRepository.findOne({ where: { userId } });
    const userLevel = profile?.fitnessLevel || FitnessLevel.BEGINNER;

    const pde = programDayExerciseInput !== undefined
      ? programDayExerciseInput
      : await this.programDayExerciseRepository.findOne({
          where: { programDayId, exerciseId },
        });

    if (!pde) return;

    let currentSets = pde.targetSets;
    const repsStr = pde.targetRepsRange || '8-12';
    let minReps = 8;
    let maxReps = 12;
    if (repsStr.includes('-')) {
      const parts = repsStr.split('-');
      minReps = parseInt(parts[0], 10) || 8;
      maxReps = parseInt(parts[1], 10) || 12;
    } else {
      minReps = parseInt(repsStr, 10) || 8;
      maxReps = minReps;
    }

    let maxAllowedSets = 3;
    if (userLevel === FitnessLevel.INTERMEDIATE) maxAllowedSets = 4;
    if (userLevel === FitnessLevel.ADVANCED) maxAllowedSets = 5;

    if (difficultyFeedback === DifficultyFeedback.HARD || fatigueRating >= 7) {
      // Too hard — reduce sets and lower rep ceiling
      if (currentSets > 2) currentSets -= 1;
      const newMin = Math.max(4, minReps - 2);
      const newMax = Math.max(6, maxReps - 2);
      pde.targetRepsRange = `${newMin}-${newMax}`;
    } else if (difficultyFeedback === DifficultyFeedback.EASY) {
      // Too easy — increase volume
      if (completedReps >= maxReps * completedSets) {
        if (currentSets < maxAllowedSets) {
          currentSets += 1;
        } else {
          pde.targetRepsRange = `${minReps + 2}-${maxReps + 2}`;
        }
      } else {
        if (currentSets < maxAllowedSets) currentSets += 1;
      }
    } else {
      // OK — progressive overload if hitting the top of the rep range
      const repsPerSet = completedSets > 0 ? completedReps / completedSets : 0;
      if (repsPerSet >= maxReps) {
        if (currentSets < maxAllowedSets) {
          currentSets += 1;
        } else {
          pde.targetRepsRange = `${minReps + 1}-${maxReps + 2}`;
        }
      }
    }

    pde.targetSets = currentSets;
    await this.programDayExerciseRepository.save(pde);
  }
}
