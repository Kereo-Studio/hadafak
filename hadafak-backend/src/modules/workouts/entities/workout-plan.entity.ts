import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { WorkoutExercise } from './workout-exercise.entity';

export enum WorkoutGoal {
  FAT_LOSS = 'fat_loss',
  HYPERTROPHY = 'hypertrophy',
  STRENGTH = 'strength',
  ENDURANCE = 'endurance',
}

export enum WorkoutLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

@Entity('workout_plans')
export class WorkoutPlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: WorkoutGoal,
    default: WorkoutGoal.HYPERTROPHY,
  })
  goal: WorkoutGoal;

  @Column({
    type: 'enum',
    enum: WorkoutLevel,
    default: WorkoutLevel.BEGINNER,
  })
  level: WorkoutLevel;

  @Column({ name: 'user_id', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ name: 'is_template', type: 'boolean', default: false })
  isTemplate: boolean;

  @OneToMany(() => WorkoutExercise, (workoutExercise) => workoutExercise.workoutPlan, {
    cascade: true,
  })
  workoutExercises: WorkoutExercise[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
