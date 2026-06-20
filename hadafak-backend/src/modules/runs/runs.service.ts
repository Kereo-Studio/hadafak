import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RunSession, ActivityType } from './entities/run-session.entity';
import { CreateRunSessionDto } from './dto/create-run-session.dto';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class RunsService {
  constructor(
    @InjectRepository(RunSession)
    private readonly runSessionRepository: Repository<RunSession>,
    private readonly profilesService: ProfilesService,
  ) {}

  async create(userId: string, dto: CreateRunSessionDto): Promise<RunSession> {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const durationHours = dto.durationSeconds / 3600;

    // Calculate Average Pace (min/km)
    let avgPaceMinPerKm = 0;
    if (dto.distanceKm > 0) {
      avgPaceMinPerKm = (dto.durationSeconds / 60) / dto.distanceKm;
      // Round to 2 decimal places
      avgPaceMinPerKm = Math.round(avgPaceMinPerKm * 100) / 100;
    }

    // Determine MET (Metabolic Equivalent) factor based on ActivityType
    let met = 7.0; // Default: general jog/run
    switch (dto.activityType) {
      case ActivityType.WALK:
        met = 3.5;
        break;
      case ActivityType.CYCLING:
        met = 6.0;
        break;
      case ActivityType.HIKING:
        met = 6.5;
        break;
      case ActivityType.RUN:
      default:
        met = 8.0;
        break;
    }

    // Get User Weight to calculate dynamic Calories Burned
    let weight = 70; // fallback default
    try {
      const profile = await this.profilesService.findByUserId(userId);
      if (profile && profile.weight) {
        weight = Number(profile.weight);
      }
    } catch {
      // Use defaults if profile doesn't exist
    }

    // Formula: Calories = MET * Weight (kg) * Duration (hours)
    const calculatedCalories = Math.round(met * weight * durationHours);
    const caloriesBurned = dto.durationSeconds > 0 ? calculatedCalories : 0;

    const runSession = this.runSessionRepository.create({
      userId,
      title: dto.title || `Outdoor ${dto.activityType.charAt(0).toUpperCase() + dto.activityType.slice(1)}`,
      activityType: dto.activityType,
      startTime,
      endTime,
      durationSeconds: dto.durationSeconds,
      distanceKm: dto.distanceKm,
      avgPaceMinPerKm,
      caloriesBurned,
      routeCoordinates: dto.routeCoordinates,
    });

    return this.runSessionRepository.save(runSession);
  }

  // Get summary of all runs (includes route coordinates for path rendering)
  async findAll(userId: string): Promise<RunSession[]> {
    return this.runSessionRepository.find({
      where: { userId },
      select: {
        id: true,
        userId: true,
        title: true,
        activityType: true,
        startTime: true,
        endTime: true,
        durationSeconds: true,
        distanceKm: true,
        avgPaceMinPerKm: true,
        caloriesBurned: true,
        routeCoordinates: true,
        createdAt: true,
      },
      order: { startTime: 'DESC' },
    });
  }

  // Get aggregated stats of all user's workout route sessions
  async getStats(userId: string) {
    const runs = await this.findAll(userId);

    const stats = {
      totalDistanceKm: 0,
      totalDurationSeconds: 0,
      totalCaloriesBurned: 0,
      sessionCount: runs.length,
      averagePaceMinPerKm: 0,
      breakdown: {
        [ActivityType.RUN]: { count: 0, distance: 0, duration: 0, calories: 0 },
        [ActivityType.WALK]: { count: 0, distance: 0, duration: 0, calories: 0 },
        [ActivityType.CYCLING]: { count: 0, distance: 0, duration: 0, calories: 0 },
        [ActivityType.HIKING]: { count: 0, distance: 0, duration: 0, calories: 0 },
      },
    };

    let runsWithDistanceCount = 0;
    let totalPaceAccumulator = 0;

    for (const run of runs) {
      const dist = Number(run.distanceKm) || 0;
      const dur = Number(run.durationSeconds) || 0;
      const cals = Number(run.caloriesBurned) || 0;

      stats.totalDistanceKm += dist;
      stats.totalDurationSeconds += dur;
      stats.totalCaloriesBurned += cals;

      if (dist > 0 && run.avgPaceMinPerKm) {
        totalPaceAccumulator += Number(run.avgPaceMinPerKm);
        runsWithDistanceCount++;
      }

      if (stats.breakdown[run.activityType]) {
        stats.breakdown[run.activityType].count++;
        stats.breakdown[run.activityType].distance += dist;
        stats.breakdown[run.activityType].duration += dur;
        stats.breakdown[run.activityType].calories += cals;
      }
    }

    if (runsWithDistanceCount > 0) {
      stats.averagePaceMinPerKm = Math.round((totalPaceAccumulator / runsWithDistanceCount) * 100) / 100;
    }

    // Format pace values for frontend UI display (e.g. 5.5 => "5:30")
    const formatPace = (decimalPace: number): string => {
      if (!decimalPace || decimalPace <= 0) return '0:00';
      const mins = Math.floor(decimalPace);
      const secs = Math.round((decimalPace - mins) * 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Round stats values
    stats.totalDistanceKm = Math.round(stats.totalDistanceKm * 100) / 100;

    return {
      ...stats,
      averagePaceFormatted: formatPace(stats.averagePaceMinPerKm),
      breakdown: Object.keys(stats.breakdown).reduce((acc, key) => {
        const item = stats.breakdown[key];
        const avgPace = item.distance > 0 ? (item.duration / 60) / item.distance : 0;
        acc[key] = {
          ...item,
          distance: Math.round(item.distance * 100) / 100,
          averagePaceMinPerKm: Math.round(avgPace * 100) / 100,
          averagePaceFormatted: formatPace(avgPace),
        };
        return acc;
      }, {}),
    };
  }

  // Get specific run with full details including GPS route path
  async findOne(userId: string, id: string): Promise<RunSession> {
    const run = await this.runSessionRepository.findOne({
      where: { id, userId },
    });
    if (!run) {
      throw new NotFoundException('Running session not found');
    }
    return run;
  }

  async remove(userId: string, id: string): Promise<void> {
    const result = await this.runSessionRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new NotFoundException('Running session not found');
    }
  }
}
