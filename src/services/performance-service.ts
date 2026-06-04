import { randomUUID } from 'node:crypto';
import { AppError, ErrorName } from '../lib/error-handler.js';
import {
  deletePerformanceById,
  getPerformanceById,
  getPerformancesByProfileId,
  PerformanceRecord,
  writePerformance,
} from '../repositories/performance-repository.js';
import { CreatePerformanceInput } from '../validations/create-performance.js';
import { PatchPerformanceInput } from '../validations/patch-performance.js';

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

  return await writePerformance(performance);
}

export async function getPerformances(profileId: string) {
  return await getPerformancesByProfileId(profileId);
}

export async function updatePerformance(input: PatchPerformanceInput) {
  const existingPerformance = await getPerformanceById(
    input.cognitoId,
    input.performanceId,
  );

  if (!existingPerformance) {
    throw new AppError(
      ErrorName.PerformanceNotFound,
      `Performance "${input.performanceId}" was not found.`,
      404,
    );
  }

  const {
    cognitoId: _cognitoId,
    performanceId: _performanceId,
    ...performanceUpdates
  } = input;
  const updatedPerformance: PerformanceRecord = {
    ...existingPerformance,
    ...performanceUpdates,
    performanceId: existingPerformance.performanceId,
    profileId: existingPerformance.profileId,
    createdAt: existingPerformance.createdAt,
    updatedAt: new Date().toISOString(),
  };

  return await writePerformance(updatedPerformance);
}

export async function deletePerformance(
  profileId: string,
  performanceId: string,
) {
  const existingPerformance = await getPerformanceById(profileId, performanceId);

  if (!existingPerformance) {
    throw new AppError(
      ErrorName.PerformanceNotFound,
      `Performance "${performanceId}" was not found.`,
      404,
    );
  }

  await deletePerformanceById(profileId, performanceId);
}
