import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProgramDay } from './program-day.entity';
import { Exercise } from '../../exercises/entities/exercise.entity';

@Entity('program_day_exercises')
export class ProgramDayExercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'program_day_id' })
  programDayId: string;

  @ManyToOne(() => ProgramDay, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_day_id' })
  programDay: ProgramDay;

  @Column({ name: 'exercise_id' })
  exerciseId: string;

  @ManyToOne(() => Exercise, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @Column({ type: 'int', default: 1 })
  order: number;

  @Column({ name: 'target_sets', type: 'int', default: 3 })
  targetSets: number;

  @Column({ name: 'target_reps_range', default: '8-12' })
  targetRepsRange: string;

  @Column({ name: 'target_rest_time', type: 'int', default: 90 }) // in seconds
  targetRestTime: number;
}
