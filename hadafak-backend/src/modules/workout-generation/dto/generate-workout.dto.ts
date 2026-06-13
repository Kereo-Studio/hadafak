import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { FitnessGoal, FitnessLevel } from '../../profiles/entities/profile.entity';

export class GenerateWorkoutDto {
  @ApiProperty({ enum: FitnessGoal, required: false })
  @IsOptional()
  @IsEnum(FitnessGoal)
  goal?: FitnessGoal;

  @ApiProperty({ enum: FitnessLevel, required: false })
  @IsOptional()
  @IsEnum(FitnessLevel)
  level?: FitnessLevel;

  @ApiProperty({ example: 3, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(7)
  daysPerWeek?: number;
}
