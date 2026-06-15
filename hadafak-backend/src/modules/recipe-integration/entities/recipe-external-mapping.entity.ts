import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';

@Entity('recipe_external_mappings')
@Index(['providerName', 'externalId'], { unique: true })
export class RecipeExternalMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'recipe_id' })
  recipeId: string;

  @ManyToOne(() => Recipe, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipe_id' })
  recipe: Recipe;

  @Column({ name: 'provider_name' })
  providerName: string;

  @Column({ name: 'external_id' })
  externalId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
