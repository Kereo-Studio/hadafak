import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('equipment')
export class Equipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // bodyweight, dumbbell, barbell, machine, cable, kettlebell, etc.
}
