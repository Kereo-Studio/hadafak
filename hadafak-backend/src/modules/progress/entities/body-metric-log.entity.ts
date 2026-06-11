import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('body_metric_logs')
export class BodyMetricLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: string;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  weight: number; // in kg

  @Column({ name: 'body_fat_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyFatPercentage?: number | null;

  @Column({ name: 'skeletal_muscle_mass', type: 'decimal', precision: 5, scale: 2, nullable: true })
  skeletalMuscleMass?: number | null;

  // Circumferences (all in cm)
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  waist?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  chest?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  shoulders?: number | null;

  @Column({ name: 'left_bicep', type: 'decimal', precision: 5, scale: 2, nullable: true })
  leftBicep?: number | null;

  @Column({ name: 'right_bicep', type: 'decimal', precision: 5, scale: 2, nullable: true })
  rightBicep?: number | null;

  @Column({ name: 'left_thigh', type: 'decimal', precision: 5, scale: 2, nullable: true })
  leftThigh?: number | null;

  @Column({ name: 'right_thigh', type: 'decimal', precision: 5, scale: 2, nullable: true })
  rightThigh?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  neck?: number | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  hips?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
