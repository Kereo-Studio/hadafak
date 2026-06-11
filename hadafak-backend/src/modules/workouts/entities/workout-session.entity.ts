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
import { ProgramDay } from '../../programs/entities/program-day.entity';
import { ExerciseLog } from './exercise-log.entity';

@Entity('workout_sessions')
export class WorkoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.workoutSessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'program_day_id', nullable: true })
  programDayId?: string | null;

  @ManyToOne(() => ProgramDay, (programDay) => programDay.workoutSessions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'program_day_id' })
  programDay: ProgramDay;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @Column({ type: 'int', nullable: true }) // duration in minutes
  duration: number;

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @Column({ default: 'active' })
  status: 'active' | 'completed' | 'paused';

  @Column({ type: 'int', nullable: true }) // overall workout session RPE (1-10)
  rpe?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExerciseLog, (log) => log.workoutSession, { cascade: true })
  exerciseLogs: ExerciseLog[];
}
