import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Recipe } from './recipe.entity';
import { Food } from '../../nutrition/entities/food.entity';

@Entity('recipe_ingredients')
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ name: 'food_id', type: 'uuid', nullable: true })
  foodId?: string | null;

  @ManyToOne(() => Food, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'food_id' })
  food?: Food | null;

  @Column({ name: 'custom_name', type: 'varchar', nullable: true })
  customName?: string | null;

  @Column({ type: 'decimal', precision: 6, scale: 2 }) // scale multiplier (e.g., 2.0 = 200g of food item)
  amount: number;

  @Column({ default: 'g' })
  unit: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
