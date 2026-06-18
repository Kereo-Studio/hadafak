/**
 * Fitness-specific icons using @tabler/icons-react-native.
 * SVG-based — uses react-native-svg, no native font loading, no rebuild required.
 * Each export matches the Lucide API: size, color, style props.
 */
import React from 'react';
import {
  IconDumbbell,
  IconBarbell,
  IconRun,
  IconWalk,
  IconBike,
  IconSwimming,
  IconMountain,
  IconKayak,
  IconYoga,
  IconHeartbeat,
  IconHeart,
  IconHeartFilled,
  IconFlame,
  IconBolt,
  IconScaleOutline,
  IconDroplet,
  IconCup,
  IconRuler,
  IconTarget,
  IconCompass,
  IconApple,
  IconToolsKitchen2,
  IconTrophy,
  IconMedal,
  IconChartLine,
  IconHourglass,
  IconSparkles,
  IconShoe,
  IconRepeat,
} from '@tabler/icons-react-native';

interface IconProps {
  size?: number;
  color?: string;
  style?: object;
  strokeWidth?: number;
}

const wrap =
  (Icon: React.ComponentType<any>) =>
  ({ size = 24, color = '#000', style, strokeWidth = 1.8 }: IconProps) =>
    <Icon size={size} color={color} style={style} strokeWidth={strokeWidth} />;

// ── Gym equipment ─────────────────────────────────────────────────────────────
export const DumbbellIcon     = wrap(IconDumbbell);
export const BarbellIcon      = wrap(IconBarbell);
export const WeightLifterIcon = wrap(IconBarbell);
export const MuscleIcon       = wrap(IconBarbell);

// ── Cardio activities ─────────────────────────────────────────────────────────
export const RunIcon        = wrap(IconRun);
export const RunFastIcon    = wrap(IconRun);
export const WalkIcon       = wrap(IconWalk);
export const BikeIcon       = wrap(IconBike);
export const SwimIcon       = wrap(IconSwimming);
export const HikingIcon     = wrap(IconMountain);
export const RowingIcon     = wrap(IconKayak);
export const JumpRopeIcon   = wrap(IconRepeat);
export const EllipticalIcon = wrap(IconRun);
export const TreadmillIcon  = wrap(IconRun);
export const YogaIcon       = wrap(IconYoga);

// ── Health & metrics ──────────────────────────────────────────────────────────
export const HeartPulseIcon   = wrap(IconHeartbeat);
export const HeartIcon        = wrap(IconHeartFilled);
export const HeartOutlineIcon = wrap(IconHeart);
export const FireIcon         = wrap(IconFlame);
export const LightningIcon    = wrap(IconBolt);
export const ScaleIcon        = wrap(IconScaleOutline);
export const WaterIcon        = wrap(IconDroplet);
export const RulerIcon        = wrap(IconRuler);
export const TargetIcon       = wrap(IconTarget);
export const CompassIcon      = wrap(IconCompass);

// ── Nutrition ─────────────────────────────────────────────────────────────────
export const FoodAppleIcon  = wrap(IconApple);
export const CupWaterIcon   = wrap(IconCup);
export const SilverwareIcon = wrap(IconToolsKitchen2);
export const NutritionIcon  = wrap(IconApple);

// ── Progress & achievements ───────────────────────────────────────────────────
export const TrophyIcon    = wrap(IconTrophy);
export const MedalIcon     = wrap(IconMedal);
export const ChartLineIcon = wrap(IconChartLine);

// ── Workout UI ────────────────────────────────────────────────────────────────
export const TimerIcon     = wrap(IconHourglass);
export const TimerSandIcon = wrap(IconHourglass);
export const CreationIcon  = wrap(IconSparkles);
export const ShoeIcon      = wrap(IconShoe);
