import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class LogWaterDto {
  @ApiProperty({ example: 250 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
