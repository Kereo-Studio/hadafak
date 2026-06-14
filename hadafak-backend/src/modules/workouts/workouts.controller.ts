import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workouts')
@Controller('workouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  @ApiOperation({ summary: 'Log or update a workout session (starts if none active)' })
  @ApiResponse({ status: 201, description: 'Workout successfully logged.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  async logSession(
    @CurrentUser('sub') userId: string,
    @Body() dto: LogWorkoutDto,
  ) {
    return this.workoutsService.logSession(userId, dto);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current user active workout session if any exists' })
  @ApiResponse({ status: 200, description: 'Active session details or null.' })
  async getActive(@CurrentUser('sub') userId: string) {
    return this.workoutsService.getActiveSession(userId);
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new active workout session' })
  @ApiResponse({ status: 201, description: 'Active session started successfully.' })
  async start(
    @CurrentUser('sub') userId: string,
    @Body('programDayId') programDayId?: string,
  ) {
    return this.workoutsService.startSession(userId, programDayId);
  }

  @Post('complete/:id')
  @ApiOperation({ summary: 'Complete an active workout session' })
  @ApiResponse({ status: 200, description: 'Workout marked as completed.' })
  async complete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body('duration') duration?: number,
    @Body('rpe') rpe?: number,
  ) {
    return this.workoutsService.completeSession(id, userId, duration, rpe);
  }

  @Get('stats/volume')
  @ApiOperation({ summary: 'Get total training volume trends over time' })
  @ApiResponse({ status: 200, description: 'Training volume stats list.' })
  async getVolumeStats(@CurrentUser('sub') userId: string) {
    return this.workoutsService.getVolumeProgress(userId);
  }

  @Get('stats/prs')
  @ApiOperation({ summary: 'Get personal records (max weight, max 1RM) per exercise' })
  @ApiResponse({ status: 200, description: 'Personal records map.' })
  async getPrsStats(@CurrentUser('sub') userId: string) {
    return this.workoutsService.getPersonalRecords(userId);
  }

  @Get('stats/progression/:exerciseId')
  @ApiOperation({ summary: 'Get progression statistics (1RM and volume) for a specific exercise over time' })
  @ApiResponse({ status: 200, description: 'Exercise progression metrics list.' })
  async getProgressionStats(
    @CurrentUser('sub') userId: string,
    @Param('exerciseId') exerciseId: string,
  ) {
    return this.workoutsService.getExerciseProgression(userId, exerciseId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Retrieve logged workout history for the user' })
  @ApiResponse({ status: 200, description: 'Workout history logs successfully retrieved.' })
  async getHistory(@CurrentUser('sub') userId: string) {
    return this.workoutsService.findUserHistory(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific workout session by ID' })
  @ApiResponse({ status: 200, description: 'Workout session details.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async getById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.workoutsService.findSessionById(id, userId);
  }
}
