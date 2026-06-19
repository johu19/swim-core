import { z } from 'zod';

export const performanceStrokeValues = [
  'butterfly',
  'backstroke',
  'breaststroke',
  'freestyle',
  'medley',
] as const;

export type PerformanceStroke = (typeof performanceStrokeValues)[number];

export const performanceDistanceValues = [
  25,
  50,
  100,
  200,
  400,
  800,
  1500,
] as const;

export type PerformanceDistance = (typeof performanceDistanceValues)[number];
export type PerformancePoolLength = 25 | 50;
export type PerformanceSplit = number;
export type PerformanceSourceType = 'competition' | 'training';

export const performanceStrokeSchema = z.enum(performanceStrokeValues);
export const performanceDistanceSchema = z.union([
  z.literal(25),
  z.literal(50),
  z.literal(100),
  z.literal(200),
  z.literal(400),
  z.literal(800),
  z.literal(1500),
]);
export const performanceSplitsSchema = z.array(z.number().int().positive());
export const performanceSourceTypeSchema = z.enum(['competition', 'training']);
export const performancePlaceSchema = z.number().int().min(1);

const allowedDistancesByStroke: Record<
  PerformanceStroke,
  readonly PerformanceDistance[]
> = {
  butterfly: [25, 50, 100, 200],
  backstroke: [25, 50, 100, 200],
  breaststroke: [25, 50, 100, 200],
  medley: [100, 200, 400],
  freestyle: performanceDistanceValues,
};

export function getAllowedDistancesForStroke(stroke: PerformanceStroke) {
  return allowedDistancesByStroke[stroke];
}

export function isDistanceAllowedForStroke(
  stroke: PerformanceStroke,
  distance: PerformanceDistance,
) {
  return getAllowedDistancesForStroke(stroke).includes(distance);
}

export function getStrokeDistanceValidationMessage(
  stroke: PerformanceStroke,
  distance: PerformanceDistance,
) {
  return `distance ${distance} is not allowed for stroke "${stroke}". Allowed distances: ${getAllowedDistancesForStroke(
    stroke,
  ).join(', ')}.`;
}

export function isDistanceAllowedForPoolLength(
  distance: PerformanceDistance,
  poolLength: PerformancePoolLength,
) {
  return distance !== 25 || poolLength === 25;
}

export function getDistancePoolLengthValidationMessage(
  distance: PerformanceDistance,
  poolLength: PerformancePoolLength,
) {
  return `distance ${distance} is not allowed for poolLength ${poolLength}. Distance 25 is only allowed when poolLength is 25.`;
}

export function getExpectedSplitCount(
  distance: PerformanceDistance,
  poolLength: PerformancePoolLength,
) {
  return distance / poolLength;
}

export function hasValidSplitCount(
  splits: readonly PerformanceSplit[],
  distance: PerformanceDistance,
  poolLength: PerformancePoolLength,
) {
  return splits.length === getExpectedSplitCount(distance, poolLength);
}

export function getSplitCountValidationMessage(
  distance: PerformanceDistance,
  poolLength: PerformancePoolLength,
) {
  return `splits must contain exactly ${getExpectedSplitCount(
    distance,
    poolLength,
  )} entries for distance ${distance} and poolLength ${poolLength}.`;
}

export function hasValidSplitTotal(
  splits: readonly PerformanceSplit[],
  timeMs: number,
) {
  return splits.reduce((sum, split) => sum + split, 0) === timeMs;
}

export function getSplitTotalValidationMessage(timeMs: number) {
  return `splits must sum exactly to timeMs ${timeMs}.`;
}

export function hasValidSplitValues(splits: readonly PerformanceSplit[]) {
  return splits.every((split) => Number.isInteger(split) && split > 0);
}

export function getSplitValueValidationMessage() {
  return 'splits must contain only positive integer millisecond values.';
}

export function isPlaceAllowedForSourceType(
  sourceType: PerformanceSourceType,
  place: number | undefined,
) {
  return sourceType === 'competition' || place === undefined;
}

export function getPlaceSourceTypeValidationMessage(
  sourceType: PerformanceSourceType,
) {
  return `place is not allowed when sourceType is "${sourceType}".`;
}
