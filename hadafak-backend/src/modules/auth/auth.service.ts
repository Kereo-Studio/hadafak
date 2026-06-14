import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);
    const user = await this.usersService.create(dto.email, passwordHash, dto.name);
    
    const tokens = await this.generateTokens(user.id, user.email);
    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email, true);
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email);
    
    const { password, ...userResponse } = user;
    return {
      user: userResponse,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('app.jwtSecret'),
      });
      
      const user = await this.usersService.findById(payload.sub);
      return this.generateTokens(user.id, user.email);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('app.jwtSecret'),
      expiresIn: (this.configService.get<string>('app.jwtAccessExpiration') || '15m') as any,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('app.jwtSecret'),
      expiresIn: (this.configService.get<string>('app.jwtRefreshExpiration') || '7d') as any,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
