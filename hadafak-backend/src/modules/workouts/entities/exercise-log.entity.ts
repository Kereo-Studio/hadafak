import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkoutSession } from './workout-session.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

export interface ExerciseSetLog {
  setNumber: number;
  reps: number;
  weight: number;
  type: 'warmup' | 'normal' | 'dropset' | 'failure';
  rpe?: number;
}

@Entity('exercise_logs')
export class ExerciseLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workout_session_id' })
  workoutSessionId: string;

  @ManyToOne(() => WorkoutSession, (session) => session.exerciseLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workout_session_id' })
  workoutSession: WorkoutSession;

  @Column({ name: 'exercise_id' })
  exerciseId: string;

  @ManyToOne(() => Exercise, (exercise) => exercise.logs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'jsonb', default: [] })
  sets: ExerciseSetLog[];

  @Column({ type: 'int', nullable: true })
  reps: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ name: 'one_rep_max', type: 'decimal', precision: 5, scale: 2, nullable: true })
  oneRepMax?: number | null;

  @Column({ type: 'int', nullable: true })
  rpe?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
