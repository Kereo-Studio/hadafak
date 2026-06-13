import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PerformanceTrackingService } from './performance-tracking.service';
import { LogPerformanceDto } from './dto/log-performance.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Performance Tracking')
@Controller('workouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PerformanceTrackingController {
  constructor(private readonly trackingService: PerformanceTrackingService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log exercise performance tracking stats' })
  @ApiResponse({ status: 201, description: 'Performance successfully logged.' })
  async logPerformance(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogPerformanceDto,
  ) {
    return this.trackingService.logPerformance(userId, dto);
  }

  @Get('history/:userId')
  @ApiOperation({ summary: 'Retrieve logged workout history for a specific user' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Successfully retrieved performance history.' })
  async getHistoryByUserId(
    @Param('userId') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.trackingService.getHistory(userId, Number(page) || 1, Number(limit) || 10);
  }
}
