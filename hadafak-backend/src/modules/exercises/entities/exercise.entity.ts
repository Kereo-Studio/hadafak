import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExerciseLog } from '../../workouts/entities/exercise-log.entity';
import { MuscleGroup } from './muscle-group.entity';
import { Equipment } from './equipment.entity';

export enum ExerciseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ExerciseSource {
  INTERNAL = 'internal',
  EXERCIDEDB = 'exercicedb',
  WGER = 'wger',
}

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // unique normalized lowercase key: e.g. "push-up"

  @Column({ name: 'display_name', nullable: true })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => MuscleGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'muscle_group_id' })
  muscleGroup: MuscleGroup;

  @ManyToMany(() => MuscleGroup)
  @JoinTable({
    name: 'exercise_secondary_muscles',
    joinColumn: { name: 'exercise_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'muscle_group_id', referencedColumnName: 'id' },
  })
  secondaryMuscles: MuscleGroup[];

  @ManyToOne(() => Equipment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'equipment_id' })
  equipment: Equipment;

  @Column({
    type: 'enum',
    enum: ExerciseDifficulty,
    default: ExerciseDifficulty.BEGINNER,
  })
  difficulty: ExerciseDifficulty;

  @Column({ type: 'jsonb', default: [] })
  instructions: string[];

  @Column({ name: 'gif_url', nullable: true })
  gifUrl?: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl?: string;

  @Column({
    type: 'enum',
    enum: ExerciseSource,
    default: ExerciseSource.INTERNAL,
  })
  source: ExerciseSource;

  @Column({ name: 'external_id', nullable: true })
  externalId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ExerciseLog, (log) => log.exercise)
  logs: ExerciseLog[];
}
