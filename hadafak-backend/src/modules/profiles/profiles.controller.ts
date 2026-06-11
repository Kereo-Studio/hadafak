import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Create or update user fitness profile onboarding details' })
  @ApiResponse({ status: 200, description: 'Profile successfully saved.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createOrUpdate(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProfileDto,
  ) {
    return this.profilesService.createOrUpdate(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Retrieve current user profile details' })
  @ApiResponse({ status: 200, description: 'Profile successfully retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async getMine(@CurrentUser('sub') userId: string) {
    return this.profilesService.findByUserId(userId);
  }

  @Post('assign-program/:programId')
  @ApiOperation({ summary: 'Enroll current user in a fitness program' })
  @ApiResponse({ status: 200, description: 'Program assigned successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Profile not found.' })
  async assignProgram(
    @CurrentUser('sub') userId: string,
    @Param('programId') programId: string,
  ) {
    return this.profilesService.assignProgram(userId, programId);
  }
}
