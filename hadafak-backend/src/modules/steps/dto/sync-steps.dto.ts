import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsEnum, IsOptional, IsString, Min, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { StepSource } from '../entities/step-interval.entity';

export class StepIntervalDto {
  @ApiProperty({ example: '2026-06-10T17:00:00.000Z' })
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2026-06-10T17:15:00.000Z' })
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 1200 })
  @IsInt()
  @Min(0)
  steps: number;

  @ApiProperty({ example: StepSource.SENSOR, enum: StepSource })
  @IsEnum(StepSource)
  source: StepSource;

  @ApiProperty({ example: 'Afternoon Walk', required: false })
  @IsOptional()
  @IsString()
  activityName?: string;
}

export class SyncStepsDto {
  @ApiProperty({ type: [StepIntervalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepIntervalDto)
  intervals: StepIntervalDto[];
}
