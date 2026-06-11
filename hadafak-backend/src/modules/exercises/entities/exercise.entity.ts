import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ExerciseLog } from '../../workouts/entities/exercise-log.entity';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'muscle_group' })
  muscleGroup: string;

  @OneToMany(() => ExerciseLog, (log) => log.exercise)
  logs: ExerciseLog[];
}
