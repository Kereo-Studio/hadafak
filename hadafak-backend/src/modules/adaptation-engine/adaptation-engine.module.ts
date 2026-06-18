import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutExercise } from '../workouts/entities/workout-exercise.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { ProgramDayExercise } from '../programs/entities/program-day-exercise.entity';
import { AdaptationEngineService } from './adaptation-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WorkoutExercise, Profile, ProgramDayExercise]),
  ],
  providers: [AdaptationEngineService],
  exports: [AdaptationEngineService],
})
export class AdaptationEngineModule {}
