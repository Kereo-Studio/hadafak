import { Controller, Post, Get, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RunsService } from './runs.service';
import { CreateRunSessionDto } from './dto/create-run-session.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Map & GPS Run Sessions')
@Controller('runs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RunsController {
  constructor(private readonly runsService: RunsService) {}

  @Post()
  @ApiOperation({ summary: 'Save a completed GPS run/activity session' })
  @ApiResponse({ status: 201, description: 'Run session successfully recorded.' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateRunSessionDto,
  ) {
    return this.runsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve summary of all running sessions (excluding heavy coordinate arrays)' })
  @ApiResponse({ status: 200, description: 'List of running session summaries.' })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.runsService.findAll(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get aggregated statistics of GPS run sessions' })
  @ApiResponse({ status: 200, description: 'Aggregated analytics and activity type breakdown.' })
  async getStats(@CurrentUser('sub') userId: string) {
    return this.runsService.getStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get full details of a specific run session (includes GPS coordinates)' })
  @ApiResponse({ status: 200, description: 'Details of the selected run session.' })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.runsService.findOne(userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific run session' })
  @ApiResponse({ status: 204, description: 'Successfully deleted the session.' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.runsService.remove(userId, id);
  }
}
