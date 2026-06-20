import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCoachTables1781796101262 implements MigrationInterface {
  name = 'AddCoachTables1781796101262';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coach_insights" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "message" text NOT NULL,
        "adaptations" jsonb,
        "week_start" date NOT NULL,
        "applied" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coach_insights" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coach_memories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "injuries" jsonb NOT NULL DEFAULT '[]',
        "avoided_foods" jsonb NOT NULL DEFAULT '[]',
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "plateau_log" jsonb NOT NULL DEFAULT '[]',
        "coach_notes" text,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_coach_memories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_coach_memories_user_id" UNIQUE ("user_id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_coach_insights_user_id" ON "coach_insights" ("user_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_coach_insights_user_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coach_memories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coach_insights"`);
  }
}
