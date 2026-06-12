import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ScanFoodDto {
  @ApiProperty({ description: 'Base64 encoded image string of food' })
  @IsString()
  imageBase64: string;
}
