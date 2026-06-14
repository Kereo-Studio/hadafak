import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutSession } from './entities/workout-session.entity';
import { ExerciseLog } from './entities/exercise-log.entity';
import { WorkoutPlan } from './entities/workout-plan.entity';
import { WorkoutExercise } from './entities/workout-exercise.entity';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { WorkoutPlansController } from './workout-plans.controller';
import { AuthModule } from '../auth/auth.module';
import { ExercisesModule } from '../exercises/exercises.module';
import { AdaptationEngineModule } from '../adaptation-engine/adaptation-engine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutSession, ExerciseLog, WorkoutPlan, WorkoutExercise]),
    AuthModule,
    ExercisesModule,
    AdaptationEngineModule,
  ],
  providers: [WorkoutsService],
  controllers: [WorkoutPlansController, WorkoutsController],
  exports: [WorkoutsService, TypeOrmModule],
})
export class WorkoutsModule {}
