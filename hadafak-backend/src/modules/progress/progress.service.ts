import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BodyMetricLog } from './entities/body-metric-log.entity';
import { ProgressPhoto, PhotoAngle } from './entities/progress-photo.entity';
import { LogMetricDto } from './dto/log-metric.dto';
import { ProfilesService } from '../profiles/profiles.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(BodyMetricLog)
    private readonly metricRepository: Repository<BodyMetricLog>,
    @InjectRepository(ProgressPhoto)
    private readonly photoRepository: Repository<ProgressPhoto>,
    private readonly profilesService: ProfilesService,
  ) {}

  async logMetric(userId: string, dto: LogMetricDto): Promise<BodyMetricLog> {
    const dateStr = dto.date || new Date().toISOString().split('T')[0];
    
    let log = await this.metricRepository.findOne({
      where: { userId, date: dateStr },
    });

    if (!log) {
      log = this.metricRepository.create({ userId, date: dateStr });
    }

    log.weight = dto.weight;
    if (dto.bodyFatPercentage !== undefined) log.bodyFatPercentage = dto.bodyFatPercentage;
    if (dto.skeletalMuscleMass !== undefined) log.skeletalMuscleMass = dto.skeletalMuscleMass;
    if (dto.waist !== undefined) log.waist = dto.waist;
    if (dto.chest !== undefined) log.chest = dto.chest;
    if (dto.shoulders !== undefined) log.shoulders = dto.shoulders;
    if (dto.leftBicep !== undefined) log.leftBicep = dto.leftBicep;
    if (dto.rightBicep !== undefined) log.rightBicep = dto.rightBicep;
    if (dto.leftThigh !== undefined) log.leftThigh = dto.leftThigh;
    if (dto.rightThigh !== undefined) log.rightThigh = dto.rightThigh;
    if (dto.neck !== undefined) log.neck = dto.neck;
    if (dto.hips !== undefined) log.hips = dto.hips;

    return this.metricRepository.save(log);
  }

  async getMetricLogs(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<BodyMetricLog[]> {
    if (startDate && endDate) {
      return this.metricRepository.find({
        where: {
          userId,
          date: Between(startDate, endDate),
        },
        order: { date: 'ASC' },
      });
    }

    return this.metricRepository.find({
      where: { userId },
      order: { date: 'ASC' },
    });
  }

  async deleteMetricLog(userId: string, logId: string): Promise<void> {
    const log = await this.metricRepository.findOne({
      where: { id: logId, userId },
    });

    if (!log) {
      throw new NotFoundException(`Metric log with ID ${logId} not found`);
    }

    await this.metricRepository.remove(log);
  }

  async logPhoto(
    userId: string,
    angle: PhotoAngle,
    imageUrl: string,
    date?: string,
  ): Promise<ProgressPhoto> {
    const dateStr = date || new Date().toISOString().split('T')[0];

    // Check if user already has a photo at this exact date & angle, overwrite if exists
    let photo = await this.photoRepository.findOne({
      where: { userId, angle, date: dateStr },
    });

    if (photo) {
      // Safely delete previous local image file to preserve disk space
      this.deleteLocalFile(photo.imageUrl);
      photo.imageUrl = imageUrl;
    } else {
      photo = this.photoRepository.create({
        userId,
        angle,
        imageUrl,
        date: dateStr,
      });
    }

    return this.photoRepository.save(photo);
  }

  async getPhotos(userId: string): Promise<ProgressPhoto[]> {
    return this.photoRepository.find({
      where: { userId },
      order: { date: 'DESC', angle: 'ASC' },
    });
  }

  async deletePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.photoRepository.findOne({
      where: { id: photoId, userId },
    });

    if (!photo) {
      throw new NotFoundException(`Progress photo with ID ${photoId} not found`);
    }

    this.deleteLocalFile(photo.imageUrl);
    await this.photoRepository.remove(photo);
  }

  async getAnalyticsSummary(userId: string) {
    const logs = await this.metricRepository.find({
      where: { userId },
      order: { date: 'ASC' },
    });

    if (logs.length === 0) {
      return {
        hasData: false,
        message: 'No metric data logged yet.',
      };
    }

    const firstLog = logs[0];
    const latestLog = logs[logs.length - 1];

    // 1. Weight progression metrics
    const startWeight = Number(firstLog.weight);
    const currentWeight = Number(latestLog.weight);
    const weightDiff = currentWeight - startWeight;

    // Moving average calculations (7-day window)
    const movingAverages = logs.map((log, index) => {
      const logDate = new Date(log.date);
      const startRange = new Date(logDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      const windowLogs = logs.filter((l) => {
        const d = new Date(l.date);
        return d >= startRange && d <= logDate;
      });

      const avgWeight =
        windowLogs.reduce((sum, l) => sum + Number(l.weight), 0) / windowLogs.length;

      return {
        date: log.date,
        rawWeight: Number(log.weight),
        movingAvgWeight: Math.round(avgWeight * 100) / 100,
      };
    });

    // 2. Body Composition Analytics (Lean vs Fat Mass progression)
    const bodyCompHistory = logs
      .filter((l) => l.bodyFatPercentage !== null && l.bodyFatPercentage !== undefined)
      .map((l) => {
        const wt = Number(l.weight);
        const fatPct = Number(l.bodyFatPercentage);
        const fatMass = (wt * fatPct) / 100;
        const leanMass = wt - fatMass;

        return {
          date: l.date,
          weight: wt,
          bodyFatPercentage: fatPct,
          fatMassKg: Math.round(fatMass * 100) / 100,
          leanMassKg: Math.round(leanMass * 100) / 100,
        };
      });

    // 3. Circumference Changes (Total inches/cm lost)
    const getCircumferenceSum = (log: BodyMetricLog): number => {
      let sum = 0;
      if (log.waist) sum += Number(log.waist);
      if (log.hips) sum += Number(log.hips);
      if (log.chest) sum += Number(log.chest);
      if (log.shoulders) sum += Number(log.shoulders);
      if (log.leftBicep) sum += Number(log.leftBicep);
      if (log.rightBicep) sum += Number(log.rightBicep);
      if (log.leftThigh) sum += Number(log.leftThigh);
      if (log.rightThigh) sum += Number(log.rightThigh);
      if (log.neck) sum += Number(log.neck);
      return sum;
    };

    const circumferenceLogs = logs.filter(
      (l) =>
        l.waist ||
        l.hips ||
        l.chest ||
        l.shoulders ||
        l.leftBicep ||
        l.rightBicep ||
        l.leftThigh ||
        l.rightThigh ||
        l.neck,
    );

    let totalCircumferenceChange = 0;
    if (circumferenceLogs.length >= 2) {
      const firstSum = getCircumferenceSum(circumferenceLogs[0]);
      const latestSum = getCircumferenceSum(circumferenceLogs[circumferenceLogs.length - 1]);
      totalCircumferenceChange = Math.round((latestSum - firstSum) * 100) / 100;
    }

    // 4. Goal Alignment Coaching message
    let statusMessage = 'Stay consistent with your daily routine!';
    try {
      const profile = await this.profilesService.findByUserId(userId);
      if (profile) {
        const goal = profile.goal;
        if (goal === 'lose_fat') {
          if (weightDiff < 0) {
            statusMessage = `Great progress! You have successfully lost ${Math.abs(weightDiff).toFixed(1)} kg. Keep up the calorie deficit.`;
          } else if (weightDiff > 0) {
            statusMessage = `Weight has increased by ${weightDiff.toFixed(1)} kg. Focus on calorie tracking and staying active.`;
          }
        } else if (goal === 'gain_muscle') {
          if (weightDiff > 0) {
            statusMessage = `Solid work! Gained ${weightDiff.toFixed(1)} kg. Focus on progressive overload in the gym.`;
          } else if (weightDiff < 0) {
            statusMessage = `Weight decreased by ${Math.abs(weightDiff).toFixed(1)} kg. Consider increasing calorie surplus for muscle synthesis.`;
          }
        }
      }
    } catch (e) {
      // Profile not found, fallback standard
    }

    return {
      hasData: true,
      currentWeight,
      startingWeight: startWeight,
      totalWeightChange: Math.round(weightDiff * 100) / 100,
      totalCircumferenceChange,
      statusMessage,
      weightTrend: movingAverages,
      bodyComposition: bodyCompHistory,
    };
  }

  private deleteLocalFile(fileUrl: string) {
    if (!fileUrl.startsWith('/uploads/')) return;
    try {
      const filePath = path.join(
        __dirname,
        '../../..', // go to projects/hadafak/hadafak-backend root
        fileUrl,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignore delete errors
    }
  }
}
