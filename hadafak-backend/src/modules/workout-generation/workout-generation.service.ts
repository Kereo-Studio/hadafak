import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutPlan, WorkoutGoal, WorkoutLevel } from '../workouts/entities/workout-plan.entity';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';
import { Profile, FitnessGoal, FitnessLevel, EquipmentAccess } from '../profiles/entities/profile.entity';
import { Exercise, ExerciseDifficulty } from '../exercises/entities/exercise.entity';
import { GenerateWorkoutDto } from './dto/generate-workout.dto';

interface WorkoutSessionConfig {
  name: string;
  muscleGroups: string[];
}

@Injectable()
export class WorkoutGenerationService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    @InjectRepository(WorkoutPlan)
    private readonly workoutPlanRepository: Repository<WorkoutPlan>,
    @InjectRepository(WorkoutExercise)
    private readonly workoutExerciseRepository: Repository<WorkoutExercise>,
  ) {}

  async generateWorkoutPlan(userId: string, dto?: GenerateWorkoutDto): Promise<WorkoutPlan> {
    const profile = await this.profileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException(`User profile not found for user ${userId}. Please update profile first.`);
    }

    const goal = dto?.goal || profile.goal;
    const level = dto?.level || profile.fitnessLevel || FitnessLevel.BEGINNER;
    const days = dto?.daysPerWeek || profile.daysPerWeekAvailable || 3;
    const duration = profile.sessionDurationMinutes || 60;
    const injuries = profile.injuries || [];
    const equipmentAccess = profile.equipmentAccess || EquipmentAccess.GYM;

    // 1. Split Selection
    const splitConfigs = this.determineSplit(goal, days);

    // 2. Fetch all exercises with relations
    const allExercises = await this.exerciseRepository.find({
      relations: {
        muscleGroup: true,
        equipment: true,
        secondaryMuscles: true,
      },
    });

    // 3. Create a WorkoutPlan
    const planGoal = this.mapToWorkoutGoal(goal);
    const planLevel = this.mapToWorkoutLevel(level);

    const workoutPlan = this.workoutPlanRepository.create({
      name: `${this.capitalize(goal.replace('_', ' '))} Plan (${days} Days/Week)`,
      goal: planGoal,
      level: planLevel,
      userId,
      isTemplate: false,
    });
    const savedPlan = await this.workoutPlanRepository.save(workoutPlan);

    // 4. Generate exercises for each split session
    let orderIndex = 0;
    const workoutExercises: WorkoutExercise[] = [];

    for (let dayIdx = 0; dayIdx < splitConfigs.length; dayIdx++) {
      const config = splitConfigs[dayIdx];
      
      // Filter exercises matching requirements
      const candidates = allExercises.filter(ex => {
        // Equipment filter
        if (equipmentAccess === EquipmentAccess.NONE) {
          if (ex.equipment?.name.toLowerCase() !== 'bodyweight') return false;
        } else if (equipmentAccess === EquipmentAccess.HOME) {
          const eqName = ex.equipment?.name.toLowerCase() || '';
          if (eqName !== 'bodyweight' && eqName !== 'dumbbell') return false;
        }

        // Injury check
        if (injuries.some(inj => 
          ex.muscleGroup?.name.toLowerCase() === inj.toLowerCase() ||
          (ex.secondaryMuscles && ex.secondaryMuscles.some(sec => sec.name.toLowerCase() === inj.toLowerCase()))
        )) {
          return false;
        }

        // Level / Difficulty check
        if (level === FitnessLevel.BEGINNER) {
          if (ex.difficulty !== ExerciseDifficulty.BEGINNER) return false;
        } else if (level === FitnessLevel.INTERMEDIATE) {
          if (ex.difficulty === ExerciseDifficulty.ADVANCED) return false;
        }

        // Muscle Group Check: targets must overlap session primary target muscle groups
        const isPrimaryMatch = config.muscleGroups.some(m => ex.muscleGroup?.name.toLowerCase() === m.toLowerCase());
        return isPrimaryMatch;
      });

      // Rank candidates: compound first, accessory second, isolation third
      const rankedCandidates = candidates.sort((a, b) => {
        const rankA = this.getExerciseRank(a);
        const rankB = this.getExerciseRank(b);
        return rankA - rankB; // low rank (1, 2, 3) comes first
      });

      // Select distinct exercises based on session duration
      const maxExercises = Math.min(6, Math.max(4, Math.round(duration / 12)));
      const selectedList: Exercise[] = [];

      for (const ex of rankedCandidates) {
        if (selectedList.length >= maxExercises) break;
        // Ensure diversity: avoid adding too many duplicate target muscle group exercises
        const muscleName = ex.muscleGroup?.name;
        const countForMuscle = selectedList.filter(selected => selected.muscleGroup?.name === muscleName).length;
        if (countForMuscle >= 2) continue; // limit to 2 exercises per muscle group per session

        selectedList.push(ex);
      }

      // If we still need exercises, fill with any remaining candidate
      for (const ex of rankedCandidates) {
        if (selectedList.length >= maxExercises) break;
        if (!selectedList.some(selected => selected.id === ex.id)) {
          selectedList.push(ex);
        }
      }

      // Configure Sets, Reps, and Rest
      const targetSets = level === FitnessLevel.BEGINNER ? 3 : (level === FitnessLevel.INTERMEDIATE ? 3 : 4);
      let targetReps = '8-12';
      let restTime = 90;

      if (goal === FitnessGoal.STRENGTH) {
        targetReps = '3-6';
        restTime = 150;
      } else if (goal === FitnessGoal.ENDURANCE || goal === FitnessGoal.FAT_LOSS) {
        targetReps = '12-20';
        restTime = 45;
      }

      // Add to workout plan
      for (let i = 0; i < selectedList.length; i++) {
        const ex = selectedList[i];
        const workoutEx = this.workoutExerciseRepository.create({
          workoutPlanId: savedPlan.id,
          exerciseId: ex.id,
          sets: targetSets,
          reps: targetReps,
          restTimeSeconds: restTime,
          orderIndex: orderIndex++,
          weight: null,
          dayNumber: dayIdx + 1,
        });
        workoutExercises.push(await this.workoutExerciseRepository.save(workoutEx));
      }
    }

    savedPlan.workoutExercises = workoutExercises;
    return savedPlan;
  }

  private determineSplit(goal: FitnessGoal, days: number): WorkoutSessionConfig[] {
    const isHypertrophy = goal === FitnessGoal.HYPERTROPHY || goal === FitnessGoal.GAIN_MUSCLE;
    const isStrength = goal === FitnessGoal.STRENGTH || goal === FitnessGoal.ATHLETIC;

    if (days <= 2) {
      // Full Body for brief frequency
      return Array(days).fill(null).map((_, i) => ({
        name: `Full Body Session ${i + 1}`,
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'biceps', 'triceps', 'core'],
      }));
    }

    if (days === 3) {
      if (isHypertrophy) {
        return [
          { name: 'Push Day', muscleGroups: ['chest', 'shoulders', 'triceps'] },
          { name: 'Pull Day', muscleGroups: ['back', 'biceps'] },
          { name: 'Legs Day', muscleGroups: ['quads', 'hamstrings', 'core'] },
        ];
      }
      // Strength/Fat Loss/Endurance 3 days: Full Body focus
      return [
        { name: 'Full Body A', muscleGroups: ['chest', 'back', 'quads', 'shoulders'] },
        { name: 'Full Body B', muscleGroups: ['hamstrings', 'back', 'biceps', 'triceps'] },
        { name: 'Full Body C', muscleGroups: ['chest', 'quads', 'shoulders', 'core'] },
      ];
    }

    if (days === 4) {
      if (isHypertrophy || isStrength) {
        return [
          { name: 'Upper Body A', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
          { name: 'Lower Body A', muscleGroups: ['quads', 'hamstrings', 'core'] },
          { name: 'Upper Body B', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
          { name: 'Lower Body B', muscleGroups: ['quads', 'hamstrings', 'core'] },
        ];
      }
      // Fat Loss/Endurance 4 days: Circuits/Full Body split
      return Array(4).fill(null).map((_, i) => ({
        name: `Conditioning Circuit ${i + 1}`,
        muscleGroups: ['chest', 'back', 'quads', 'hamstrings', 'shoulders', 'core'],
      }));
    }

    // 5 or 6 Days
    return [
      { name: 'Push Day', muscleGroups: ['chest', 'shoulders', 'triceps'] },
      { name: 'Pull Day', muscleGroups: ['back', 'biceps'] },
      { name: 'Legs Day', muscleGroups: ['quads', 'hamstrings', 'core'] },
      { name: 'Upper Day', muscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'] },
      { name: 'Lower Day', muscleGroups: ['quads', 'hamstrings', 'core'] },
    ];
  }

  private getExerciseRank(ex: Exercise): number {
    const eqName = ex.equipment?.name.toLowerCase() || '';
    const muscleName = ex.muscleGroup?.name.toLowerCase() || '';
    const isCompoundEquipment = ['barbell', 'dumbbell', 'bodyweight'].includes(eqName);
    const isCompoundMuscle = ['chest', 'back', 'quads', 'hamstrings'].includes(muscleName);

    if (isCompoundEquipment && isCompoundMuscle) {
      return 1; // Compound priority
    }

    const isAccessoryEquipment = ['machine', 'cable', 'kettlebell'].includes(eqName);
    if (isAccessoryEquipment) {
      return 2; // Accessory priority
    }

    return 3; // Isolation priority
  }

  private mapToWorkoutGoal(goal: FitnessGoal): WorkoutGoal {
    switch (goal) {
      case FitnessGoal.LOSE_FAT:
      case FitnessGoal.FAT_LOSS:
        return WorkoutGoal.FAT_LOSS;
      case FitnessGoal.GAIN_MUSCLE:
      case FitnessGoal.HYPERTROPHY:
        return WorkoutGoal.HYPERTROPHY;
      case FitnessGoal.STRENGTH:
      case FitnessGoal.ATHLETIC:
        return WorkoutGoal.STRENGTH;
      case FitnessGoal.ENDURANCE:
      case FitnessGoal.STAY_ACTIVE:
        return WorkoutGoal.ENDURANCE;
      default:
        return WorkoutGoal.HYPERTROPHY;
    }
  }

  private mapToWorkoutLevel(level: FitnessLevel): WorkoutLevel {
    switch (level) {
      case FitnessLevel.BEGINNER:
        return WorkoutLevel.BEGINNER;
      case FitnessLevel.INTERMEDIATE:
        return WorkoutLevel.INTERMEDIATE;
      case FitnessLevel.ADVANCED:
        return WorkoutLevel.ADVANCED;
      default:
        return WorkoutLevel.BEGINNER;
    }
  }

  private capitalize(s: string): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
}
