import { IsString, IsEnum, IsBoolean, IsOptional, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkoutGoal, WorkoutLevel } from '../entities/workout-plan.entity';

class WorkoutExerciseInputDto {
  @IsString()
  exerciseId: string;

  @IsNumber()
  sets: number;

  @IsString()
  reps: string;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsNumber()
  @IsOptional()
  restTimeSeconds?: number;

  @IsNumber()
  @IsOptional()
  dayNumber?: number;
}


export class CreateWorkoutPlanDto {
  @IsString()
  name: string;

  @IsEnum(WorkoutGoal)
  @IsOptional()
  goal?: WorkoutGoal;

  @IsEnum(WorkoutLevel)
  @IsOptional()
  level?: WorkoutLevel;

  @IsBoolean()
  @IsOptional()
  isTemplate?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseInputDto)
  @IsOptional()
  exercises?: WorkoutExerciseInputDto[];
}
