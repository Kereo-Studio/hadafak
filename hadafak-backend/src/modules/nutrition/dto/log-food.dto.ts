import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsOptional, IsEnum, IsString } from 'class-validator';
import { MealType } from '../entities/nutrition-log.entity';

export class LogFoodDto {
  @ApiProperty({ example: 'a10067b8-51ef-4d81-8c44-08c168ccda42' })
  @IsUUID()
  foodId: string;

  @ApiProperty({ example: 1.5 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ example: MealType.BREAKFAST, enum: MealType })
  @IsEnum(MealType)
  mealType: MealType;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
