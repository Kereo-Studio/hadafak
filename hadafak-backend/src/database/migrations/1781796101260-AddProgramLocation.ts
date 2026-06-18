import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgramLocation1781796101260 implements MigrationInterface {
  name = 'AddProgramLocation1781796101260';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "programs" ADD COLUMN IF NOT EXISTS "location" character varying NOT NULL DEFAULT 'gym'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "programs" DROP COLUMN IF EXISTS "location"`);
  }
}
