import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class LogManualStepsDto {
  @ApiProperty({ example: 8000 })
  @IsInt()
  @Min(0)
  steps: number;

  @ApiProperty({ example: '2026-06-10', required: false })
  @IsOptional()
  @IsString()
  date?: string;
}
