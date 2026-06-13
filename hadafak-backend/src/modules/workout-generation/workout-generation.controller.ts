import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutGenerationService } from './workout-generation.service';
import { GenerateWorkoutDto } from './dto/generate-workout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Workout Generation')
@Controller('workouts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WorkoutGenerationController {
  constructor(private readonly generationService: WorkoutGenerationService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a personalized workout plan' })
  @ApiResponse({ status: 201, description: 'Personalized workout plan generated successfully.' })
  async generateWorkout(
    @CurrentUser('sub') userId: string,
    @Body() dto: GenerateWorkoutDto,
  ) {
    return this.generationService.generateWorkoutPlan(userId, dto);
  }
}
