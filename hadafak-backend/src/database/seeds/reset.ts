/**
 * Database reset — destructive.
 *
 * Drops the entire `public` schema, recreates it, then runs all TypeORM
 * migrations to rebuild a clean, migration-tracked schema. This is the
 * authoritative way to bring any database (local or production) to a known
 * good baseline before seeding.
 *
 *   npm run db:reset          # drop + recreate + migrate
 *
 * Guard: refuses to run against a production DB unless ALLOW_PROD_RESET=true,
 * since this deletes ALL data irreversibly.
 */
import { AppDataSource } from '../data-source';

async function reset() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.ALLOW_PROD_RESET !== 'true') {
    console.error(
      '✗ Refusing to reset a production database. Set ALLOW_PROD_RESET=true to override.',
    );
    process.exit(1);
  }

  console.log('Connecting to database...');
  await AppDataSource.initialize();

  try {
    console.log('Dropping schema "public" (cascade)...');
    await AppDataSource.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await AppDataSource.query('CREATE SCHEMA public;');
    console.log('Schema recreated.');

    console.log('Running migrations...');
    const migrations = await AppDataSource.runMigrations();
    console.log(`Applied ${migrations.length} migration(s):`);
    migrations.forEach((m) => console.log(`  ✓ ${m.name}`));

    console.log('\n✓ Database reset complete. Run `npm run db:seed` to populate.');
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  reset().catch((err) => {
    console.error('Reset failed:', err);
    process.exit(1);
  });
}
