import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

export enum RecipeSource {
  DATABASE = 'database',
  USER = 'user',
  AI = 'ai',
}

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb' })
  instructions: string[];

  @Column({ name: 'prep_time', type: 'int', default: 0 })
  prepTime: number;

  @Column({ name: 'cook_time', type: 'int', default: 0 })
  cookTime: number;

  @Column({ type: 'int', default: 1 })
  servings: number;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl?: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  calories: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  protein: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  carbs: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  fat: number;

  @Column({ type: 'enum', enum: RecipeSource, default: RecipeSource.DATABASE })
  source: RecipeSource;

  @Column({ type: 'jsonb', default: [] })
  tags: string[];

  @Column({ name: 'creator_id', type: 'uuid', nullable: true })
  creatorId?: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'creator_id' })
  creator?: User | null;

  @OneToMany(() => RecipeIngredient, (ingredient) => ingredient.recipe, { cascade: true })
  ingredients: RecipeIngredient[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
