import { IsString, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';
import { ExerciseDifficulty } from '../entities/exercise.entity';

export class CreateExerciseDto {
  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  muscleGroupName: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  secondaryMuscleGroupNames?: string[];

  @IsString()
  equipmentName: string;

  @IsEnum(ExerciseDifficulty)
  difficulty: ExerciseDifficulty;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instructions?: string[];

  @IsString()
  @IsOptional()
  gifUrl?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;
}
