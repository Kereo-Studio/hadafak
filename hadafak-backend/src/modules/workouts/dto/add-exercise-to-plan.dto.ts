import { IsString, IsNumber, IsOptional } from 'class-validator';

export class AddExerciseToPlanDto {
  @IsString()
  exerciseId: string;

  @IsNumber()
  @IsOptional()
  sets?: number;

  @IsString()
  @IsOptional()
  reps?: string;

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

