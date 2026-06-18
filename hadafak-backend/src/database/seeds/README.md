# Database: migrations & seeding

The schema is owned by **migrations** (never `synchronize` in production). Seed
data is populated by an explicit, idempotent, modular **seeder** system.

## Commands

| Command | What it does |
|---|---|
| `npm run db:reset` | **Destructive.** Drops the `public` schema, recreates it, runs all migrations. Brings any DB to a clean migration-tracked baseline. Refuses to run when `NODE_ENV=production` unless `ALLOW_PROD_RESET=true`. |
| `npm run db:seed` | Runs every seeder in order (idempotent — safe to re-run). |
| `npm run db:seed -- exercises foods` | Runs only the named seeders. Valid: `exercises`, `foods`, `recipes`, `programs`. |
| `npm run db:fresh` | `db:reset` then `db:seed` — a full clean rebuild. |
| `npm run migration:generate src/database/migrations/<Name>` | Generate a new migration from entity changes (diff against the configured DB). |
| `npm run migration:run` / `migration:revert` | Apply / roll back migrations manually. |

On app startup, migrations run automatically (`migrationsRun` is on whenever
`DATABASE_SYNCHRONIZE=false`). Seeding is **never** triggered on startup.

## Layout

```
seeds/
  index.ts              orchestrator (boots a Nest context, runs seeders)
  reset.ts              schema reset (drop + migrate)
  data/
    foods.data.ts       base whole-food library
    programs.data.ts    curated gym + home programs (exercise refs are dataset externalIds)
  seeders/
    exercises.seeder.ts full 1324-exercise library from exercises-dataset-main
    foods.seeder.ts     base foods (idempotent by name)
    recipes.seeder.ts   live import from TheMealDB via the recipe-integration pipeline
    programs.seeder.ts  programs, resolving exercises by externalId (idempotent by name)
```

## Notes

- **Exercise GIFs:** by default `gifUrl` points at the in-app proxy
  `/api/v1/exercises/image/:externalId` (lazy fetch + cache). Set
  `SEED_UPLOAD_GIFS=true` (with AWS creds + the dataset `videos/` folder) to
  upload every GIF to S3 and store direct S3 URLs instead.
- **Recipes:** pulled live from TheMealDB across ~14 search terms. Idempotent via
  `recipe_external_mappings`; degrades to the provider's mock recipes if offline.
- **Program exercise IDs:** referenced by the *local dataset* externalId. These do
  **not** match ExerciseDB API ids — always verify a new id against
  `exercises-dataset-main/data/exercises.json` before adding it to a program.
- The seeder boots a full Nest context only so the recipes seeder can reuse the
  wired TheMealDB pipeline (normalization, macro calc, auto-tagging, dedup).

## First production deploy / clean rebuild

The old `synchronize: true` deploys left the schema present but untracked by
migrations. To move to the migration-owned world, rebuild clean:

```bash
ALLOW_PROD_RESET=true DATABASE_URL=<prod-url> npm run db:reset
DATABASE_URL=<prod-url> npm run db:seed
```
