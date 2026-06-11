import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Program } from './program.entity';
import { WorkoutSession } from '../../workouts/entities/workout-session.entity';
import { ProgramDayExercise } from './program-day-exercise.entity';

@Entity('program_days')
export class ProgramDay {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_id' })
  programId: string;

  @ManyToOne(() => Program, (program) => program.days, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({ name: 'day_number', type: 'int' })
  dayNumber: number;

  @Column()
  title: string;

  @OneToMany(() => WorkoutSession, (session) => session.programDay)
  workoutSessions: WorkoutSession[];

  @OneToMany(() => ProgramDayExercise, (pde) => pde.programDay, { cascade: true })
  exercises: ProgramDayExercise[];
}
