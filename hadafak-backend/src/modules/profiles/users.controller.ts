import { Controller, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Patch('profile')
  @ApiOperation({ summary: 'Update user fitness profile' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.profilesService.createOrUpdate(userId, dto);
  }
}
