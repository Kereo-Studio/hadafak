import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity('coach_memories')
export class CoachMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', unique: true })
  userId: string;

  @Column('jsonb', { default: [] })
  injuries: string[];

  @Column({ name: 'avoided_foods', type: 'jsonb', default: [] })
  avoidedFoods: string[];

  @Column('jsonb', { default: {} })
  preferences: Record<string, unknown>;

  @Column({ name: 'plateau_log', type: 'jsonb', default: [] })
  plateauLog: { exercise: string; date: string }[];

  @Column({ name: 'coach_notes', type: 'text', nullable: true })
  coachNotes: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
