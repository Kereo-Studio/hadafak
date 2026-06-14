import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsOptional, Min, Max, IsArray } from 'class-validator';
import { FitnessGoal, FitnessLevel, EquipmentAccess } from '../entities/profile.entity';

export class CreateProfileDto {
  @ApiProperty({ enum: FitnessGoal, example: FitnessGoal.HYPERTROPHY })
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

  @ApiProperty({ example: 15.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(70)
  bodyFatPercentage?: number;

  @ApiProperty({ enum: FitnessLevel, example: FitnessLevel.BEGINNER, required: false })
  @IsOptional()
  @IsEnum(FitnessLevel)
  fitnessLevel?: FitnessLevel;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeekAvailable?: number;

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(240)
  sessionDurationMinutes?: number;

  @ApiProperty({ enum: EquipmentAccess, example: EquipmentAccess.GYM, required: false })
  @IsOptional()
  @IsEnum(EquipmentAccess)
  equipmentAccess?: EquipmentAccess;

  @ApiProperty({ example: ['shoulder injury'], required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuries?: string[];

  @ApiProperty({ example: 'strength training focus', required: false })
  @IsOptional()
  @IsString()
  preferences?: string;

  @ApiProperty({ example: 'John Doe', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: '/uploads/avatars/123.jpg', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
