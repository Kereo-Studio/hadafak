import { IsString, IsOptional, IsInt, IsBoolean, Min, Max, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ImportRecipesDto {
  @ApiProperty({ example: 'TheMealDB', description: 'Provider name: TheMealDB, RecipeNLG, or FoodCom' })
  @IsString()
  provider: string;

  @ApiProperty({ example: 10, description: 'Number of recipes to fetch/import', required: false })
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsOptional()
  limit?: number;

  @ApiProperty({ example: 0, description: 'Offset/page position to import from', required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;

  @ApiProperty({ example: '/path/to/dataset.csv', description: 'Local path for file-based datasets', required: false })
  @IsString()
  @IsOptional()
  filePath?: string;

  @ApiProperty({ example: 'chicken', description: 'Query filter for API sources', required: false })
  @IsString()
  @IsOptional()
  query?: string;

  @ApiProperty({ example: '1', description: 'API Key if provider requires authentication', required: false })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ example: true, description: 'If true, duplicate recipes are skipped rather than failing the import', required: false })
  @IsBoolean()
  @IsOptional()
  skipDuplicates?: boolean;

  @ApiProperty({ example: 0.75, description: 'Minimum similarity score (0.0 to 1.0) to flag duplicate', required: false })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  similarityThreshold?: number;
}
