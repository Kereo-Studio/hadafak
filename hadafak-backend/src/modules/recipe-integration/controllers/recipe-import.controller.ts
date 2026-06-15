import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RecipeImportService } from '../services/recipe-import.service';
import { ImportRecipesDto } from '../dto/import.dto';

@ApiTags('Admin Recipe Import')
@Controller('recipe-import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecipeImportController {
  constructor(private readonly importService: RecipeImportService) {}

  @Post('import')
  @ApiOperation({ summary: 'Trigger recipe import from external providers (TheMealDB, RecipeNLG, FoodCom)' })
  @ApiResponse({ status: 202, description: 'Import job created and processing in background.' })
  async startImport(@Body() dto: ImportRecipesDto) {
    return this.importService.startImport(dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Trigger scheduled incremental synchronization logic' })
  async syncRecipes() {
    // Convenience endpoint for incremental sync triggers
    return this.importService.startImport({
      provider: 'TheMealDB',
      limit: 5,
      offset: 0,
    });
  }

  @Get('status')
  @ApiOperation({ summary: 'Get status history of all recipe import jobs' })
  async getStatus() {
    return this.importService.getJobs();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Retrieve running text logs of a specific import job ID' })
  @ApiQuery({ name: 'jobId', required: true })
  async getLogs(@Query('jobId') jobId: string) {
    return this.importService.getLogs(jobId);
  }
}
