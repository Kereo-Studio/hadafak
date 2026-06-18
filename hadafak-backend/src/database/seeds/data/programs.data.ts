import { ProgramLevel } from '../../../modules/programs/entities/program.entity';

/**
 * Curated training programs.
 *
 * Every exercise is referenced by its dataset `externalId` (the local
 * exercises-dataset-main id). All ids below have been verified to exist in the
 * dataset AND to map to the intended movement — do NOT assume an ExerciseDB id
 * matches the local dataset, they diverge. The programs seeder resolves each id
 * against the seeded exercises table and skips (with a warning) any it can't
 * find, so the seed never hard-fails on a single bad reference.
 */

/** Validated externalId map: readable key -> local dataset id. */
export const EX = {
  // Barbell
  benchPress: '0025',
  inclineBenchPress: '0047',
  squat: '0043',
  frontSquat: '0042',
  deadlift: '0032',
  romanianDeadlift: '0085',
  overheadPress: '0091',
  barbellRow: '0027',
  barbellCurl: '0031',
  ezBarCurl: '0447',
  preacherCurl: '0070',
  closeGripBench: '0030',
  barbellGluteBridge: '1409',
  // Dumbbell
  dbInclineBench: '0314',
  dbBench: '0289',
  dbFly: '0308',
  dbDeclineBench: '0301',
  dbLateralRaise: '0334',
  dbFrontRaise: '0310',
  dbRomanianDeadlift: '1459',
  dbGobletSquat: '1760',
  dbRow: '0293',
  dbShoulderPress: '0405',
  dbArnoldPress: '2137',
  dbHammerCurl: '0313',
  dbCrossBodyHammerCurl: '0298',
  dbLunge: '0336',
  dbStepUp: '0431',
  dbDeadlift: '0300',
  dbPullover: '0375',
  dbKickback: '0333',
  dbShrug: '0406',
  dbCalfRaise: '0417',
  dbTricepExt: '0351',
  // Machine / cable
  latPulldown: '2330',
  cableRow: '0861',
  tricepPushdown: '0241',
  legExtension: '0585',
  legCurl: '0586',
  legPress: '2287',
  calfRaiseMachine: '0605',
  rearDeltRow: '0203',
  tBarRow: '0606',
  // Bodyweight
  pullup: '0652',
  pushup: '0662',
  chinup: '1326',
  closeGripPushup: '0259',
  benchDip: '0129',
  invertedRow: '0499',
  mountainClimber: '0630',
  burpee: '1160',
  jumpSquat: '0514',
  gluteBridge: '3013',
  bwCalfRaise: '1373',
  crunch: '0274',
  frontPlank: '0464',
  forwardLunge: '3470',
  russianTwist: '0687',
  flutterKick: '0459',
  highKnees: '3636',
} as const;

export interface ProgramExerciseDef {
  ex: string; // externalId
  sets: number;
  reps: string;
  rest: number; // seconds
}
export interface ProgramDayDef {
  title: string;
  exercises: ProgramExerciseDef[];
}
export interface ProgramDef {
  name: string;
  description: string;
  level: ProgramLevel;
  location: 'gym' | 'home';
  days: ProgramDayDef[];
}

const e = (ex: string, sets: number, reps: string, rest: number): ProgramExerciseDef => ({ ex, sets, reps, rest });

