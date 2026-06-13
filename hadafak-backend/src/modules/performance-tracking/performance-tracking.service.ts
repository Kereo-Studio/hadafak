import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PerformanceLog } from './entities/performance-log.entity';
import { LogPerformanceDto } from './dto/log-performance.dto';
import { AdaptationEngineService } from '../adaptation-engine/adaptation-engine.service';

@Injectable()
export class PerformanceTrackingService {
  constructor(
    @InjectRepository(PerformanceLog)
    private readonly performanceLogRepository: Repository<PerformanceLog>,
    @Inject(forwardRef(() => AdaptationEngineService))
    private readonly adaptationEngineService: AdaptationEngineService,
  ) {}

  async logPerformance(userId: string, dto: LogPerformanceDto): Promise<PerformanceLog> {
    const logDate = dto.date || new Date().toISOString().split('T')[0];
    const log = this.performanceLogRepository.create({
      ...dto,
      userId,
      date: logDate,
    });
    const savedLog = await this.performanceLogRepository.save(log);

    // Trigger adaptation engine evaluations
    await this.adaptationEngineService.adaptFromPerformance(userId, savedLog);

    return savedLog;
  }

  async getHistory(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: PerformanceLog[]; total: number; page: number; limit: number }> {
    const [data, total] = await this.performanceLogRepository.findAndCount({
      where: { userId },
      relations: {
        exercise: {
          muscleGroup: true,
          equipment: true,
        },
        workoutPlan: true,
      },
      order: { date: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  async findLatestForExercise(userId: string, exerciseId: string): Promise<PerformanceLog | null> {
    return this.performanceLogRepository.findOne({
      where: { userId, exerciseId },
      order: { date: 'DESC', id: 'DESC' },
    });
  }
}
