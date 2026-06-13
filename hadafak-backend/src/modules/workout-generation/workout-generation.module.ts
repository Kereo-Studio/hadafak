import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from '../profiles/entities/profile.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { WorkoutPlan } from '../workouts/entities/workout-plan.entity';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';
import { WorkoutGenerationService } from './workout-generation.service';
import { WorkoutGenerationController } from './workout-generation.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, Exercise, WorkoutPlan, WorkoutExercise]),
    AuthModule,
  ],
  providers: [WorkoutGenerationService],
  controllers: [WorkoutGenerationController],
  exports: [WorkoutGenerationService],
})
export class WorkoutGenerationModule {}
