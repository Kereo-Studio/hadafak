import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { WorkoutPlan } from './workout-plan.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity('workout_exercises')
export class WorkoutExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workout_plan_id' })
  workoutPlanId: string;

  @ManyToOne(() => WorkoutPlan, (plan) => plan.workoutExercises, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_plan_id' })
  workoutPlan: WorkoutPlan;

  @Column({ name: 'exercise_id' })
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int', default: 3 })
  sets: number;

  @Column()
  reps: string; // e.g. "8-12" or "10"

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight?: number | null;

  @Column({ name: 'rest_time_seconds', type: 'int', default: 90 })
  restTimeSeconds: number;

  @Column({ name: 'order_index', type: 'int', default: 0 })
  orderIndex: number;

  @Column({ name: 'day_number', type: 'int', default: 1 })
  dayNumber: number;
}

