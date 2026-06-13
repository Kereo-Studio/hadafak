import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PerformanceLog } from './entities/performance-log.entity';
import { PerformanceTrackingService } from './performance-tracking.service';
import { PerformanceTrackingController } from './performance-tracking.controller';
import { AdaptationEngineModule } from '../adaptation-engine/adaptation-engine.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PerformanceLog]),
    forwardRef(() => AdaptationEngineModule),
    AuthModule,
  ],
  providers: [PerformanceTrackingService],
  controllers: [PerformanceTrackingController],
  exports: [PerformanceTrackingService],
})
export class PerformanceTrackingModule {}
