import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { ProgressService } from './progress.service';
import { LogMetricDto } from './dto/log-metric.dto';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Progress')
@Controller('progress')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Post('metrics')
  @ApiOperation({ summary: 'Log or update daily weight, body composition, and circumference metrics' })
  @ApiResponse({ status: 201, description: 'Metrics successfully logged.' })
  async logMetric(@CurrentUser('sub') userId: string, @Body() dto: LogMetricDto) {
    return this.progressService.logMetric(userId, dto);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Retrieve historical list of body metric logs' })
  @ApiResponse({ status: 200, description: 'List of metric logs retrieved.' })
  async getMetrics(@CurrentUser('sub') userId: string) {
    return this.progressService.getMetricLogs(userId);
  }

  @Delete('metrics/:id')
  @ApiOperation({ summary: 'Delete a specific daily metric log' })
  @ApiResponse({ status: 200, description: 'Log successfully deleted.' })
  async deleteMetric(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.progressService.deleteMetricLog(userId, id);
    return { success: true };
  }

  @Post('photos/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const dest = './uploads/progress-photos';
          if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
          }
          cb(null, dest);
        },
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `photo-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG, and WebP images are allowed.'), false);
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a visual progress photo (front, side, back)' })
  @ApiResponse({ status: 201, description: 'Progress photo successfully uploaded.' })
  async uploadPhoto(
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: any,
    @Body() dto: UploadPhotoDto,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    const relativeUrl = `/uploads/progress-photos/${file.filename}`;
    return this.progressService.logPhoto(userId, dto.angle, relativeUrl, dto.date);
  }

  @Get('photos')
  @ApiOperation({ summary: 'Get all logged progress photos sorted by date' })
  @ApiResponse({ status: 200, description: 'List of progress photos.' })
  async getPhotos(@CurrentUser('sub') userId: string) {
    return this.progressService.getPhotos(userId);
  }

  @Delete('photos/:id')
  @ApiOperation({ summary: 'Delete a specific progress photo' })
  @ApiResponse({ status: 200, description: 'Photo successfully deleted.' })
  async deletePhoto(@CurrentUser('sub') userId: string, @Param('id') id: string) {
    await this.progressService.deletePhoto(userId, id);
    return { success: true };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Retrieve advanced body composition, weight trends, and circumference change stats' })
  @ApiResponse({ status: 200, description: 'Advanced progress metrics summary.' })
  async getAnalytics(@CurrentUser('sub') userId: string) {
    return this.progressService.getAnalyticsSummary(userId);
  }
}
