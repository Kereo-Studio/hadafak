import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exercise } from './entities/exercise.entity';
import { MuscleGroup } from './entities/muscle-group.entity';
import { Equipment } from './entities/equipment.entity';
import { ExercisesService } from './exercises.service';
import { ExternalSyncService } from './external-sync.service';
import { ExercisesController } from './exercises.controller';
import { AuthModule } from '../auth/auth.module';
import { S3Service } from '../../common/services/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exercise, MuscleGroup, Equipment]),
    AuthModule,
  ],
  providers: [ExercisesService, ExternalSyncService, S3Service],
  controllers: [ExercisesController],
  exports: [ExercisesService, ExternalSyncService, TypeOrmModule],
})
export class ExercisesModule {}
