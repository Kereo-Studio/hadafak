import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('muscle_groups')
export class MuscleGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // chest, back, legs, shoulders, arms, core, etc.
}
