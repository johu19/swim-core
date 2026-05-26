import { randomUUID } from 'node:crypto';
import {
  getPerformancesByProfileId,
  insertPerformance,
  PerformanceRecord,
} from '../repositories/performance-repository.js';
import { CreatePerformanceInput } from '../validations/create-performance.js';

export async function createPerformance(input: CreatePerformanceInput) {
  const now = new Date().toISOString();
  const performance: PerformanceRecord = {
    performanceId: randomUUID(),
    profileId: input.cognitoId,
    stroke: input.stroke,
    distance: input.distance,
    poolLength: input.poolLength,
    poolLengthUnit: input.poolLengthUnit,
    timeMs: input.timeMs,
    performedAt: input.performedAt,
    sourceType: input.sourceType,
    effortLevel: input.effortLevel,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  return await insertPerformance(performance);
}

export async function getPerformances(profileId: string) {
  return await getPerformancesByProfileId(profileId);
}
