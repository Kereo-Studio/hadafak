import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ActivityType {
  RUN = 'run',
  WALK = 'walk',
  CYCLING = 'cycling',
  HIKING = 'hiking',
}

@Entity('run_sessions')
export class RunSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', default: 'Outdoor Run' })
  title: string;

  @Column({
    type: 'enum',
    enum: ActivityType,
    default: ActivityType.RUN,
  })
  activityType: ActivityType;

  @Column({ name: 'start_time', type: 'timestamp' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamp' })
  endTime: Date;

  @Column({ name: 'duration_seconds', type: 'int' })
  durationSeconds: number;

  @Column({ name: 'distance_km', type: 'decimal', precision: 8, scale: 2 })
  distanceKm: number;

  @Column({ name: 'avg_pace_min_per_km', type: 'decimal', precision: 8, scale: 2, nullable: true })
  avgPaceMinPerKm: number;

  @Column({ name: 'calories_burned', type: 'int', nullable: true })
  caloriesBurned: number;

  @Column({ name: 'route_coordinates', type: 'jsonb', nullable: true })
  routeCoordinates: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    speed: number;       // m/s — used for pace heatmap coloring
    elapsedTime: number; // seconds since start — used for ghost runner
  }>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
