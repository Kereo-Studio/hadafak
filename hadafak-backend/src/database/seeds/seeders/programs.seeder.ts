import { DataSource } from 'typeorm';
import { Program } from '../../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../../modules/programs/entities/program-day-exercise.entity';
import { Exercise } from '../../../modules/exercises/entities/exercise.entity';
import { ALL_PROGRAMS, ProgramDef } from '../data/programs.data';

/**
 * Seeds the curated gym + home programs. Idempotent: a program is skipped if
 * one with the same name already exists. Each exercise is resolved against the
 * seeded exercises table by externalId; an unresolved reference is warned about
 * and skipped rather than failing the whole seed.
 */
export async function seedPrograms(dataSource: DataSource): Promise<void> {
  const programRepo = dataSource.getRepository(Program);
  const dayRepo = dataSource.getRepository(ProgramDay);
  const pdeRepo = dataSource.getRepository(ProgramDayExercise);
  const exerciseRepo = dataSource.getRepository(Exercise);

  // Build externalId -> exercise.id lookup once.
  const exercises = await exerciseRepo.find({ select: { id: true, externalId: true } });
  const idByExternal = new Map<string, string>();
  for (const ex of exercises) {
    if (ex.externalId) idByExternal.set(ex.externalId, ex.id);
  }

  const existingNames = new Set((await programRepo.find({ select: { name: true } })).map((p) => p.name));

  let created = 0;
  let skipped = 0;
  const missingRefs = new Set<string>();

  const seedOne = async (def: ProgramDef): Promise<void> => {
    if (existingNames.has(def.name)) {
      skipped++;
      return;
    }

    const program = await programRepo.save(
      programRepo.create({ name: def.name, description: def.description, level: def.level }),
    );

    for (let di = 0; di < def.days.length; di++) {
      const dayDef = def.days[di];
      const day = await dayRepo.save(
        dayRepo.create({ programId: program.id, dayNumber: di + 1, title: dayDef.title }),
      );

      let order = 1;
      for (const exDef of dayDef.exercises) {
        const exerciseId = idByExternal.get(exDef.ex);
        if (!exerciseId) {
          missingRefs.add(exDef.ex);
          continue;
        }
        await pdeRepo.save(
          pdeRepo.create({
            programDayId: day.id,
            exerciseId,
            order: order++,
            targetSets: exDef.sets,
            targetRepsRange: exDef.reps,
            targetRestTime: exDef.rest,
          }),
        );
      }
    }
    created++;
  };

  for (const def of ALL_PROGRAMS) {
    await seedOne(def);
  }

  if (missingRefs.size) {
    console.warn(`  ⚠ ${missingRefs.size} exercise refs not found (skipped): ${[...missingRefs].join(', ')}`);
  }
  console.log(`  ✓ Programs: ${created} created, ${skipped} already present.`);
}
