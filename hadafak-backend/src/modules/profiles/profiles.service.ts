import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile, FitnessGoal, FitnessLevel, EquipmentAccess } from './entities/profile.entity';
import { User } from '../users/entities/user.entity';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createOrUpdate(userId: string, dto: CreateProfileDto): Promise<Profile> {
    let profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }

    if (dto.name !== undefined || dto.avatarUrl !== undefined) {
      const updateData: any = {};
      if (dto.name !== undefined) updateData.name = dto.name;
      if (dto.avatarUrl !== undefined) updateData.avatarUrl = dto.avatarUrl;
      await this.userRepository.update(userId, updateData);
    }

    if (dto.goal !== undefined) profile.goal = dto.goal;
    if (dto.age !== undefined) profile.age = dto.age;
    if (dto.gender !== undefined) profile.gender = dto.gender.toLowerCase();
    if (dto.weight !== undefined) profile.weight = dto.weight;
    if (dto.height !== undefined) profile.height = dto.height;
    if (dto.trainingDays !== undefined) profile.trainingDays = dto.trainingDays;
    if (dto.trainingLocation !== undefined) profile.trainingLocation = dto.trainingLocation;

    // Use profile (which has merged values) for calculations to avoid undefined crashes
    const calcSource: CreateProfileDto = {
      goal: profile.goal || FitnessGoal.STAY_ACTIVE,
      age: profile.age || 25,
      gender: profile.gender || 'male',
      weight: profile.weight || 70,
      height: profile.height || 175,
      trainingDays: profile.trainingDays || 3,
      trainingLocation: profile.trainingLocation || 'gym',
    };

    // Smart calculation of targets if they are not provided
    profile.dailyCalories = dto.dailyCalories ?? profile.dailyCalories ?? this.calculateCalories(calcSource);
    profile.dailyProtein = dto.dailyProtein ?? profile.dailyProtein ?? this.calculateProtein(calcSource);
    profile.dailyWater = dto.dailyWater ?? profile.dailyWater ?? this.calculateWater(calcSource);
    profile.dailySteps = dto.dailySteps ?? profile.dailySteps ?? this.calculateSteps(calcSource);

    // Dynamic workout profile updates
    profile.bodyFatPercentage = dto.bodyFatPercentage ?? profile.bodyFatPercentage ?? null;
    profile.fitnessLevel = dto.fitnessLevel ?? profile.fitnessLevel ?? FitnessLevel.BEGINNER;
    profile.daysPerWeekAvailable = dto.daysPerWeekAvailable ?? dto.trainingDays ?? profile.daysPerWeekAvailable ?? 3;
    profile.sessionDurationMinutes = dto.sessionDurationMinutes ?? profile.sessionDurationMinutes ?? 60;
    
    if (dto.equipmentAccess) {
      profile.equipmentAccess = dto.equipmentAccess;
    } else if (profile.trainingLocation) {
      profile.equipmentAccess = profile.trainingLocation === 'home' ? EquipmentAccess.HOME : EquipmentAccess.GYM;
    }

    profile.injuries = dto.injuries ?? profile.injuries ?? [];
    profile.preferences = dto.preferences ?? profile.preferences ?? null;

    await this.profileRepository.save(profile);
    return this.findByUserId(userId);
  }

  async findByUserId(userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: {
        user: true,
        currentProgram: {
          days: {
            exercises: {
              exercise: true,
            },
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException(`Profile for user ${userId} not found`);
    }
    return profile;
  }

  async assignProgram(userId: string, programId: string): Promise<Profile> {
    const profile = await this.findByUserId(userId);
    await this.profileRepository.update(profile.id, { currentProgramId: programId });
    return this.findByUserId(userId);
  }

  private calculateCalories(dto: CreateProfileDto): number {
    const isMale = dto.gender.toLowerCase() === 'male' || dto.gender.toLowerCase() === 'm';
    const genderOffset = isMale ? 5 : -161;
    const bmr = 10 * dto.weight + 6.25 * dto.height - 5 * dto.age + genderOffset;

    let activityMultiplier = 1.2;
    if (dto.trainingDays >= 5) {
      activityMultiplier = 1.725;
    } else if (dto.trainingDays >= 3) {
      activityMultiplier = 1.55;
    } else if (dto.trainingDays >= 1) {
      activityMultiplier = 1.375;
    }

    const tdee = bmr * activityMultiplier;

    switch (dto.goal) {
      case FitnessGoal.LOSE_FAT:
      case FitnessGoal.FAT_LOSS:
        return Math.round(tdee - 500);
      case FitnessGoal.GAIN_MUSCLE:
      case FitnessGoal.HYPERTROPHY:
        return Math.round(tdee + 300);
      default:
        return Math.round(tdee);
    }
  }

  private calculateProtein(dto: CreateProfileDto): number {
    let factor = 1.2;
    switch (dto.goal) {
      case FitnessGoal.GAIN_MUSCLE:
      case FitnessGoal.HYPERTROPHY:
      case FitnessGoal.ATHLETIC:
        factor = 2.0;
        break;
      case FitnessGoal.LOSE_FAT:
      case FitnessGoal.FAT_LOSS:
        factor = 1.8;
        break;
    }
    return Math.round(dto.weight * factor);
  }

  private calculateWater(dto: CreateProfileDto): number {
    return Math.round(dto.weight * 35);
  }

  private calculateSteps(dto: CreateProfileDto): number {
    switch (dto.goal) {
      case FitnessGoal.LOSE_FAT:
      case FitnessGoal.FAT_LOSS:
      case FitnessGoal.ATHLETIC:
        return 10000;
      default:
        return 8000;
    }
  }
}
