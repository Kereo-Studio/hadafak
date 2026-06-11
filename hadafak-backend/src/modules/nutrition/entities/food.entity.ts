import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { NutritionLog } from './nutrition-log.entity';

export enum FoodSource {
  DATABASE = 'database',
  USER = 'user',
  AI = 'ai',
}

@Entity('foods')
export class Food {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  barcode?: string | null;

  @Column({ type: 'enum', enum: FoodSource, default: FoodSource.DATABASE })
  source: FoodSource;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User | null;

  @Column({ type: 'decimal', precision: 6, scale: 2 }) // per serving size (default 100g/ml)
  calories: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  protein: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  carbs: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  fat: number;

  @Column({ name: 'serving_size', type: 'decimal', precision: 6, scale: 2, default: 100 })
  servingSize: number;

  @Column({ name: 'serving_unit', default: 'g' })
  servingUnit: string;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl?: string | null;

  @OneToMany(() => NutritionLog, (log) => log.food)
  logs: NutritionLog[];
}
