import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { ProgramLevel } from './entities/program.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Programs')
@Controller('programs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgramsController {
  constructor(private readonly programsService: ProgramsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all gym programs' })
  @ApiResponse({ status: 200, description: 'Programs successfully retrieved.' })
  async findAll() {
    return this.programsService.findAll();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a customized program matching current user goal/preferences' })
  @ApiResponse({ status: 201, description: 'Program dynamically generated and assigned.' })
  async generate(@CurrentUser('sub') userId: string) {
    return this.programsService.generateProgramForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a gym program by ID' })
  @ApiResponse({ status: 200, description: 'Program details with days.' })
  @ApiResponse({ status: 404, description: 'Program not found.' })
  async findById(@Param('id') id: string) {
    return this.programsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new gym program with schedule days' })
  @ApiResponse({ status: 201, description: 'Program successfully created.' })
  async create(
    @Body('name') name: string,
    @Body('description') description: string,
    @Body('level') level: ProgramLevel,
    @Body('days') days?: { dayNumber: number; title: string }[],
  ) {
    return this.programsService.create(name, description, level, days);
  }

  @Put('exercises/:id')
  @ApiOperation({ summary: 'Update parameters for a program day exercise' })
  async updateDayExercise(
    @Param('id') id: string,
    @Body('targetSets') targetSets: number,
    @Body('targetRepsRange') targetRepsRange: string,
  ) {
    return this.programsService.updateDayExercise(id, targetSets, targetRepsRange);
  }

  @Delete('exercises/:id')
  @ApiOperation({ summary: 'Remove an exercise from a program day' })
  async removeDayExercise(@Param('id') id: string) {
    return this.programsService.removeDayExercise(id);
  }

  @Post('days/:dayId/exercises')
  @ApiOperation({ summary: 'Add an exercise to a program day' })
  async addDayExercise(
    @Param('dayId') dayId: string,
    @Body('exerciseId') exerciseId: string,
    @Body('targetSets') targetSets: number,
    @Body('targetRepsRange') targetRepsRange: string,
  ) {
    return this.programsService.addDayExercise(dayId, exerciseId, targetSets, targetRepsRange);
  }
}
