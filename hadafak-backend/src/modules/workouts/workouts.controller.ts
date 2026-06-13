import { Controller, Post, Get, Body, Param, UseGuards, Delete, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { LogWorkoutDto } from './dto/log-workout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { AddExerciseToPlanDto } from './dto/add-exercise-to-plan.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';

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
  @ApiOperation({ summary: 'Get progression statistics (estimated 1RM and volume) for a specific exercise over time' })
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
  @ApiOperation({ summary: 'Retrieve specific workout plan or logged session by ID' })
  @ApiResponse({ status: 200, description: 'Workout plan or session details.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  async getById(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    try {
      const plan = await this.workoutsService.findWorkoutPlanById(id);
      if (plan) return plan;
    } catch (err) {
      // Fall back to finding logged session if plan not found
    }
    return this.workoutsService.findSessionById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workout plan' })
  @ApiResponse({ status: 200, description: 'Plan successfully updated.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  async updatePlan(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.workoutsService.updateWorkoutPlan(id, userId, dto);
  }

  @Post(':id/exercises')
  @ApiOperation({ summary: 'Add an exercise to a workout plan' })
  @ApiResponse({ status: 201, description: 'Exercise added successfully.' })
  async addExercise(
    @CurrentUser('sub') userId: string,
    @Param('id') planId: string,
    @Body() dto: AddExerciseToPlanDto,
  ) {
    return this.workoutsService.addExerciseToPlan(planId, userId, dto);
  }

  @Patch(':id/reorder')
  @ApiOperation({ summary: 'Reorder exercises in a workout plan' })
  @ApiResponse({ status: 200, description: 'Plan successfully reordered.' })
  async reorder(
    @CurrentUser('sub') userId: string,
    @Param('id') planId: string,
    @Body() dto: ReorderExercisesDto,
  ) {
    return this.workoutsService.reorderExercises(planId, userId, dto.workoutExerciseIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workout session by ID' })
  @ApiResponse({ status: 200, description: 'Session deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Session not found.' })
  async delete(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.workoutsService.deleteSession(id, userId);
    return { success: true };
  }
}
