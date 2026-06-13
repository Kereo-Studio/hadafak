import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Exercise } from './modules/exercises/entities/exercise.entity';

import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Increase body limit for large base64 image uploads (like AI scanning)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Enable Cross-Origin Resource Sharing (CORS)
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Serve static assets from uploads directory
  app.useStaticAssets(path.join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const configService = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('HADEF Fitness API')
    .setDescription('The API documentation for HADEF fitness application backend services')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  app.enableShutdownHooks();

  // Run db seeding if database has no exercises
  try {
    const dataSource = app.get(DataSource);
    const exerciseCount = await dataSource.getRepository(Exercise).count();
    if (exerciseCount === 0) {
      console.log('Database appears empty. Seeding initial data...');
      const { runSeeding } = await import('./database/seeds/seed.js');
      await runSeeding(dataSource);
      console.log('Seeding completed successfully!');
    }
  } catch (e) {
    console.error('Error checking/seeding database on startup:', e);
  }

  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}/api/v1`);
  console.log(`Swagger documentation is available at: http://localhost:${port}/docs`);
}
bootstrap();
