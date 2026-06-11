import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class SubstituteIngredientDto {
  @ApiProperty({ example: 'a0b9432d-3cb8-482a-9bf2-75d5a882a991', description: 'The recipe ingredient ID to substitute' })
  @IsUUID()
  recipeIngredientId: string;

  @ApiProperty({ example: 'Cottage Cheese', description: 'The name of the replacement item' })
  @IsString()
  substituteName: string;
}
