import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all exercises' })
  @ApiQuery({ name: 'muscleGroup', required: false, description: 'Filter exercises by target muscle group' })
  @ApiResponse({ status: 200, description: 'Successfully fetched exercises.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Query('muscleGroup') muscleGroup?: string) {
    return this.exercisesService.findAll(muscleGroup);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exercise by ID' })
  @ApiResponse({ status: 200, description: 'Successfully fetched exercise.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  async findById(@Param('id') id: string) {
    return this.exercisesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new exercise to library' })
  @ApiResponse({ status: 201, description: 'Exercise successfully created.' })
  async create(
    @Body('name') name: string,
    @Body('muscleGroup') muscleGroup: string,
  ) {
    return this.exercisesService.create(name, muscleGroup);
  }
}
