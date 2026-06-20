import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('coach_insights')
export class CoachInsight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column('text')
  message: string;

  @Column('jsonb', { nullable: true })
  adaptations: object;

  @Column({ name: 'week_start', type: 'date' })
  weekStart: string;

  @Column({ default: false })
  applied: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
