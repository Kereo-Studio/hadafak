import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { User } from '../users/entities/user.entity';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { AuthModule } from '../auth/auth.module';
import { S3Service } from '../../common/services/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Profile, User]),
    AuthModule,
  ],
  providers: [ProfilesService, S3Service],
  controllers: [ProfilesController],
  exports: [ProfilesService],
})
export class ProfilesModule {}