// ─── GYM PROGRAMS ───────────────────────────────────────────────────────────
export const GYM_PROGRAMS: ProgramDef[] = [
  {
    name: '6-Day Push/Pull/Legs (PPL)',
    description: 'High-frequency 6-day PPL split hitting each muscle group twice weekly for maximum hypertrophy.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Push A', exercises: [e(EX.benchPress, 4, '6-8', 120), e(EX.overheadPress, 3, '8-10', 90), e(EX.dbInclineBench, 3, '10-12', 90), e(EX.dbLateralRaise, 4, '12-15', 60), e(EX.tricepPushdown, 3, '10-12', 60)] },
      { title: 'Pull A', exercises: [e(EX.deadlift, 3, '5', 150), e(EX.latPulldown, 4, '8-10', 90), e(EX.cableRow, 3, '10-12', 90), e(EX.rearDeltRow, 4, '15-20', 60), e(EX.barbellCurl, 3, '10-12', 60)] },
      { title: 'Legs A', exercises: [e(EX.squat, 4, '6-8', 120), e(EX.romanianDeadlift, 3, '8-10', 90), e(EX.legPress, 3, '10-12', 90), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
      { title: 'Push B', exercises: [e(EX.inclineBenchPress, 4, '6-8', 120), e(EX.dbShoulderPress, 3, '10-12', 90), e(EX.dbFly, 3, '12-15', 75), e(EX.dbLateralRaise, 4, '12-15', 60), e(EX.dbTricepExt, 3, '10-12', 60)] },
      { title: 'Pull B', exercises: [e(EX.barbellRow, 4, '6-8', 120), e(EX.pullup, 4, '6-10', 90), e(EX.cableRow, 3, '10-12', 90), e(EX.rearDeltRow, 3, '15-20', 60), e(EX.dbHammerCurl, 3, '10-12', 60)] },
      { title: 'Legs B', exercises: [e(EX.squat, 4, '8-10', 120), e(EX.romanianDeadlift, 4, '8-10', 90), e(EX.legExtension, 3, '12-15', 60), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
    ],
  },
  {
    name: '4-Day Upper/Lower Split',
    description: 'Hits each muscle group twice weekly with 3 rest days — ideal for recovery and steady progression.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Upper A', exercises: [e(EX.dbInclineBench, 4, '8-10', 90), e(EX.barbellRow, 4, '8-10', 90), e(EX.dbShoulderPress, 3, '10-12', 90), e(EX.pullup, 3, '6-10', 90), e(EX.dbHammerCurl, 3, '10-12', 60), e(EX.dbTricepExt, 3, '10-12', 60)] },
      { title: 'Lower A', exercises: [e(EX.squat, 4, '6-8', 120), e(EX.romanianDeadlift, 4, '8-10', 90), e(EX.dbLunge, 3, '12', 60), e(EX.calfRaiseMachine, 4, '12-15', 60), e(EX.crunch, 3, '15-20', 60)] },
      { title: 'Upper B', exercises: [e(EX.benchPress, 4, '8-12', 90), e(EX.latPulldown, 4, '8-10', 90), e(EX.overheadPress, 3, '8-12', 90), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.tricepPushdown, 3, '12-15', 60)] },
      { title: 'Lower B', exercises: [e(EX.deadlift, 4, '5', 150), e(EX.legPress, 4, '10-12', 90), e(EX.legExtension, 3, '12-15', 60), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
    ],
  },
  {
    name: '3-Day Classic Full Body',
    description: 'Beginner-friendly full-body plan built on heavy compound movements to master the core lifts.',
    level: ProgramLevel.BEGINNER,
    location: 'gym',
    days: [
      { title: 'Full Body A', exercises: [e(EX.squat, 3, '8-10', 90), e(EX.benchPress, 3, '8-10', 90), e(EX.latPulldown, 3, '10-12', 90), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.frontPlank, 3, '60s', 60)] },
      { title: 'Full Body B', exercises: [e(EX.romanianDeadlift, 3, '8-10', 90), e(EX.dbInclineBench, 3, '10-12', 90), e(EX.barbellRow, 3, '8-10', 90), e(EX.dbHammerCurl, 3, '10-12', 60), e(EX.frontPlank, 3, '60s', 60)] },
      { title: 'Full Body C', exercises: [e(EX.squat, 3, '8-10', 90), e(EX.overheadPress, 3, '8-10', 90), e(EX.pullup, 3, '6-10', 90), e(EX.tricepPushdown, 3, '10-15', 60), e(EX.crunch, 3, '15-20', 60)] },
    ],
  },
  {
    name: '6-Day Arnold Split',
    description: 'Pairs opposing muscle groups (Chest/Back, Shoulders/Arms, Legs) for intense pumps and high volume.',
    level: ProgramLevel.ADVANCED,
    location: 'gym',
    days: [
      { title: 'Chest & Back A', exercises: [e(EX.benchPress, 4, '8', 90), e(EX.dbInclineBench, 4, '10', 90), e(EX.pullup, 4, '8-10', 90), e(EX.tBarRow, 4, '10', 90), e(EX.dbPullover, 3, '12', 60)] },
      { title: 'Shoulders & Arms A', exercises: [e(EX.overheadPress, 4, '8-10', 90), e(EX.dbLateralRaise, 4, '12-15', 60), e(EX.barbellCurl, 4, '8-10', 75), e(EX.tricepPushdown, 4, '10-12', 60), e(EX.dbHammerCurl, 3, '10-12', 60)] },
      { title: 'Legs A', exercises: [e(EX.squat, 4, '8-10', 120), e(EX.romanianDeadlift, 4, '8-10', 90), e(EX.legPress, 3, '12', 90), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
      { title: 'Chest & Back B', exercises: [e(EX.inclineBenchPress, 4, '8-10', 90), e(EX.dbFly, 3, '12-15', 75), e(EX.cableRow, 4, '8-10', 90), e(EX.latPulldown, 4, '10-12', 90), e(EX.dbPullover, 3, '12', 60)] },
      { title: 'Shoulders & Arms B', exercises: [e(EX.dbArnoldPress, 4, '10-12', 90), e(EX.rearDeltRow, 3, '15-20', 60), e(EX.preacherCurl, 4, '8-10', 75), e(EX.dbTricepExt, 3, '10-12', 60), e(EX.dbCrossBodyHammerCurl, 3, '10-12', 60)] },
      { title: 'Legs B', exercises: [e(EX.frontSquat, 4, '6-8', 120), e(EX.deadlift, 3, '5', 150), e(EX.legExtension, 3, '12-15', 60), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
    ],
  },
  {
    name: "5-Day 'Bro' Split",
    description: 'Dedicates an entire session to one muscle group for extreme volume and isolation.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Chest Day', exercises: [e(EX.benchPress, 4, '8-12', 90), e(EX.inclineBenchPress, 3, '8-12', 90), e(EX.dbDeclineBench, 3, '10-12', 90), e(EX.dbFly, 4, '12-15', 60), e(EX.pushup, 3, '15-20', 60)] },
      { title: 'Back Day', exercises: [e(EX.deadlift, 4, '5', 150), e(EX.barbellRow, 4, '8-12', 90), e(EX.latPulldown, 4, '10-12', 90), e(EX.cableRow, 3, '10-12', 90), e(EX.tBarRow, 3, '10-12', 90)] },
      { title: 'Shoulders Day', exercises: [e(EX.overheadPress, 4, '8-10', 90), e(EX.dbArnoldPress, 3, '10-12', 90), e(EX.dbLateralRaise, 4, '12-15', 60), e(EX.rearDeltRow, 4, '15-20', 60)] },
      { title: 'Legs Day', exercises: [e(EX.squat, 4, '8-12', 120), e(EX.romanianDeadlift, 4, '8-12', 90), e(EX.legPress, 3, '10-15', 90), e(EX.legExtension, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
      { title: 'Arms Day', exercises: [e(EX.closeGripBench, 4, '6-8', 90), e(EX.preacherCurl, 4, '8-10', 90), e(EX.dbTricepExt, 3, '10-12', 60), e(EX.dbHammerCurl, 3, '10-12', 60), e(EX.tricepPushdown, 3, '12-15', 60)] },
    ],
  },
  {
    name: 'PHUL — Power Hypertrophy Upper Lower',
    description: 'Combines powerlifting (low reps) with bodybuilding (high reps) across 4 days.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Upper Power', exercises: [e(EX.benchPress, 4, '3-5', 180), e(EX.barbellRow, 4, '3-5', 180), e(EX.overheadPress, 3, '5-8', 120), e(EX.latPulldown, 3, '6-8', 90), e(EX.barbellCurl, 3, '6-8', 90)] },
      { title: 'Lower Power', exercises: [e(EX.squat, 4, '3-5', 180), e(EX.deadlift, 3, '3-5', 180), e(EX.legPress, 3, '6-10', 90), e(EX.legCurl, 3, '6-10', 90)] },
      { title: 'Upper Hypertrophy', exercises: [e(EX.dbInclineBench, 4, '10-12', 90), e(EX.cableRow, 4, '10-12', 90), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.dbHammerCurl, 3, '10-12', 60), e(EX.tricepPushdown, 3, '10-12', 60)] },
      { title: 'Lower Hypertrophy', exercises: [e(EX.frontSquat, 4, '10-12', 90), e(EX.romanianDeadlift, 4, '10-12', 90), e(EX.legExtension, 3, '12-15', 60), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 4, '15-20', 60)] },
    ],
  },
  {
    name: '4-Day Push/Pull',
    description: 'Splits by movement mechanics; lower-body work folds into push and pull days.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Push A', exercises: [e(EX.squat, 4, '6-8', 120), e(EX.benchPress, 4, '8-10', 90), e(EX.dbFly, 3, '10-12', 90), e(EX.legExtension, 3, '12-15', 60), e(EX.dbTricepExt, 3, '10-12', 60)] },
      { title: 'Pull A', exercises: [e(EX.deadlift, 4, '5', 150), e(EX.barbellRow, 4, '8-10', 90), e(EX.legCurl, 3, '10-12', 75), e(EX.latPulldown, 3, '10-12', 90), e(EX.barbellCurl, 3, '10-15', 60)] },
      { title: 'Push B', exercises: [e(EX.legPress, 4, '10-12', 90), e(EX.overheadPress, 4, '8-10', 90), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.dbFly, 3, '12-15', 60), e(EX.tricepPushdown, 3, '12-15', 60)] },
      { title: 'Pull B', exercises: [e(EX.pullup, 4, '6-10', 90), e(EX.romanianDeadlift, 4, '8-10', 90), e(EX.rearDeltRow, 3, '15-20', 60), e(EX.cableRow, 3, '10-12', 90), e(EX.dbHammerCurl, 3, '10-12', 60)] },
    ],
  },
  {
    name: 'Fat Loss Conditioning',
    description: 'High-intensity metabolic split designed to maximize fat loss while retaining lean muscle.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'gym',
    days: [
      { title: 'Upper Body Burn', exercises: [e(EX.pullup, 4, '10-12', 60), e(EX.benchPress, 4, '12-15', 60), e(EX.dbLateralRaise, 3, '15-20', 45), e(EX.barbellCurl, 3, '12-15', 45)] },
      { title: 'Lower Body Burn', exercises: [e(EX.squat, 4, '12-15', 75), e(EX.romanianDeadlift, 4, '12-15', 75), e(EX.legExtension, 3, '15-20', 45), e(EX.legCurl, 3, '15-20', 45)] },
      { title: 'Full Body Conditioning', exercises: [e(EX.overheadPress, 3, '12-15', 60), e(EX.barbellRow, 3, '12-15', 60), e(EX.benchPress, 3, '12-15', 60), e(EX.squat, 3, '12-15', 75), e(EX.burpee, 3, '10-15', 45)] },
    ],
  },
  {
    name: 'Advanced Strength & Power',
    description: 'Heavy resistance program focused on raw power output and dense, functional muscle.',
    level: ProgramLevel.ADVANCED,
    location: 'gym',
    days: [
      { title: 'Push Power', exercises: [e(EX.benchPress, 5, '5', 120), e(EX.overheadPress, 5, '5', 120), e(EX.dbInclineBench, 4, '6-8', 90), e(EX.tricepPushdown, 4, '8-10', 75)] },
      { title: 'Pull & Legs Power', exercises: [e(EX.squat, 5, '5', 150), e(EX.romanianDeadlift, 5, '5', 150), e(EX.pullup, 4, '6-8', 90), e(EX.barbellRow, 4, '6-8', 90)] },
      { title: 'Upper Hypertrophy', exercises: [e(EX.benchPress, 4, '10-12', 90), e(EX.barbellRow, 4, '10-12', 90), e(EX.overheadPress, 3, '10-12', 90), e(EX.barbellCurl, 3, '12-15', 60), e(EX.tricepPushdown, 3, '12-15', 60)] },
      { title: 'Lower Hypertrophy', exercises: [e(EX.squat, 4, '10-12', 100), e(EX.romanianDeadlift, 4, '10-12', 100), e(EX.legExtension, 3, '12-15', 60), e(EX.legCurl, 3, '12-15', 60), e(EX.calfRaiseMachine, 3, '15-20', 60)] },
    ],
  },
  {
    name: '5/3/1 Strength Foundation',
    description: 'Wave-loading progression on the four core barbell lifts with hypertrophy accessory work.',
    level: ProgramLevel.ADVANCED,
    location: 'gym',
    days: [
      { title: 'Overhead Press Day', exercises: [e(EX.overheadPress, 3, '5/5/5+', 180), e(EX.dbShoulderPress, 5, '10', 90), e(EX.dbLateralRaise, 3, '15-20', 60), e(EX.rearDeltRow, 3, '15-20', 60)] },
      { title: 'Deadlift Day', exercises: [e(EX.deadlift, 3, '5/5/5+', 240), e(EX.romanianDeadlift, 5, '10', 120), e(EX.pullup, 3, '6-10', 90), e(EX.crunch, 3, '15', 60)] },
      { title: 'Bench Press Day', exercises: [e(EX.benchPress, 3, '5/5/5+', 180), e(EX.dbInclineBench, 5, '10', 90), e(EX.dbRow, 3, '10-12', 75), e(EX.tricepPushdown, 3, '10-15', 60)] },
      { title: 'Squat Day', exercises: [e(EX.squat, 3, '5/5/5+', 180), e(EX.legPress, 5, '10', 120), e(EX.legCurl, 3, '10-15', 60), e(EX.calfRaiseMachine, 3, '15-20', 60)] },
    ],
  },
];

