import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CoachInsight } from './entities/coach-insight.entity';
import { CoachMemory } from './entities/coach-memory.entity';
import { WorkoutSession } from '../workouts/entities/workout-session.entity';
import { NutritionLog } from '../nutrition/entities/nutrition-log.entity';
import { Food } from '../nutrition/entities/food.entity';
import { Profile } from '../profiles/entities/profile.entity';
import { CoachService } from './coach.service';
import { CoachController } from './coach.controller';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ProgressModule } from '../progress/progress.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CoachInsight,
      CoachMemory,
      WorkoutSession,
      NutritionLog,
      Food,
      Profile,
    ]),
    ConfigModule,
    AuthModule,
    ProfilesModule,
    ProgressModule,
  ],
  providers: [CoachService],
  controllers: [CoachController],
  exports: [CoachService],
})
export class CoachModule {}
