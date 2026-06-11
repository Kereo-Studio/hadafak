import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PhotoAngle } from '../entities/progress-photo.entity';

export class UploadPhotoDto {
  @ApiProperty({ enum: PhotoAngle, description: 'Angle of the progress photo', example: PhotoAngle.FRONT })
  @IsEnum(PhotoAngle)
  angle: PhotoAngle;

  @ApiPropertyOptional({ description: 'Date of the progress photo (YYYY-MM-DD)', example: '2026-06-10' })
  @IsOptional()
  @IsDateString()
  date?: string;
}
