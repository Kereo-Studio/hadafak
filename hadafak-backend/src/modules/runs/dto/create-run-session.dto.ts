import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min, IsArray } from 'class-validator';
import { ActivityType } from '../entities/run-session.entity';

export class CoordinateDto {
  @ApiProperty({ example: 37.7749 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: -122.4194 })
  @IsNumber()
  longitude: number;

  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  @IsString()
  timestamp: string;

  @ApiProperty({ example: 2.8, required: false })
  @IsOptional()
  @IsNumber()
  speed?: number;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  elapsedTime?: number;
}

export class CreateRunSessionDto {
  @ApiProperty({ example: 'Morning Run', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'run', enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiProperty({ example: '2026-06-11T08:00:00.000Z' })
  @IsNotEmpty()
  @IsString()
  startTime: string;

  @ApiProperty({ example: '2026-06-11T08:30:24.000Z' })
  @IsNotEmpty()
  @IsString()
  endTime: string;

  @ApiProperty({ example: 1824 })
  @IsInt()
  @Min(1)
  durationSeconds: number;

  @ApiProperty({ example: 5.24 })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ type: [CoordinateDto] })
  @IsArray()
  routeCoordinates: CoordinateDto[];
}
