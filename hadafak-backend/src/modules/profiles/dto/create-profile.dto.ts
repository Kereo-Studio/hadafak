import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';
import { FitnessGoal } from '../entities/profile.entity';

export class CreateProfileDto {
  @ApiProperty({ enum: FitnessGoal, example: FitnessGoal.LOSE_FAT })
  @IsEnum(FitnessGoal)
  goal: FitnessGoal;

  @ApiProperty({ example: 25 })
  @IsNumber()
  @Min(1)
  @Max(120)
  age: number;

  @ApiProperty({ example: 'male' })
  @IsString()
  gender: string;

  @ApiProperty({ example: 75.5 })
  @IsNumber()
  @Min(10)
  @Max(500)
  weight: number;

  @ApiProperty({ example: 178.0 })
  @IsNumber()
  @Min(50)
  @Max(300)
  height: number;

  @ApiProperty({ example: 4 })
  @IsNumber()
  @Min(1)
  @Max(7)
  trainingDays: number;

  @ApiProperty({ example: 'gym', description: 'gym or home' })
  @IsString()
  trainingLocation: string;

  @ApiProperty({ example: 2200, required: false })
  @IsOptional()
  @IsNumber()
  dailyCalories?: number;

  @ApiProperty({ example: 150, required: false })
  @IsOptional()
  @IsNumber()
  dailyProtein?: number;

  @ApiProperty({ example: 3000, required: false })
  @IsOptional()
  @IsNumber()
  dailyWater?: number;

  @ApiProperty({ example: 10000, required: false })
  @IsOptional()
  @IsNumber()
  dailySteps?: number;
}
