import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Program } from './entities/program.entity';
import { ProgramDay } from './entities/program-day.entity';
import { ProgramDayExercise } from './entities/program-day-exercise.entity';
import { ProgramsService } from './programs.service';
import { ProgramsController } from './programs.controller';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { ExercisesModule } from '../exercises/exercises.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Program, ProgramDay, ProgramDayExercise]),
    AuthModule,
    ProfilesModule,
    ExercisesModule,
  ],
  providers: [ProgramsService],
  controllers: [ProgramsController],
  exports: [ProgramsService, TypeOrmModule],
})
export class ProgramsModule {}
