import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from './entities/exercise.entity';
import { ExercisesService } from './exercises.service';
import { ExercisesController } from './exercises.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exercise]),
    AuthModule,
  ],
  providers: [ExercisesService],
  controllers: [ExercisesController],
  exports: [ExercisesService, TypeOrmModule],
})
export class ExercisesModule {}
