import { Controller, Post, Get, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import * as fs from 'fs';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { S3Service } from '../../common/services/s3.service';

@ApiTags('Profiles')
@Controller('profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfilesController {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly s3Service: S3Service,
  ) {}

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

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed.'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload user profile avatar image' })
  @ApiResponse({ status: 200, description: 'Avatar uploaded and updated successfully.' })
  async uploadAvatar(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    let imageUrl: string;

    if (this.s3Service.isConfigured()) {
      imageUrl = await this.s3Service.uploadFile(file, 'avatars');
    } else {
      const dest = './uploads/avatars';
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      const ext = path.extname(file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `avatar-${uniqueSuffix}${ext}`;
      const filePath = path.join(dest, filename);
      fs.writeFileSync(filePath, file.buffer);
      imageUrl = `/uploads/avatars/${filename}`;
    }

    await this.profilesService.createOrUpdate(userId, { avatarUrl: imageUrl } as any);
    return { avatarUrl: imageUrl };
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
