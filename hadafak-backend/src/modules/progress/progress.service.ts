import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { BodyMetricLog } from './entities/body-metric-log.entity';
import { ProgressPhoto, PhotoAngle } from './entities/progress-photo.entity';
import { LogMetricDto } from './dto/log-metric.dto';
import { ProfilesService } from '../profiles/profiles.service';
import { FitnessGoal } from '../profiles/entities/profile.entity';
import { S3Service } from '../../common/services/s3.service';
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
    private readonly s3Service: S3Service,
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
      // Safely delete previous image file
      await this.deletePhotoFile(photo.imageUrl);
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

    await this.deletePhotoFile(photo.imageUrl);
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

    // 5. Transformation Prediction
    let prediction: {
      targetWeight: number;
      estimatedDays: number;
      estimatedDate: string;
      weeklyRate: number;
      plateau: boolean;
    } | null = null;

    try {
      const profile = await this.profilesService.findByUserId(userId);
      const goal = profile?.goal;
      const needsLoss = goal === FitnessGoal.LOSE_FAT || goal === FitnessGoal.FAT_LOSS;
      const needsGain =
        goal === FitnessGoal.GAIN_MUSCLE ||
        goal === FitnessGoal.HYPERTROPHY ||
        goal === FitnessGoal.STRENGTH;

      if ((needsLoss || needsGain) && logs.length >= 2) {
        const recentLogs = logs.slice(-4);
        const n = recentLogs.length;
        // Linear regression: x = day index, y = weight
        const xs = recentLogs.map((_, i) => i);
        const ys = recentLogs.map((l) => Number(l.weight));
        const sumX = xs.reduce((a, b) => a + b, 0);
        const sumY = ys.reduce((a, b) => a + b, 0);
        const sumXY = xs.reduce((a, i) => a + i * ys[i], 0);
        const sumX2 = xs.reduce((a, i) => a + i * i, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX); // kg/entry
        // Estimate days between entries
        const firstDate = new Date(recentLogs[0].date).getTime();
        const lastDate = new Date(recentLogs[n - 1].date).getTime();
        const avgDaysBetween = n > 1 ? (lastDate - firstDate) / (1000 * 60 * 60 * 24) / (n - 1) : 7;
        const weeklyRate = (slope / avgDaysBetween) * 7; // kg/week

        const targetWeight = needsLoss ? currentWeight - 10 : currentWeight + 5;
        const plateau = Math.abs(weeklyRate) < 0.05;

        if (!plateau) {
          const estimatedDays = Math.round(
            Math.abs((targetWeight - currentWeight) / weeklyRate) * 7,
          );
          const estimatedDate = new Date(Date.now() + estimatedDays * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          prediction = {
            targetWeight: Math.round(targetWeight * 10) / 10,
            estimatedDays,
            estimatedDate,
            weeklyRate: Math.round(weeklyRate * 100) / 100,
            plateau: false,
          };
        } else {
          prediction = {
            targetWeight: Math.round(targetWeight * 10) / 10,
            estimatedDays: 0,
            estimatedDate: '',
            weeklyRate: Math.round(weeklyRate * 100) / 100,
            plateau: true,
          };
        }
      }
    } catch {
      // prediction stays null
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
      prediction,
    };
  }

  private async deletePhotoFile(fileUrl: string) {
    if (fileUrl.startsWith('http') && this.s3Service.isConfigured()) {
      await this.s3Service.deleteFile(fileUrl);
    } else if (fileUrl.startsWith('/uploads/')) {
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
}
