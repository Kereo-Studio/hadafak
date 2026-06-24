import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuthToUsers1781796101263 implements MigrationInterface {
  name = 'AddGoogleAuthToUsers1781796101263';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "provider" character varying NOT NULL DEFAULT 'local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_id" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_google_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "google_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "provider"`);
  }
}
