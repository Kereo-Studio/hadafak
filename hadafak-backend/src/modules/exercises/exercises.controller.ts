import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { ExternalSyncService } from './external-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@ApiTags('Exercises')
@Controller('exercises')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ExercisesController {
  constructor(
    private readonly exercisesService: ExercisesService,
    private readonly syncService: ExternalSyncService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get/search all exercises with filters and pagination' })
  @ApiQuery({ name: 'q', required: false, description: 'Fuzzy search by name or description' })
  @ApiQuery({ name: 'muscle', required: false, description: 'Filter by muscle group name or ID' })
  @ApiQuery({ name: 'equipment', required: false, description: 'Filter by equipment name or ID' })
  @ApiQuery({ name: 'difficulty', required: false, description: 'Filter by difficulty (beginner, intermediate, advanced)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Page limit' })
  @ApiResponse({ status: 200, description: 'Successfully fetched exercises.' })
  async findAll(
    @Query('q') q?: string,
    @Query('muscle') muscle?: string,
    @Query('equipment') equipment?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exercisesService.findAll({ q, muscle, equipment, difficulty, page, limit });
  }

  @Get('search')
  @ApiOperation({ summary: 'Fuzzy search and filter exercises' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'muscle', required: false })
  @ApiQuery({ name: 'equipment', required: false })
  @ApiQuery({ name: 'difficulty', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: 200, description: 'Successfully searched exercises.' })
  async search(
    @Query('q') q?: string,
    @Query('muscle') muscle?: string,
    @Query('equipment') equipment?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.exercisesService.findAll({ q, muscle, equipment, difficulty, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exercise by ID' })
  @ApiResponse({ status: 200, description: 'Successfully fetched exercise.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  async findById(@Param('id') id: string) {
    return this.exercisesService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new exercise to library (admin)' })
  @ApiResponse({ status: 201, description: 'Exercise successfully created.' })
  async create(@Body() dto: CreateExerciseDto) {
    return this.exercisesService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exercise (admin)' })
  @ApiResponse({ status: 200, description: 'Exercise successfully updated.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  async update(@Param('id') id: string, @Body() dto: UpdateExerciseDto) {
    return this.exercisesService.update(id, dto);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync exercises from external APIs (ExerciseDB & Wger)' })
  @ApiResponse({ status: 200, description: 'Sync completed successfully.' })
  async sync() {
    return this.syncService.syncExercises();
  }

  @Get('image/:externalId')
  @ApiOperation({ summary: 'Proxy exercise image from ExerciseDB to hide API keys' })
  @ApiResponse({ status: 200, description: 'Successfully streamed exercise gif.' })
  async getExerciseImage(
    @Param('externalId') externalId: string,
    @Res() res: Response,
  ) {
    const apiKey = process.env.EXERCISEDB_API_KEY;
    if (!apiKey) {
      res.status(HttpStatus.NOT_FOUND).send('API key not configured');
      return;
    }

    try {
      const response = await fetch(
        `https://exercisedb.p.rapidapi.com/image?exerciseId=${externalId}&resolution=360`,
        {
          headers: {
            'X-RapidAPI-Key': apiKey,
            'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
          },
        },
      );

      if (!response.ok) {
        res.status(response.status).send('Failed to fetch image from external provider');
        return;
      }

      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      const cacheControl = response.headers.get('cache-control');
      if (cacheControl) {
        res.setHeader('Cache-Control', cacheControl);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(err.message);
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an exercise (admin)' })
  @ApiResponse({ status: 244, description: 'Exercise successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Exercise not found.' })
  async remove(@Param('id') id: string) {
    return this.exercisesService.remove(id);
  }
}
