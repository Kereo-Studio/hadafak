import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested, IsString, IsEnum, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SetLogDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  setNumber: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  reps: number;

  @ApiProperty({ example: 60.5 })
  @IsNumber()
  weight: number;

  @ApiProperty({ example: 'normal', enum: ['warmup', 'normal', 'dropset', 'failure'] })
  @IsOptional()
  @IsEnum(['warmup', 'normal', 'dropset', 'failure'])
  type?: 'warmup' | 'normal' | 'dropset' | 'failure';

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;
}

export class ExerciseLogDto {
  @ApiProperty({ example: 'a10067b8-51ef-4d81-8c44-08c168ccda42' })
  @IsUUID()
  exerciseId: string;

  @ApiProperty({ type: [SetLogDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SetLogDto)
  sets: SetLogDto[];
}

export class LogWorkoutDto {
  @ApiProperty({ example: '406f50c9-3faf-46f5-89a9-683518bcf366', required: false })
  @IsOptional()
  @IsUUID()
  programDayId?: string;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsOptional()
  @IsString()
  date?: string;

  @ApiProperty({ example: 45 })
  @IsNumber()
  duration: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  completed: boolean;

  @ApiProperty({ example: 8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  rpe?: number;

  @ApiProperty({ type: [ExerciseLogDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseLogDto)
  logs: ExerciseLogDto[];
}
