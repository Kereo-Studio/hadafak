import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Food } from './entities/food.entity';
import { NutritionLog } from './entities/nutrition-log.entity';
import { WaterLog } from './entities/water-log.entity';
import { NutritionService } from './nutrition.service';
import { FatSecretService } from './fatsecret.service';
import { OpenFoodFactsService } from './openfoodfacts.service';
import { NutritionController } from './nutrition.controller';
import { AuthModule } from '../auth/auth.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Food, NutritionLog, WaterLog]),
    AuthModule,
    ProfilesModule,
  ],
  providers: [NutritionService, FatSecretService, OpenFoodFactsService],
  controllers: [NutritionController],
  exports: [NutritionService, FatSecretService, OpenFoodFactsService, TypeOrmModule],
})
export class NutritionModule { }

