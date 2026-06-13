import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkoutPlan } from '../../workouts/entities/workout-plan.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

export enum DifficultyFeedback {
  EASY = 'easy',
  OK = 'ok',
  HARD = 'hard',
}

@Entity('performance_logs')
export class PerformanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'workout_id' })
  @Index()
  workoutId: string;

  @ManyToOne(() => WorkoutPlan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workout_id' })
  workoutPlan: WorkoutPlan;

  @Column({ name: 'exercise_id' })
  @Index()
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ name: 'planned_sets', type: 'int' })
  plannedSets: number;

  @Column({ name: 'completed_sets', type: 'int' })
  completedSets: number;

  @Column({ name: 'planned_reps', type: 'int' })
  plannedReps: number;

  @Column({ name: 'completed_reps', type: 'int' })
  completedReps: number;

  @Column({ name: 'weight_used', type: 'decimal', precision: 5, scale: 2, nullable: true })
  weightUsed: number;

  @Column({ name: 'fatigue_rating', type: 'int' })
  fatigueRating: number;

  @Column({
    name: 'difficulty_feedback',
    type: 'enum',
    enum: DifficultyFeedback,
  })
  difficultyFeedback: DifficultyFeedback;

  @Column({ type: 'boolean', default: false })
  skipped: boolean;

  @Column({ type: 'date' })
  date: string;
}
