import { Controller, Get, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { runSeeding } from './database/seeds/seed';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check() {
    try {
      // Check database connection by running a simple query
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Post('seed')
  @HttpCode(HttpStatus.OK)
  async seed() {
    try {
      await runSeeding(this.dataSource);
      return {
        status: 'success',
        message: 'Database seeded successfully',
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Seeding failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
