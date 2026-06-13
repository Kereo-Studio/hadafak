import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { AddExerciseToPlanDto } from './dto/add-exercise-to-plan.dto';
import { ReorderExercisesDto } from './dto/reorder-exercises.dto';

@ApiTags('Workout Plans')
@Controller('workouts/plans')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkoutPlansController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workout plan or template' })
  @ApiResponse({ status: 201, description: 'Plan successfully created.' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    // If it's a template, we can make it global (userId is null) if the user is admin, 
    // or associate it to user if not. For now, keep it simple.
    const planOwner = dto.isTemplate ? null : userId;
    return this.workoutsService.createWorkoutPlan(planOwner, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all custom workout plans for the current user' })
  @ApiResponse({ status: 200, description: 'List of user plans.' })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.workoutsService.findAllWorkoutPlans(userId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all global template workout plans' })
  @ApiResponse({ status: 200, description: 'List of template plans.' })
  async findTemplates() {
    return this.workoutsService.findAllWorkoutPlans(null);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific workout plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan details.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  async findOne(@Param('id') id: string) {
    return this.workoutsService.findWorkoutPlanById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workout plan' })
  @ApiResponse({ status: 200, description: 'Plan successfully updated.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.workoutsService.updateWorkoutPlan(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workout plan' })
  @ApiResponse({ status: 204, description: 'Plan successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Plan not found.' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    await this.workoutsService.deleteWorkoutPlan(id, userId);
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

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a template workout plan' })
  @ApiResponse({ status: 201, description: 'Cloned plan details.' })
  async clone(
    @CurrentUser('sub') userId: string,
    @Param('id') templateId: string,
    @Body('name') name?: string,
  ) {
    return this.workoutsService.cloneWorkoutPlan(templateId, userId, name);
  }
}
