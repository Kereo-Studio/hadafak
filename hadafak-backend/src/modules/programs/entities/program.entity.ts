import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProgramDay } from './program-day.entity';

export enum ProgramLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export type ProgramLocation = 'gym' | 'home';

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ProgramLevel,
    default: ProgramLevel.BEGINNER,
  })
  level: ProgramLevel;

  @Column({ name: 'location', type: 'varchar', default: 'gym' })
  location: ProgramLocation;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ProgramDay, (day) => day.program, { cascade: true })
  days: ProgramDay[];
}
