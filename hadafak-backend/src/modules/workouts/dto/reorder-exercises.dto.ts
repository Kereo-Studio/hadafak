import { IsArray, IsString } from 'class-validator';

export class ReorderExercisesDto {
  @IsArray()
  @IsString({ each: true })
  workoutExerciseIds: string[];
}