// ─── HOME PROGRAMS ──────────────────────────────────────────────────────────
export const HOME_PROGRAMS: ProgramDef[] = [
  {
    name: 'Beginner Bodyweight Full Body',
    description: 'Zero equipment. Three full-body sessions to build strength, endurance, and control.',
    level: ProgramLevel.BEGINNER,
    location: 'home',
    days: [
      { title: 'Full Body A', exercises: [e(EX.pushup, 3, '8-12', 60), e(EX.invertedRow, 3, '8-10', 60), e(EX.forwardLunge, 3, '10-12', 60), e(EX.crunch, 3, '15-20', 45)] },
      { title: 'Full Body B', exercises: [e(EX.benchDip, 3, '10-15', 60), e(EX.chinup, 3, '5-8', 75), e(EX.gluteBridge, 3, '15-20', 45), e(EX.mountainClimber, 3, '20-30', 45)] },
      { title: 'Full Body C', exercises: [e(EX.pushup, 3, '10-15', 60), e(EX.forwardLunge, 3, '12-15', 60), e(EX.bwCalfRaise, 3, '20-25', 45), e(EX.crunch, 3, '15-20', 45)] },
    ],
  },
  {
    name: 'Bodyweight Upper/Lower Split',
    description: 'Intermediate 4-day split alternating upper and lower body focus — no equipment needed.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'home',
    days: [
      { title: 'Upper A', exercises: [e(EX.pushup, 4, '12-15', 60), e(EX.pullup, 4, '6-10', 75), e(EX.closeGripPushup, 3, '10-12', 60), e(EX.chinup, 3, '6-8', 75), e(EX.crunch, 3, '20-25', 45)] },
      { title: 'Lower A', exercises: [e(EX.forwardLunge, 4, '12-15', 60), e(EX.gluteBridge, 4, '15-20', 45), e(EX.jumpSquat, 3, '10-15', 60), e(EX.bwCalfRaise, 3, '20-30', 45)] },
      { title: 'Upper B', exercises: [e(EX.invertedRow, 4, '10-12', 60), e(EX.pushup, 4, '15-20', 60), e(EX.benchDip, 3, '12-15', 60), e(EX.mountainClimber, 3, '20-30', 45)] },
      { title: 'Lower B', exercises: [e(EX.burpee, 3, '10-12', 75), e(EX.forwardLunge, 4, '12-15', 60), e(EX.gluteBridge, 4, '20-25', 45), e(EX.bwCalfRaise, 3, '25-30', 45)] },
    ],
  },
  {
    name: 'Dumbbell Full Body Starter',
    description: 'Three full-body sessions using only dumbbells — ideal for a home gym with adjustables.',
    level: ProgramLevel.BEGINNER,
    location: 'home',
    days: [
      { title: 'Full Body A', exercises: [e(EX.dbBench, 3, '10-12', 75), e(EX.dbRow, 3, '10-12', 75), e(EX.dbGobletSquat, 3, '12-15', 75), e(EX.dbShoulderPress, 3, '10-12', 60)] },
      { title: 'Full Body B', exercises: [e(EX.dbRomanianDeadlift, 3, '10-12', 75), e(EX.dbFly, 3, '12-15', 60), e(EX.dbLunge, 3, '10-12', 60), e(EX.dbLateralRaise, 3, '12-15', 45)] },
      { title: 'Full Body C', exercises: [e(EX.dbGobletSquat, 3, '12-15', 75), e(EX.dbRow, 3, '10-12', 75), e(EX.dbHammerCurl, 3, '12-15', 45), e(EX.dbTricepExt, 3, '12-15', 45)] },
    ],
  },
  {
    name: 'Dumbbell Upper/Lower Split',
    description: '4-day dumbbell-only split — a balanced intermediate home hypertrophy program.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'home',
    days: [
      { title: 'Upper A', exercises: [e(EX.dbBench, 4, '8-12', 90), e(EX.dbRow, 4, '8-12', 90), e(EX.dbShoulderPress, 3, '10-12', 75), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.dbHammerCurl, 3, '12-15', 45)] },
      { title: 'Lower A', exercises: [e(EX.dbGobletSquat, 4, '10-12', 90), e(EX.dbRomanianDeadlift, 4, '10-12', 90), e(EX.dbLunge, 3, '10-12', 60), e(EX.dbStepUp, 3, '10-12', 60)] },
      { title: 'Upper B', exercises: [e(EX.dbFly, 4, '10-12', 75), e(EX.dbDeadlift, 4, '8-12', 90), e(EX.dbArnoldPress, 3, '10-12', 75), e(EX.dbTricepExt, 3, '12-15', 60)] },
      { title: 'Lower B', exercises: [e(EX.dbRomanianDeadlift, 4, '10-12', 90), e(EX.dbGobletSquat, 4, '12-15', 75), e(EX.gluteBridge, 4, '15-20', 45), e(EX.dbCalfRaise, 3, '20-25', 45)] },
    ],
  },
  {
    name: 'Bodyweight Push/Pull/Legs',
    description: '5-day calisthenics PPL split to build a lean, athletic physique — no equipment.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'home',
    days: [
      { title: 'Push Day', exercises: [e(EX.pushup, 4, '15-20', 60), e(EX.closeGripPushup, 3, '12-15', 60), e(EX.benchDip, 3, '12-15', 60)] },
      { title: 'Pull Day', exercises: [e(EX.pullup, 4, '6-10', 90), e(EX.chinup, 3, '6-10', 90), e(EX.invertedRow, 3, '10-15', 60)] },
      { title: 'Legs Day', exercises: [e(EX.jumpSquat, 4, '12-15', 75), e(EX.forwardLunge, 4, '12-15', 60), e(EX.gluteBridge, 3, '20-25', 45), e(EX.bwCalfRaise, 3, '25-30', 45)] },
      { title: 'Push Day B', exercises: [e(EX.pushup, 5, '15-25', 60), e(EX.benchDip, 4, '15-20', 60), e(EX.mountainClimber, 3, '20-30', 45)] },
      { title: 'Pull Day B', exercises: [e(EX.pullup, 4, '8-12', 90), e(EX.invertedRow, 4, '12-15', 60), e(EX.crunch, 3, '20-25', 45)] },
    ],
  },
  {
    name: 'Home Fat Burn Circuit',
    description: 'High-rep bodyweight circuits to elevate heart rate, torch calories, and build endurance.',
    level: ProgramLevel.BEGINNER,
    location: 'home',
    days: [
      { title: 'Cardio & Core', exercises: [e(EX.burpee, 4, '10-15', 45), e(EX.mountainClimber, 4, '20-30', 30), e(EX.crunch, 3, '20-25', 30), e(EX.jumpSquat, 3, '15-20', 45)] },
      { title: 'Upper Circuit', exercises: [e(EX.pushup, 4, '15-20', 45), e(EX.closeGripPushup, 3, '12-15', 45), e(EX.burpee, 3, '10-12', 60), e(EX.mountainClimber, 3, '25-30', 30)] },
      { title: 'Lower Circuit', exercises: [e(EX.jumpSquat, 4, '15-20', 45), e(EX.forwardLunge, 4, '15-20', 45), e(EX.gluteBridge, 3, '20-25', 30), e(EX.bwCalfRaise, 3, '25-30', 30)] },
    ],
  },
  {
    name: 'Core & Strength Foundation',
    description: '4-day bodyweight program pairing core work with compound pushing and pulling.',
    level: ProgramLevel.BEGINNER,
    location: 'home',
    days: [
      { title: 'Push & Core', exercises: [e(EX.pushup, 3, '10-15', 60), e(EX.benchDip, 3, '10-12', 60), e(EX.crunch, 3, '20-25', 45), e(EX.mountainClimber, 3, '20-25', 45)] },
      { title: 'Pull & Core', exercises: [e(EX.chinup, 3, '5-8', 75), e(EX.invertedRow, 3, '8-12', 60), e(EX.russianTwist, 3, '20-30', 45)] },
      { title: 'Legs & Core', exercises: [e(EX.forwardLunge, 3, '12-15', 60), e(EX.gluteBridge, 3, '15-20', 45), e(EX.jumpSquat, 3, '10-15', 60), e(EX.flutterKick, 3, '20-30', 45)] },
      { title: 'Full Body Core', exercises: [e(EX.burpee, 3, '10-12', 60), e(EX.pushup, 3, '12-15', 45), e(EX.crunch, 3, '20-25', 45), e(EX.forwardLunge, 3, '12-15', 45)] },
    ],
  },
  {
    name: 'Dumbbell PPL',
    description: '6-day dumbbell-only Push/Pull/Legs program for the dedicated home lifter.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'home',
    days: [
      { title: 'Push A', exercises: [e(EX.dbBench, 4, '8-12', 90), e(EX.dbShoulderPress, 3, '10-12', 75), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.dbTricepExt, 3, '12-15', 60)] },
      { title: 'Pull A', exercises: [e(EX.dbRow, 4, '8-12', 90), e(EX.dbDeadlift, 3, '8-12', 90), e(EX.dbHammerCurl, 3, '12-15', 60)] },
      { title: 'Legs A', exercises: [e(EX.dbGobletSquat, 4, '10-12', 90), e(EX.dbRomanianDeadlift, 4, '10-12', 90), e(EX.dbLunge, 3, '10-12', 60)] },
      { title: 'Push B', exercises: [e(EX.dbFly, 4, '10-12', 75), e(EX.dbArnoldPress, 3, '10-12', 75), e(EX.closeGripPushup, 3, '12-15', 60), e(EX.dbLateralRaise, 3, '15-20', 45)] },
      { title: 'Pull B', exercises: [e(EX.dbRow, 4, '10-12', 90), e(EX.dbShrug, 3, '12-15', 60), e(EX.chinup, 3, '6-10', 90)] },
      { title: 'Legs B', exercises: [e(EX.dbStepUp, 4, '10-12', 75), e(EX.dbRomanianDeadlift, 4, '10-12', 90), e(EX.gluteBridge, 3, '20-25', 45), e(EX.dbCalfRaise, 3, '25-30', 45)] },
    ],
  },
  {
    name: 'Advanced Calisthenics',
    description: 'High-volume bodyweight training for advanced athletes — raw pulling and pushing strength.',
    level: ProgramLevel.ADVANCED,
    location: 'home',
    days: [
      { title: 'Push Strength', exercises: [e(EX.pushup, 5, '20-30', 60), e(EX.closeGripPushup, 4, '15-20', 60), e(EX.benchDip, 4, '20-25', 60), e(EX.mountainClimber, 3, '30-40', 45)] },
      { title: 'Pull Strength', exercises: [e(EX.pullup, 5, '10-15', 90), e(EX.chinup, 4, '10-12', 90), e(EX.invertedRow, 4, '15-20', 60)] },
      { title: 'Legs & Explosive', exercises: [e(EX.jumpSquat, 5, '15-20', 75), e(EX.burpee, 4, '15-20', 60), e(EX.forwardLunge, 4, '15-20', 60), e(EX.gluteBridge, 4, '25-30', 45)] },
      { title: 'Full Body Volume', exercises: [e(EX.pullup, 4, '12-15', 90), e(EX.pushup, 4, '20-25', 60), e(EX.jumpSquat, 4, '15-20', 75), e(EX.burpee, 3, '15-20', 60), e(EX.crunch, 3, '25-30', 45)] },
    ],
  },
  {
    name: 'Full Home Hybrid (BW + Dumbbells)',
    description: '5-day hybrid combining bodyweight and dumbbell work across strength, hypertrophy and conditioning.',
    level: ProgramLevel.INTERMEDIATE,
    location: 'home',
    days: [
      { title: 'Push & Chest', exercises: [e(EX.dbBench, 4, '10-12', 90), e(EX.pushup, 3, '15-20', 60), e(EX.dbFly, 3, '12-15', 60), e(EX.closeGripPushup, 3, '12-15', 60)] },
      { title: 'Pull & Back', exercises: [e(EX.pullup, 4, '6-10', 90), e(EX.dbRow, 4, '10-12', 90), e(EX.invertedRow, 3, '10-15', 60), e(EX.dbHammerCurl, 3, '12-15', 45)] },
      { title: 'Legs & Glutes', exercises: [e(EX.dbGobletSquat, 4, '10-12', 90), e(EX.dbRomanianDeadlift, 4, '10-12', 90), e(EX.dbLunge, 3, '12-15', 60), e(EX.gluteBridge, 3, '20-25', 45), e(EX.bwCalfRaise, 3, '20-25', 45)] },
      { title: 'Shoulders & Arms', exercises: [e(EX.dbShoulderPress, 4, '10-12', 75), e(EX.dbArnoldPress, 3, '10-12', 75), e(EX.dbLateralRaise, 3, '12-15', 60), e(EX.dbHammerCurl, 3, '12-15', 45), e(EX.dbKickback, 3, '12-15', 45)] },
      { title: 'Full Body Conditioning', exercises: [e(EX.burpee, 3, '12-15', 60), e(EX.dbGobletSquat, 3, '12-15', 60), e(EX.pushup, 3, '15-20', 45), e(EX.mountainClimber, 3, '25-30', 45), e(EX.crunch, 3, '20-25', 45)] },
    ],
  },
];

export const ALL_PROGRAMS: ProgramDef[] = [...GYM_PROGRAMS, ...HOME_PROGRAMS];
