import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { BodyMetricLog } from './entities/body-metric-log.entity';
import { ProgressPhoto } from './entities/progress-photo.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuthModule } from '../auth/auth.module';
import { S3Service } from '../../common/services/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BodyMetricLog, ProgressPhoto]),
    ProfilesModule,
    AuthModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService, S3Service],
  exports: [ProgressService],
})
export class ProgressModule {}
