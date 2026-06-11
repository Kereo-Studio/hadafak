import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Program, ProgramLevel } from './entities/program.entity';
import { ProgramDay } from './entities/program-day.entity';
import { ProgramDayExercise } from './entities/program-day-exercise.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { ProfilesService } from '../profiles/profiles.service';

@Injectable()
export class ProgramsService {
  constructor(
    @InjectRepository(Program)
    private readonly programRepository: Repository<Program>,
    @InjectRepository(ProgramDay)
    private readonly programDayRepository: Repository<ProgramDay>,
    @InjectRepository(ProgramDayExercise)
    private readonly programDayExerciseRepository: Repository<ProgramDayExercise>,
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
    private readonly profilesService: ProfilesService,
  ) {}

  async findAll(): Promise<Program[]> {
    return this.programRepository.find({
      relations: {
        days: {
          exercises: {
            exercise: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<Program> {
    const program = await this.programRepository.findOne({
      where: { id },
      relations: {
        days: {
          exercises: {
            exercise: true,
          },
        },
      },
    });
    if (!program) {
      throw new NotFoundException(`Program with ID ${id} not found`);
    }
    return program;
  }

  async create(
    name: string,
    description: string,
    level: ProgramLevel,
    days?: { dayNumber: number; title: string }[],
  ): Promise<Program> {
    const program = this.programRepository.create({ name, description, level });
    const savedProgram = await this.programRepository.save(program);

    if (days && days.length > 0) {
      const programDays = days.map((day) =>
        this.programDayRepository.create({
          programId: savedProgram.id,
          dayNumber: day.dayNumber,
          title: day.title,
        }),
      );
      await this.programDayRepository.save(programDays);
    }

    return this.findById(savedProgram.id);
  }

  async findDayById(dayId: string): Promise<ProgramDay> {
    const day = await this.programDayRepository.findOne({
      where: { id: dayId },
      relations: {
        exercises: {
          exercise: true,
        },
      },
    });
    if (!day) {
      throw new NotFoundException(`Program day with ID ${dayId} not found`);
    }
    return day;
  }

  async generateProgramForUser(userId: string): Promise<Program> {
    const profile = await this.profilesService.findByUserId(userId);
    const exercises = await this.exerciseRepository.find();
    
    const getExId = (name: string): string | null => {
      const found = exercises.find((e) => e.name.toLowerCase() === name.toLowerCase());
      return found ? found.id : null;
    };

    let programName = `Personalized program`;
    let programDesc = `Custom routine generated based on your goals.`;
    let level = ProgramLevel.BEGINNER;

    if (profile.trainingDays >= 5) {
      level = ProgramLevel.ADVANCED;
    } else if (profile.trainingDays >= 3) {
      level = ProgramLevel.INTERMEDIATE;
    }

    const program = this.programRepository.create({
      name: programName,
      description: programDesc,
      level,
    });
    const savedProgram = await this.programRepository.save(program);

    const daysToCreate: { title: string; dayNumber: number; exercises: { name: string; sets: number; reps: string; rest: number }[] }[] = [];

    if (profile.trainingDays === 4) {
      program.name = `4-Day Upper / Lower Split`;
      program.description = `Optimized schedule targeting upper body and lower body twice a week.`;
      
      daysToCreate.push(
        {
          title: 'Upper Body A',
          dayNumber: 1,
          exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Barbell Row', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest: 90 },
            { name: 'Pull-up', sets: 3, reps: '8-10', rest: 90 },
            { name: 'Bicep Curl', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
        {
          title: 'Lower Body A',
          dayNumber: 2,
          exercises: [
            { name: 'Barbell Squat', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Romanian Deadlift', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Leg Extension', sets: 3, reps: '10-15', rest: 60 },
            { name: 'Lying Leg Curl', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
        {
          title: 'Upper Body B',
          dayNumber: 3,
          exercises: [
            { name: 'Incline Dumbbell Press', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Barbell Row', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12-15', rest: 60 },
            { name: 'Tricep Pushdown', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
        {
          title: 'Lower Body B',
          dayNumber: 4,
          exercises: [
            { name: 'Barbell Squat', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Romanian Deadlift', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Lying Leg Curl', sets: 3, reps: '10-15', rest: 60 },
            { name: 'Leg Extension', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
      );
    } else if (profile.trainingDays === 3) {
      program.name = `3-Day Push Pull Legs (PPL)`;
      program.description = `Classic hypertrophy routine focusing on specific movement patterns.`;
      
      daysToCreate.push(
        {
          title: 'Push Day',
          dayNumber: 1,
          exercises: [
            { name: 'Bench Press', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Incline Dumbbell Press', sets: 3, reps: '8-12', rest: 90 },
            { name: 'Overhead Press', sets: 3, reps: '8-12', rest: 90 },
            { name: 'Tricep Pushdown', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
        {
          title: 'Pull Day',
          dayNumber: 2,
          exercises: [
            { name: 'Pull-up', sets: 4, reps: '8-10', rest: 90 },
            { name: 'Barbell Row', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12-15', rest: 60 },
            { name: 'Bicep Curl', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
        {
          title: 'Legs Day',
          dayNumber: 3,
          exercises: [
            { name: 'Barbell Squat', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Romanian Deadlift', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Leg Extension', sets: 3, reps: '10-15', rest: 60 },
            { name: 'Lying Leg Curl', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
      );
    } else {
      program.name = `Full Body Routine`;
      program.description = `Compact compound movement schedule for overall physical conditioning.`;
      
      daysToCreate.push(
        {
          title: 'Full Body A',
          dayNumber: 1,
          exercises: [
            { name: 'Barbell Squat', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Bench Press', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Barbell Row', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Dumbbell Lateral Raise', sets: 3, reps: '12-15', rest: 60 },
          ],
        },
        {
          title: 'Full Body B',
          dayNumber: 2,
          exercises: [
            { name: 'Romanian Deadlift', sets: 4, reps: '8-12', rest: 120 },
            { name: 'Incline Dumbbell Press', sets: 4, reps: '8-12', rest: 90 },
            { name: 'Pull-up', sets: 3, reps: '8-10', rest: 90 },
            { name: 'Bicep Curl', sets: 3, reps: '10-15', rest: 60 },
          ],
        },
      );
    }

    await this.programRepository.save(program);

    for (const d of daysToCreate) {
      const pDay = this.programDayRepository.create({
        programId: savedProgram.id,
        dayNumber: d.dayNumber,
        title: d.title,
      });
      const savedDay = await this.programDayRepository.save(pDay);

      let order = 1;
      for (const e of d.exercises) {
        const exerciseId = getExId(e.name);
        if (exerciseId) {
          const dayEx = this.programDayExerciseRepository.create({
            programDayId: savedDay.id,
            exerciseId,
            order: order++,
            targetSets: e.sets,
            targetRepsRange: e.reps,
            targetRestTime: e.rest,
          });
          await this.programDayExerciseRepository.save(dayEx);
        }
      }
    }

    await this.profilesService.assignProgram(userId, savedProgram.id);

    return this.findById(savedProgram.id);
  }
}
