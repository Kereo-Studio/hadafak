import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateMemoryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  injuries?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  avoidedFoods?: string[];

  @IsOptional()
  preferences?: Record<string, unknown>;
}
