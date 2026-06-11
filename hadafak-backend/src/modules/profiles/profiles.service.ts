import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Profile, FitnessGoal } from './entities/profile.entity';
import { CreateProfileDto } from './dto/create-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
  ) {}

  async createOrUpdate(userId: string, dto: CreateProfileDto): Promise<Profile> {
    let profile = await this.profileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.profileRepository.create({ userId });
    }

    profile.goal = dto.goal;
    profile.age = dto.age;
    profile.gender = dto.gender.toLowerCase();
    profile.weight = dto.weight;
    profile.height = dto.height;
    profile.trainingDays = dto.trainingDays;
    profile.trainingLocation = dto.trainingLocation;

    // Smart calculation of targets if they are not provided
    profile.dailyCalories = dto.dailyCalories ?? this.calculateCalories(dto);
    profile.dailyProtein = dto.dailyProtein ?? this.calculateProtein(dto);
    profile.dailyWater = dto.dailyWater ?? this.calculateWater(dto);
    profile.dailySteps = dto.dailySteps ?? this.calculateSteps(dto);

    return this.profileRepository.save(profile);
  }

  async findByUserId(userId: string): Promise<Profile> {
    const profile = await this.profileRepository.findOne({
      where: { userId },
      relations: {
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
    profile.currentProgramId = programId;
    return this.profileRepository.save(profile);
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
        return Math.round(tdee - 500);
      case FitnessGoal.GAIN_MUSCLE:
        return Math.round(tdee + 300);
      default:
        return Math.round(tdee);
    }
  }

  private calculateProtein(dto: CreateProfileDto): number {
    let factor = 1.2;
    switch (dto.goal) {
      case FitnessGoal.GAIN_MUSCLE:
      case FitnessGoal.ATHLETIC:
        factor = 2.0;
        break;
      case FitnessGoal.LOSE_FAT:
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
      case FitnessGoal.ATHLETIC:
        return 10000;
      default:
        return 8000;
    }
  }
}
