import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { WorkoutsModule } from './modules/workouts/workouts.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { StepsModule } from './modules/steps/steps.module';
import { RecipesModule } from './modules/recipes/recipes.module';
import { ProgressModule } from './modules/progress/progress.module';
import { RunsModule } from './modules/runs/runs.module';
import { PerformanceTrackingModule } from './modules/performance-tracking/performance-tracking.module';
import { WorkoutGenerationModule } from './modules/workout-generation/workout-generation.module';
import { AdaptationEngineModule } from './modules/adaptation-engine/adaptation-engine.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('database.url');
        return {
          type: 'postgres',
          ...(url ? { url } : {
            host: configService.get<string>('database.host'),
            port: configService.get<number>('database.port'),
            username: configService.get<string>('database.username'),
            password: configService.get<string>('database.password'),
            database: configService.get<string>('database.database'),
          }),
          autoLoadEntities: true,
          synchronize: configService.get<boolean>('database.synchronize'),
          logging: true,
          ssl: url ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    UsersModule,
    AuthModule,
    ProfilesModule,
    ExercisesModule,
    ProgramsModule,
    WorkoutsModule,
    NutritionModule,
    StepsModule,
    RecipesModule,
    ProgressModule,
    RunsModule,
    PerformanceTrackingModule,
    WorkoutGenerationModule,
    AdaptationEngineModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
