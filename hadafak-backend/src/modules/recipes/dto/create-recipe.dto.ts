import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsArray, IsNumber, Min, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRecipeIngredientDto {
  @ApiProperty({ example: 'a0b9432d-3cb8-482a-9bf2-75d5a882a991', required: false })
  @IsOptional()
  @IsUUID()
  foodId?: string;

  @ApiProperty({ example: 'Salt', required: false })
  @IsOptional()
  @IsString()
  customName?: string;

  @ApiProperty({ example: 1.50, description: '1.50 servings or 150g' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'g' })
  @IsString()
  unit: string;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Banana Oatmeal Pancakes' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Delicious and healthy protein-packed breakfast option.' })
  @IsString()
  description: string;

  @ApiProperty({ example: ['Mash banana in a bowl', 'Add oats and eggs', 'Cook on a pan'] })
  @IsArray()
  @IsString({ each: true })
  instructions: string[];

  @ApiProperty({ example: 5 })
  @IsInt()
  @Min(0)
  prepTime: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  cookTime: number;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  servings: number;

  @ApiProperty({ example: 'https://example.com/image.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: ['Breakfast', 'High-Protein'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ type: [CreateRecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  ingredients: CreateRecipeIngredientDto[];
}
