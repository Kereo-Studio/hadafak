import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const url = process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...(url ? { url } : {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USERNAME || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'hadafak',
  }),
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV !== 'production',
  entities: [path.join(__dirname, '../modules/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/migrations/**/*{.ts,.js}')],
  subscribers: [],
  ssl: url ? { rejectUnauthorized: false } : false,
});
