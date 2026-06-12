import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StepLog } from './entities/step-log.entity';
import { StepInterval, StepSource } from './entities/step-interval.entity';
import { SyncStepsDto } from './dto/sync-steps.dto';
import { LogManualStepsDto } from './dto/log-manual-steps.dto';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class StepsService {
  constructor(
    @InjectRepository(StepLog)
    private readonly stepLogRepository: Repository<StepLog>,
    @InjectRepository(StepInterval)
    private readonly stepIntervalRepository: Repository<StepInterval>,
    private readonly profilesService: ProfilesService,
  ) {}

  async syncIntervals(userId: string, dto: SyncStepsDto): Promise<void> {
    const datesToUpdate = new Set<string>();

    for (const interval of dto.intervals) {
      const start = new Date(interval.startTime);
      const end = new Date(interval.endTime);
      const dateStr = start.toISOString().split('T')[0];
      datesToUpdate.add(dateStr);

      // Overlap Resolution: Delete any existing sensor interval starting at the same time to avoid double counting
      await this.stepIntervalRepository.delete({
        userId,
        startTime: start,
        source: StepSource.SENSOR,
      });

      // Insert new interval
      const entry = this.stepIntervalRepository.create({
        userId,
        startTime: start,
        endTime: end,
        steps: interval.steps,
        source: interval.source,
        activityName: interval.activityName || null,
      });
      await this.stepIntervalRepository.save(entry);
    }

    // Recalculate daily step log cache for each modified date
    for (const date of datesToUpdate) {
      await this.updateDailyTotal(userId, date);
    }
  }

  async logManual(userId: string, dto: LogManualStepsDto): Promise<StepLog> {
    const dateStr = dto.date || new Date().toISOString().split('T')[0];
    
    // Deleting any previous manual step logs for that day to avoid duplicate additions
    await this.stepIntervalRepository.delete({
      userId,
      startTime: Between(new Date(dateStr + 'T00:00:00.000Z'), new Date(dateStr + 'T23:59:59.999Z')),
      source: StepSource.MANUAL,
    });

    // Create a 1-hour dummy interval representing manual input
    const manualInterval = this.stepIntervalRepository.create({
      userId,
      startTime: new Date(dateStr + 'T12:00:00.000Z'),
      endTime: new Date(dateStr + 'T13:00:00.000Z'),
      steps: dto.steps,
      source: StepSource.MANUAL,
      activityName: 'Manual Entry',
    });

    await this.stepIntervalRepository.save(manualInterval);
    return this.updateDailyTotal(userId, dateStr);
  }

  private async getPersonalizationFactors(userId: string) {
    let weight = 70;
    let height = 170;
    let gender = 'female';

    try {
      const profile = await this.profilesService.findByUserId(userId);
      if (profile.weight) weight = Number(profile.weight);
      if (profile.height) height = Number(profile.height);
      if (profile.gender) gender = profile.gender.toLowerCase();
    } catch (e) {
      // Use defaults
    }

    const isMale = gender === 'male' || gender === 'm';
    const strideFactor = isMale ? 0.415 : 0.413;
    const strideLengthKm = (height * strideFactor) / 100000;
    const caloriesPerStep = weight * 0.00057;

    return { strideLengthKm, caloriesPerStep };
  }

  async getDailySummary(userId: string, date: string) {
    let log = await this.stepLogRepository.findOne({ where: { userId, date } });

    // Fallback if log doesn't exist yet
    if (!log) {
      let targetSteps = 8000;
      try {
        const profile = await this.profilesService.findByUserId(userId);
        if (profile.dailySteps) targetSteps = profile.dailySteps;
      } catch (e) {
        // Fallback default
      }
      log = this.stepLogRepository.create({
        userId,
        date,
        totalSteps: 0,
        targetSteps,
        streak: 0,
      });
    }

    const steps = log.totalSteps;
    const { strideLengthKm, caloriesPerStep } = await this.getPersonalizationFactors(userId);
    const distanceKm = Math.round(steps * strideLengthKm * 100) / 100;
    const caloriesBurned = Math.round(steps * caloriesPerStep);

    return {
      date: log.date,
      totalSteps: steps,
      targetSteps: log.targetSteps,
      remainingSteps: Math.max(0, log.targetSteps - steps),
      streak: log.streak,
      distanceKm,
      caloriesBurned,
    };
  }

  async getHistory(userId: string, startDate: string, endDate: string) {
    const logs = await this.stepLogRepository.find({
      where: {
        userId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    const { strideLengthKm, caloriesPerStep } = await this.getPersonalizationFactors(userId);

    return logs.map((l) => ({
      date: l.date,
      steps: l.totalSteps,
      target: l.targetSteps,
      distanceKm: Math.round(l.totalSteps * strideLengthKm * 100) / 100,
      caloriesBurned: Math.round(l.totalSteps * caloriesPerStep),
    }));
  }

  async getStreakInfo(userId: string) {
    const todayStr = new Date().toISOString().split('T')[0];
    const log = await this.stepLogRepository.findOne({ where: { userId, date: todayStr } });
    
    // Find all-time max streak
    const logs = await this.stepLogRepository.find({ where: { userId } });
    const maxStreak = logs.length > 0 ? Math.max(...logs.map((l) => l.streak)) : 0;

    return {
      currentStreak: log ? log.streak : 0,
      maxStreak,
    };
  }

  private async updateDailyTotal(userId: string, date: string): Promise<StepLog> {
    // Sum steps from all intervals for that specific day
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');

    const intervals = await this.stepIntervalRepository.find({
      where: {
        userId,
        startTime: Between(startOfDay, endOfDay),
      },
    });

    const totalSteps = intervals.reduce((sum, item) => sum + item.steps, 0);

    let log = await this.stepLogRepository.findOne({ where: { userId, date } });
    let targetSteps = 8000;

    try {
      const profile = await this.profilesService.findByUserId(userId);
      if (profile.dailySteps) targetSteps = profile.dailySteps;
    } catch (e) {
      // Fallback
    }

    if (!log) {
      log = this.stepLogRepository.create({ userId, date, targetSteps });
    }

    log.totalSteps = totalSteps;
    log.targetSteps = targetSteps;

    // Recalculate streak up to this day
    const prevDate = new Date(new Date(date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevLog = await this.stepLogRepository.findOne({ where: { userId, date: prevDate } });

    if (totalSteps >= targetSteps) {
      log.streak = prevLog && prevLog.totalSteps >= prevLog.targetSteps ? prevLog.streak + 1 : 1;
    } else {
      log.streak = 0;
    }

    return this.stepLogRepository.save(log);
  }
}
