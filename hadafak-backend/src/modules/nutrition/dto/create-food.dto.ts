import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class CreateFoodDto {
  @ApiProperty({ example: 'Peanut Butter' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1234567890', required: false })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: 588 })
  @IsNumber()
  calories: number;

  @ApiProperty({ example: 25 })
  @IsNumber()
  protein: number;

  @ApiProperty({ example: 20 })
  @IsNumber()
  carbs: number;

  @ApiProperty({ example: 50 })
  @IsNumber()
  fat: number;

  @ApiProperty({ example: 100, required: false })
  @IsOptional()
  @IsNumber()
  servingSize?: number;

  @ApiProperty({ example: 'g', required: false })
  @IsOptional()
  @IsString()
  servingUnit?: string;

  @ApiProperty({ example: 'https://example.com/pb.jpg', required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
