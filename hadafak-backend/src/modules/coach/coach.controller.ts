import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CoachService } from './coach.service';
import { UpdateMemoryDto } from './dto/update-memory.dto';
import { ChatDto } from './dto/chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Coach')
@Controller('coach')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get('insight')
  @ApiOperation({ summary: 'Get the latest weekly coach insight for the current user' })
  async getInsight(@CurrentUser('sub') userId: string) {
    return this.coachService.getLatestInsight(userId);
  }

  @Get('memory')
  @ApiOperation({ summary: 'Get the coach memory for the current user' })
  async getMemory(@CurrentUser('sub') userId: string) {
    return this.coachService.getMemory(userId);
  }

  @Patch('memory')
  @ApiOperation({ summary: 'Update injuries, avoided foods, or preferences in coach memory' })
  async updateMemory(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateMemoryDto,
  ) {
    return this.coachService.updateMemory(userId, dto);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Manually trigger a weekly analysis for the current user' })
  async analyze(@CurrentUser('sub') userId: string) {
    return this.coachService.analyzeUser(userId);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with the AI coach (single turn, memory-aware)' })
  async chat(@CurrentUser('sub') userId: string, @Body() dto: ChatDto) {
    return this.coachService.chat(userId, dto.message);
  }
}
