import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StepLog } from './entities/step-log.entity';
import { StepInterval } from './entities/step-interval.entity';
import { StepsService } from './steps.service';
import { StepsController } from './steps.controller';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StepLog, StepInterval]),
    AuthModule,
    ProfilesModule,
  ],
  providers: [StepsService],
  controllers: [StepsController],
  exports: [StepsService, TypeOrmModule],
})
export class StepsModule {}
