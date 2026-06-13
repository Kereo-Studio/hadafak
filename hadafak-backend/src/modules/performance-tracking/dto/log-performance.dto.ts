import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsEnum, IsBoolean, IsOptional, IsString, Min, Max } from 'class-validator';
import { DifficultyFeedback } from '../entities/performance-log.entity';

export class LogPerformanceDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  workoutId: string;

  @ApiProperty({ example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  plannedSets: number;

  @ApiProperty({ example: 3 })
  @IsNumber()
  completedSets: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  plannedReps: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  completedReps: number;

  @ApiProperty({ example: 60.0, required: false })
  @IsOptional()
  @IsNumber()
  weightUsed?: number;

  @ApiProperty({ example: 7 })
  @IsNumber()
  @Min(1)
  @Max(10)
  fatigueRating: number;

  @ApiProperty({ enum: DifficultyFeedback, example: DifficultyFeedback.OK })
  @IsEnum(DifficultyFeedback)
  difficultyFeedback: DifficultyFeedback;

  @ApiProperty({ example: false })
  @IsBoolean()
  skipped: boolean;

  @ApiProperty({ example: '2026-06-13', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
