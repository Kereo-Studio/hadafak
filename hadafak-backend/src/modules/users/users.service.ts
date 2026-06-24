import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(email: string, passwordHash: string, name?: string): Promise<User> {
    const existing = await this.userRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already exists');
    }
    const user = this.userRepository.create({ email, password: passwordHash, name });
    const saved = await this.userRepository.save(user);
    delete saved.password;
    return saved;
  }

  async findByEmail(email: string, includePassword = false): Promise<User | null> {
    if (includePassword) {
      return this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.password')
        .where('user.email = :email', { email })
        .getOne();
    }
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { profile: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  /**
   * Resolves a Google identity to a user. Auto-links by email: if an account
   * already exists with this email (e.g. created via email/password), the
   * Google identity is attached to it instead of creating a duplicate.
   */
  async findOrCreateGoogleUser(profile: {
    googleId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    // 1. Already linked by googleId
    const byGoogleId = await this.userRepository.findOne({ where: { googleId: profile.googleId } });
    if (byGoogleId) return byGoogleId;

    // 2. Existing account with same email → link it
    const byEmail = await this.userRepository.findOne({ where: { email: profile.email } });
    if (byEmail) {
      byEmail.googleId = profile.googleId;
      if (!byEmail.avatarUrl && profile.avatarUrl) byEmail.avatarUrl = profile.avatarUrl;
      if (!byEmail.name && profile.name) byEmail.name = profile.name;
      return this.userRepository.save(byEmail);
    }

    // 3. Brand new Google user (no password)
    const user = this.userRepository.create({
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      googleId: profile.googleId,
      provider: 'google',
    });
    return this.userRepository.save(user);
  }
}
