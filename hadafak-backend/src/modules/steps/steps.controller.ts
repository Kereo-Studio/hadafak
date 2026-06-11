import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StepsService } from './steps.service';
import { SyncStepsDto } from './dto/sync-steps.dto';
import { LogManualStepsDto } from './dto/log-manual-steps.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Steps & Daily Activity')
@Controller('steps')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StepsController {
  constructor(private readonly stepsService: StepsService) {}

  @Post('sync')
  @ApiOperation({ summary: 'Batch upload step logs from phone sensors (accelerometer / health APIs)' })
  @ApiResponse({ status: 201, description: 'Step logs synced successfully.' })
  async syncIntervals(
    @CurrentUser('sub') userId: string,
    @Body() dto: SyncStepsDto,
  ) {
    await this.stepsService.syncIntervals(userId, dto);
    return { message: 'Sync complete' };
  }

  @Post('manual')
  @ApiOperation({ summary: 'Manually adjust steps for a specific day' })
  @ApiResponse({ status: 201, description: 'Steps logged manually.' })
  async logManual(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogManualStepsDto,
  ) {
    return this.stepsService.logManual(userId, dto);
  }

  @Get('today')
  @ApiOperation({ summary: 'Retrieve today\'s total steps vs daily target goals' })
  @ApiQuery({ name: 'date', required: false, description: 'Defaults to current date if omitted' })
  async getDailySummary(
    @CurrentUser('sub') userId: string,
    @Query('date') date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.stepsService.getDailySummary(userId, targetDate);
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve daily step counts between start and end dates' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-06-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-06-07' })
  async getHistory(
    @CurrentUser('sub') userId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.stepsService.getHistory(userId, startDate, endDate);
  }

  @Get('streak')
  @ApiOperation({ summary: 'Retrieve user\'s current active streak and maximum all-time records' })
  async getStreakInfo(@CurrentUser('sub') userId: string) {
    return this.stepsService.getStreakInfo(userId);
  }
}
