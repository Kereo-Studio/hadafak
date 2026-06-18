import { AppDataSource } from '../data-source';
import { Program, ProgramLevel } from '../../modules/programs/entities/program.entity';
import { ProgramDay } from '../../modules/programs/entities/program-day.entity';
import { ProgramDayExercise } from '../../modules/programs/entities/program-day-exercise.entity';
import { Exercise } from '../../modules/exercises/entities/exercise.entity';
import { DataSource } from 'typeorm';

async function getExId(dataSource: DataSource, displayName: string): Promise<string> {
  const repo = dataSource.getRepository(Exercise);
  const ex = await repo.findOne({ where: { displayName } });
  if (!ex) throw new Error(`Exercise not found: "${displayName}" — run main seed first`);
  return ex.id;
}

async function seedHomePrograms(dataSource: DataSource) {
  const programRepo = dataSource.getRepository(Program);
  const dayRepo = dataSource.getRepository(ProgramDay);
  const pdeRepo = dataSource.getRepository(ProgramDayExercise);

  // ─── 1. Beginner Bodyweight Full Body (3 days) ───────────────────────────
  const p1 = await programRepo.save(programRepo.create({
    name: 'Beginner Bodyweight Full Body',
    description: 'Zero equipment needed. Three full-body sessions using bodyweight moves to build strength, endurance, and muscle control. Perfect for complete beginners.',
    level: ProgramLevel.BEGINNER,
  }));
  const p1days = await dayRepo.save([
    dayRepo.create({ programId: p1.id, dayNumber: 1, title: 'Full Body A' }),
    dayRepo.create({ programId: p1.id, dayNumber: 2, title: 'Full Body B' }),
    dayRepo.create({ programId: p1.id, dayNumber: 3, title: 'Full Body C' }),
  ]);
  await pdeRepo.save([
    // Day 1
    pdeRepo.create({ programDayId: p1days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[0].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 2, targetSets: 3, targetRepsRange: '8-10', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[0].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[0].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    // Day 2
    pdeRepo.create({ programDayId: p1days[1].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 1, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[1].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 2, targetSets: 3, targetRepsRange: '5-8', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p1days[1].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p1days[1].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '20-30', targetRestTime: 45 }),
    // Day 3
    pdeRepo.create({ programDayId: p1days[2].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[2].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p1days[2].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p1days[2].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Beginner Bodyweight Full Body');

  // ─── 2. Bodyweight Upper/Lower Split (4 days) ─────────────────────────
  const p2 = await programRepo.save(programRepo.create({
    name: 'Bodyweight Upper/Lower Split',
    description: 'Intermediate 4-day split alternating upper and lower body focus using only bodyweight. Great for building calisthenics strength.',
    level: ProgramLevel.INTERMEDIATE,
  }));
  const p2days = await dayRepo.save([
    dayRepo.create({ programId: p2.id, dayNumber: 1, title: 'Upper Body A' }),
    dayRepo.create({ programId: p2.id, dayNumber: 2, title: 'Lower Body A' }),
    dayRepo.create({ programId: p2.id, dayNumber: 3, title: 'Upper Body B' }),
    dayRepo.create({ programId: p2.id, dayNumber: 4, title: 'Lower Body B' }),
  ]);
  await pdeRepo.save([
    // Upper A
    pdeRepo.create({ programDayId: p2days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[0].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 2, targetSets: 4, targetRepsRange: '6-10', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p2days[0].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[0].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 4, targetSets: 3, targetRepsRange: '6-8', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p2days[0].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 5, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    // Lower A
    pdeRepo.create({ programDayId: p2days[1].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 1, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[1].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p2days[1].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[1].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '20-30', targetRestTime: 45 }),
    // Upper B
    pdeRepo.create({ programDayId: p2days[2].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[2].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[2].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[2].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '20-30', targetRestTime: 45 }),
    // Lower B
    pdeRepo.create({ programDayId: p2days[3].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 1, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p2days[3].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p2days[3].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 4, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p2days[3].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Bodyweight Upper/Lower Split');

  // ─── 3. Dumbbell Full Body Starter (3 days) ───────────────────────────
  const p3 = await programRepo.save(programRepo.create({
    name: 'Dumbbell Full Body Starter',
    description: 'Three full-body sessions using only dumbbells. Ideal for home gym beginners who have a pair of adjustable dumbbells.',
    level: ProgramLevel.BEGINNER,
  }));
  const p3days = await dayRepo.save([
    dayRepo.create({ programId: p3.id, dayNumber: 1, title: 'Full Body A' }),
    dayRepo.create({ programId: p3.id, dayNumber: 2, title: 'Full Body B' }),
    dayRepo.create({ programId: p3.id, dayNumber: 3, title: 'Full Body C' }),
  ]);
  await pdeRepo.save([
    // Day 1
    pdeRepo.create({ programDayId: p3days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bench Press'), order: 1, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Overhead Press'), order: 4, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    // Day 2
    pdeRepo.create({ programDayId: p3days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 1, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Fly'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p3days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Lunge'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p3days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Lateral Raise'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    // Day 3
    pdeRepo.create({ programDayId: p3days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 1, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p3days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p3days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Tricep Extension'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Dumbbell Full Body Starter');

  // ─── 4. Dumbbell Upper/Lower Split (4 days) ────────────────────────────
  const p4 = await programRepo.save(programRepo.create({
    name: 'Dumbbell Upper/Lower Split',
    description: '4-day dumbbell-only split with upper and lower focus days. Ideal intermediate home program for balanced hypertrophy.',
    level: ProgramLevel.INTERMEDIATE,
  }));
  const p4days = await dayRepo.save([
    dayRepo.create({ programId: p4.id, dayNumber: 1, title: 'Upper Body A' }),
    dayRepo.create({ programId: p4.id, dayNumber: 2, title: 'Lower Body A' }),
    dayRepo.create({ programId: p4.id, dayNumber: 3, title: 'Upper Body B' }),
    dayRepo.create({ programId: p4.id, dayNumber: 4, title: 'Lower Body B' }),
  ]);
  await pdeRepo.save([
    // Upper A
    pdeRepo.create({ programDayId: p4days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bench Press'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Overhead Press'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p4days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Lateral Raise'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p4days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 5, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    // Lower A
    pdeRepo.create({ programDayId: p4days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Lunge'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p4days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Step-Up'), order: 4, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    // Upper B
    pdeRepo.create({ programDayId: p4days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Fly'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p4days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Deadlift'), order: 2, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Arnold Press'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p4days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Tricep Extension'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Lower B
    pdeRepo.create({ programDayId: p4days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p4days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p4days[3].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p4days[3].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Dumbbell Upper/Lower Split');

  // ─── 5. Bodyweight Push/Pull/Legs (5 days) ────────────────────────────
  const p5 = await programRepo.save(programRepo.create({
    name: 'Bodyweight Push/Pull/Legs',
    description: '5-day calisthenics PPL split. No equipment needed — build a lean athletic physique with push, pull, and leg movement patterns.',
    level: ProgramLevel.INTERMEDIATE,
  }));
  const p5days = await dayRepo.save([
    dayRepo.create({ programId: p5.id, dayNumber: 1, title: 'Push Day' }),
    dayRepo.create({ programId: p5.id, dayNumber: 2, title: 'Pull Day' }),
    dayRepo.create({ programId: p5.id, dayNumber: 3, title: 'Legs Day' }),
    dayRepo.create({ programId: p5.id, dayNumber: 4, title: 'Push Day B' }),
    dayRepo.create({ programId: p5.id, dayNumber: 5, title: 'Pull Day B' }),
  ]);
  await pdeRepo.save([
    // Push
    pdeRepo.create({ programDayId: p5days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[0].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[0].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Pull
    pdeRepo.create({ programDayId: p5days[1].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 1, targetSets: 4, targetRepsRange: '6-10', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p5days[1].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 2, targetSets: 3, targetRepsRange: '6-10', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p5days[1].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    // Legs
    pdeRepo.create({ programDayId: p5days[2].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 1, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p5days[2].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[2].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p5days[2].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 45 }),
    // Push B
    pdeRepo.create({ programDayId: p5days[3].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 5, targetRepsRange: '15-25', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[3].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[3].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 3, targetSets: 3, targetRepsRange: '20-30', targetRestTime: 45 }),
    // Pull B
    pdeRepo.create({ programDayId: p5days[4].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p5days[4].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p5days[4].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Bodyweight Push/Pull/Legs');

  // ─── 6. Home Fat Burn Circuit (3 days) ────────────────────────────────
  const p6 = await programRepo.save(programRepo.create({
    name: 'Home Fat Burn Circuit',
    description: 'High-rep bodyweight circuit training designed to elevate heart rate, torch calories, and build muscular endurance — no equipment required.',
    level: ProgramLevel.BEGINNER,
  }));
  const p6days = await dayRepo.save([
    dayRepo.create({ programId: p6.id, dayNumber: 1, title: 'Cardio & Core Circuit' }),
    dayRepo.create({ programId: p6.id, dayNumber: 2, title: 'Upper Body Circuit' }),
    dayRepo.create({ programId: p6.id, dayNumber: 3, title: 'Lower Body Circuit' }),
  ]);
  await pdeRepo.save([
    // Cardio & Core
    pdeRepo.create({ programDayId: p6days[0].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 1, targetSets: 4, targetRepsRange: '10-15', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p6days[0].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 2, targetSets: 4, targetRepsRange: '20-30', targetRestTime: 30 }),
    pdeRepo.create({ programDayId: p6days[0].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 30 }),
    pdeRepo.create({ programDayId: p6days[0].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    // Upper
    pdeRepo.create({ programDayId: p6days[1].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p6days[1].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p6days[1].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p6days[1].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 30 }),
    // Lower
    pdeRepo.create({ programDayId: p6days[2].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 1, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p6days[2].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p6days[2].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 30 }),
    pdeRepo.create({ programDayId: p6days[2].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 30 }),
  ]);
  console.log('Seeded: Home Fat Burn Circuit');

  // ─── 7. Core & Strength Foundation (4 days) ───────────────────────────
  const p7 = await programRepo.save(programRepo.create({
    name: 'Core & Strength Foundation',
    description: 'Four-day bodyweight program pairing core work with compound pushing and pulling movements. Builds a strong posture and athletic base.',
    level: ProgramLevel.BEGINNER,
  }));
  const p7days = await dayRepo.save([
    dayRepo.create({ programId: p7.id, dayNumber: 1, title: 'Push & Core A' }),
    dayRepo.create({ programId: p7.id, dayNumber: 2, title: 'Pull & Core A' }),
    dayRepo.create({ programId: p7.id, dayNumber: 3, title: 'Legs & Core' }),
    dayRepo.create({ programId: p7.id, dayNumber: 4, title: 'Full Body Core Circuit' }),
  ]);
  await pdeRepo.save([
    // Push & Core A
    pdeRepo.create({ programDayId: p7days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[0].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[0].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p7days[0].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    // Pull & Core A
    pdeRepo.create({ programDayId: p7days[1].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 1, targetSets: 3, targetRepsRange: '5-8', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p7days[1].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 2, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[1].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    // Legs & Core
    pdeRepo.create({ programDayId: p7days[2].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 1, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[2].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 2, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p7days[2].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[2].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '20-30', targetRestTime: 45 }),
    // Full Body Core Circuit
    pdeRepo.create({ programDayId: p7days[3].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 1, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p7days[3].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p7days[3].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p7days[3].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Core & Strength Foundation');

  // ─── 8. Dumbbell PPL (6 days) ─────────────────────────────────────────
  const p8 = await programRepo.save(programRepo.create({
    name: 'Dumbbell PPL',
    description: '6-day dumbbell-only Push/Pull/Legs program. Maximizes volume for intermediate lifters who train at home with adjustable dumbbells.',
    level: ProgramLevel.INTERMEDIATE,
  }));
  const p8days = await dayRepo.save([
    dayRepo.create({ programId: p8.id, dayNumber: 1, title: 'Push A' }),
    dayRepo.create({ programId: p8.id, dayNumber: 2, title: 'Pull A' }),
    dayRepo.create({ programId: p8.id, dayNumber: 3, title: 'Legs A' }),
    dayRepo.create({ programId: p8.id, dayNumber: 4, title: 'Push B' }),
    dayRepo.create({ programId: p8.id, dayNumber: 5, title: 'Pull B' }),
    dayRepo.create({ programId: p8.id, dayNumber: 6, title: 'Legs B' }),
  ]);
  await pdeRepo.save([
    // Push A
    pdeRepo.create({ programDayId: p8days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bench Press'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Overhead Press'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p8days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Lateral Raise'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p8days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Tricep Extension'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Pull A
    pdeRepo.create({ programDayId: p8days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 1, targetSets: 4, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Deadlift'), order: 2, targetSets: 3, targetRepsRange: '8-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Legs A
    pdeRepo.create({ programDayId: p8days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Lunge'), order: 3, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 60 }),
    // Push B
    pdeRepo.create({ programDayId: p8days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Fly'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p8days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Arnold Press'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p8days[3].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p8days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Lateral Raise'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    // Pull B
    pdeRepo.create({ programDayId: p8days[4].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[4].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 2, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p8days[4].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 3, targetSets: 3, targetRepsRange: '6-10', targetRestTime: 90 }),
    // Legs B
    pdeRepo.create({ programDayId: p8days[5].id, exerciseId: await getExId(dataSource, 'Dumbbell Step-Up'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p8days[5].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p8days[5].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 3, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p8days[5].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Dumbbell PPL');

  // ─── 9. Advanced Calisthenics (4 days) ────────────────────────────────
  const p9 = await programRepo.save(programRepo.create({
    name: 'Advanced Calisthenics',
    description: 'High-volume bodyweight training for advanced athletes. Builds raw pulling and pushing strength, targeting max reps and explosive power.',
    level: ProgramLevel.ADVANCED,
  }));
  const p9days = await dayRepo.save([
    dayRepo.create({ programId: p9.id, dayNumber: 1, title: 'Push Strength' }),
    dayRepo.create({ programId: p9.id, dayNumber: 2, title: 'Pull Strength' }),
    dayRepo.create({ programId: p9.id, dayNumber: 3, title: 'Legs & Explosive' }),
    dayRepo.create({ programId: p9.id, dayNumber: 4, title: 'Full Body Volume' }),
  ]);
  await pdeRepo.save([
    // Push Strength
    pdeRepo.create({ programDayId: p9days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 1, targetSets: 5, targetRepsRange: '20-30', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[0].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[0].id, exerciseId: await getExId(dataSource, 'Bench Dip'), order: 3, targetSets: 4, targetRepsRange: '20-25', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[0].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '30-40', targetRestTime: 45 }),
    // Pull Strength
    pdeRepo.create({ programDayId: p9days[1].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 1, targetSets: 5, targetRepsRange: '10-15', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p9days[1].id, exerciseId: await getExId(dataSource, 'Chin-Up'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p9days[1].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 3, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    // Legs & Explosive
    pdeRepo.create({ programDayId: p9days[2].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 1, targetSets: 5, targetRepsRange: '15-20', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p9days[2].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 2, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[2].id, exerciseId: await getExId(dataSource, 'Forward Lunge'), order: 3, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[2].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 4, targetSets: 4, targetRepsRange: '25-30', targetRestTime: 45 }),
    // Full Body Volume
    pdeRepo.create({ programDayId: p9days[3].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 1, targetSets: 4, targetRepsRange: '12-15', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p9days[3].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 2, targetSets: 4, targetRepsRange: '20-25', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[3].id, exerciseId: await getExId(dataSource, 'Jump Squat'), order: 3, targetSets: 4, targetRepsRange: '15-20', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p9days[3].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 4, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p9days[3].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 5, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Advanced Calisthenics');

  // ─── 10. Full Home Hybrid BW + Dumbbells (5 days) ─────────────────────
  const p10 = await programRepo.save(programRepo.create({
    name: 'Full Home Hybrid (BW + Dumbbells)',
    description: '5-day hybrid home program combining bodyweight and dumbbell exercises. Covers strength, hypertrophy, and conditioning across the week.',
    level: ProgramLevel.INTERMEDIATE,
  }));
  const p10days = await dayRepo.save([
    dayRepo.create({ programId: p10.id, dayNumber: 1, title: 'Push & Chest' }),
    dayRepo.create({ programId: p10.id, dayNumber: 2, title: 'Pull & Back' }),
    dayRepo.create({ programId: p10.id, dayNumber: 3, title: 'Legs & Glutes' }),
    dayRepo.create({ programId: p10.id, dayNumber: 4, title: 'Shoulders & Arms' }),
    dayRepo.create({ programId: p10.id, dayNumber: 5, title: 'Full Body Conditioning' }),
  ]);
  await pdeRepo.save([
    // Push & Chest
    pdeRepo.create({ programDayId: p10days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Bench Press'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p10days[0].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 2, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[0].id, exerciseId: await getExId(dataSource, 'Dumbbell Fly'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[0].id, exerciseId: await getExId(dataSource, 'Close-Grip Push-Up'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    // Pull & Back
    pdeRepo.create({ programDayId: p10days[1].id, exerciseId: await getExId(dataSource, 'Pull-up'), order: 1, targetSets: 4, targetRepsRange: '6-10', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p10days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Bent Over Row'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p10days[1].id, exerciseId: await getExId(dataSource, 'Inverted Row'), order: 3, targetSets: 3, targetRepsRange: '10-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[1].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    // Legs & Glutes
    pdeRepo.create({ programDayId: p10days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p10days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Romanian Deadlift'), order: 2, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 90 }),
    pdeRepo.create({ programDayId: p10days[2].id, exerciseId: await getExId(dataSource, 'Dumbbell Lunge'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[2].id, exerciseId: await getExId(dataSource, 'Glute Bridge'), order: 4, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p10days[2].id, exerciseId: await getExId(dataSource, 'Bodyweight Calf Raise'), order: 5, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
    // Shoulders & Arms
    pdeRepo.create({ programDayId: p10days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Overhead Press'), order: 1, targetSets: 4, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p10days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Arnold Press'), order: 2, targetSets: 3, targetRepsRange: '10-12', targetRestTime: 75 }),
    pdeRepo.create({ programDayId: p10days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Lateral Raise'), order: 3, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Hammer Curl'), order: 4, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p10days[3].id, exerciseId: await getExId(dataSource, 'Dumbbell Tricep Extension'), order: 5, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 45 }),
    // Full Body Conditioning
    pdeRepo.create({ programDayId: p10days[4].id, exerciseId: await getExId(dataSource, 'Burpee'), order: 1, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[4].id, exerciseId: await getExId(dataSource, 'Dumbbell Goblet Squat'), order: 2, targetSets: 3, targetRepsRange: '12-15', targetRestTime: 60 }),
    pdeRepo.create({ programDayId: p10days[4].id, exerciseId: await getExId(dataSource, 'Push-Up'), order: 3, targetSets: 3, targetRepsRange: '15-20', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p10days[4].id, exerciseId: await getExId(dataSource, 'Mountain Climber'), order: 4, targetSets: 3, targetRepsRange: '25-30', targetRestTime: 45 }),
    pdeRepo.create({ programDayId: p10days[4].id, exerciseId: await getExId(dataSource, 'Crunch'), order: 5, targetSets: 3, targetRepsRange: '20-25', targetRestTime: 45 }),
  ]);
  console.log('Seeded: Full Home Hybrid (BW + Dumbbells)');

  console.log('\n✓ All 10 home programs seeded successfully.');
}

async function main() {
  console.log('Initializing database connection...');
  await AppDataSource.initialize();
  console.log('Connection established.');
  try {
    await seedHomePrograms(AppDataSource);
  } finally {
    await AppDataSource.destroy();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Error seeding home programs:', err);
    process.exit(1);
  });
}

export { seedHomePrograms };
