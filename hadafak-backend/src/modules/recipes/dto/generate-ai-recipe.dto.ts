import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

export class GenerateAiRecipeDto {
  @ApiProperty({ example: ['chicken breast', 'rice', 'broccoli', 'garlic'], description: 'Ingredients available in the fridge' })
  @IsArray()
  @IsString({ each: true })
  ingredients: string[];

  @ApiProperty({ example: 'Give me a fast low-carb dinner recipe', required: false })
  @IsOptional()
  @IsString()
  prompt?: string;
}
