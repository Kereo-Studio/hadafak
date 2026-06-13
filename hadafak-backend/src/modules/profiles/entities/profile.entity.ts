import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Program } from '../../programs/entities/program.entity';

export enum FitnessGoal {
  GAIN_MUSCLE = 'gain_muscle',
  LOSE_FAT = 'lose_fat',
  STAY_ACTIVE = 'stay_active',
  ATHLETIC = 'athletic',
  FAT_LOSS = 'fat_loss',
  HYPERTROPHY = 'hypertrophy',
  STRENGTH = 'strength',
  ENDURANCE = 'endurance',
}

export enum FitnessLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum EquipmentAccess {
  GYM = 'gym',
  HOME = 'home',
  NONE = 'none',
}

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @OneToOne(() => User, (user) => user.profile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: FitnessGoal,
    default: FitnessGoal.STAY_ACTIVE,
  })
  goal: FitnessGoal;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ name: 'training_days', type: 'int', nullable: true })
  trainingDays: number;

  @Column({ name: 'training_location', nullable: true })
  trainingLocation: string;

  @Column({ name: 'daily_calories', type: 'int', nullable: true })
  dailyCalories: number;

  @Column({ name: 'daily_protein', type: 'int', nullable: true })
  dailyProtein: number;

  @Column({ name: 'daily_water', type: 'int', nullable: true })
  dailyWater: number;

  @Column({ name: 'daily_steps', type: 'int', nullable: true })
  dailySteps: number;

  @Column({ name: 'current_program_id', nullable: true })
  currentProgramId: string;

  @ManyToOne(() => Program, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_program_id' })
  currentProgram: Program;

  @Column({ name: 'body_fat_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
  bodyFatPercentage: number;

  @Column({
    name: 'fitness_level',
    type: 'enum',
    enum: FitnessLevel,
    default: FitnessLevel.BEGINNER,
  })
  fitnessLevel: FitnessLevel;

  @Column({ name: 'days_per_week_available', type: 'int', default: 3 })
  daysPerWeekAvailable: number;

  @Column({ name: 'session_duration_minutes', type: 'int', default: 60 })
  sessionDurationMinutes: number;

  @Column({
    name: 'equipment_access',
    type: 'enum',
    enum: EquipmentAccess,
    default: EquipmentAccess.GYM,
  })
  equipmentAccess: EquipmentAccess;

  @Column({ type: 'jsonb', default: [] })
  injuries: string[];

  @Column({ nullable: true })
  preferences: string;
}
