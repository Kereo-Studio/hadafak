import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MealType } from '../../nutrition/entities/nutrition-log.entity';

export class LogRecipeDto {
  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @Min(0.1)
  servings: number;

  @ApiProperty({ example: MealType.LUNCH, enum: MealType })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
