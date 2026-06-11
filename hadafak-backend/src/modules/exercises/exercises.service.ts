import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from './entities/exercise.entity';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise)
    private readonly exerciseRepository: Repository<Exercise>,
  ) {}

  async findAll(muscleGroup?: string): Promise<Exercise[]> {
    if (muscleGroup) {
      return this.exerciseRepository.find({
        where: { muscleGroup },
      });
    }
    return this.exerciseRepository.find();
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exerciseRepository.findOne({ where: { id } });
    if (!exercise) {
      throw new NotFoundException(`Exercise with ID ${id} not found`);
    }
    return exercise;
  }

  async create(name: string, muscleGroup: string): Promise<Exercise> {
    const exercise = this.exerciseRepository.create({ name, muscleGroup });
    return this.exerciseRepository.save(exercise);
  }
}
