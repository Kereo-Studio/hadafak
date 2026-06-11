import { IsNumber, IsOptional, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogMetricDto {
  @ApiPropertyOptional({ description: 'Date of the metric entry (YYYY-MM-DD)', example: '2026-06-10' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiProperty({ description: 'Weight in kilograms', example: 75.5 })
  @IsNumber()
  @Min(20)
  @Max(500)
  weight: number;

  @ApiPropertyOptional({ description: 'Body fat percentage', example: 15.4 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(70)
  bodyFatPercentage?: number;

  @ApiPropertyOptional({ description: 'Skeletal muscle mass in kg', example: 34.2 })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(200)
  skeletalMuscleMass?: number;

  @ApiPropertyOptional({ description: 'Waist circumference in cm', example: 82.5 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  waist?: number;

  @ApiPropertyOptional({ description: 'Chest circumference in cm', example: 102.0 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  chest?: number;

  @ApiPropertyOptional({ description: 'Shoulders circumference in cm', example: 115.0 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  shoulders?: number;

  @ApiPropertyOptional({ description: 'Left bicep circumference in cm', example: 38.0 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  leftBicep?: number;

  @ApiPropertyOptional({ description: 'Right bicep circumference in cm', example: 38.2 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(100)
  rightBicep?: number;

  @ApiPropertyOptional({ description: 'Left thigh circumference in cm', example: 58.0 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(150)
  leftThigh?: number;

  @ApiPropertyOptional({ description: 'Right thigh circumference in cm', example: 58.5 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(150)
  rightThigh?: number;

  @ApiPropertyOptional({ description: 'Neck circumference in cm', example: 37.5 })
  @IsOptional()
  @IsNumber()
  @Min(15)
  @Max(100)
  neck?: number;

  @ApiPropertyOptional({ description: 'Hips circumference in cm', example: 94.0 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  hips?: number;
}
