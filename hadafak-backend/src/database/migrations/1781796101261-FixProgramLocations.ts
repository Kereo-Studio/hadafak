import { MigrationInterface, QueryRunner } from 'typeorm';

const HOME_PROGRAM_NAMES = [
  'Beginner Bodyweight Full Body',
  'Bodyweight Upper/Lower Split',
  'Dumbbell Full Body Starter',
  'Dumbbell Upper/Lower Split',
  'Bodyweight Push/Pull/Legs',
  'Home Fat Burn Circuit',
  'Core & Strength Foundation',
  'Dumbbell PPL',
  'Advanced Calisthenics',
  'Full Home Hybrid (BW + Dumbbells)',
];

export class FixProgramLocations1781796101261 implements MigrationInterface {
  name = 'FixProgramLocations1781796101261';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure column exists (safe to run even if AddProgramLocation already ran)
    await queryRunner.query(
      `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "location" character varying NOT NULL DEFAULT 'gym'`,
    );
    // Fix all known home programs that got defaulted to 'gym'
    const names = HOME_PROGRAM_NAMES.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
    await queryRunner.query(
      `UPDATE "programs" SET "location" = 'home' WHERE "name" IN (${names})`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const names = HOME_PROGRAM_NAMES.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
    await queryRunner.query(
      `UPDATE "programs" SET "location" = 'gym' WHERE "name" IN (${names})`,
    );
  }
}
