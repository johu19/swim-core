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
import {
  getDistancePoolLengthValidationMessage,
  getPlaceSourceTypeValidationMessage,
  getSplitCountValidationMessage,
  getSplitTotalValidationMessage,
  getStrokeDistanceValidationMessage,
  hasValidSplitCount,
  hasValidSplitTotal,
  isPlaceAllowedForSourceType,
  isDistanceAllowedForPoolLength,
  isDistanceAllowedForStroke,
} from '../validations/performance-fields.js';

function assertValidPerformanceConstraints(
  stroke: PerformanceRecord['stroke'],
  distance: PerformanceRecord['distance'],
  poolLength: PerformanceRecord['poolLength'],
  timeMs: PerformanceRecord['timeMs'],
  place: PerformanceRecord['place'],
  splits: PerformanceRecord['splits'],
  sourceType: PerformanceRecord['sourceType'],
) {
  if (!isDistanceAllowedForStroke(stroke, distance)) {
    throw new AppError(
      ErrorName.PayloadValidation,
      getStrokeDistanceValidationMessage(stroke, distance),
      400,
    );
  }

  if (!isDistanceAllowedForPoolLength(distance, poolLength)) {
    throw new AppError(
      ErrorName.PayloadValidation,
      getDistancePoolLengthValidationMessage(distance, poolLength),
      400,
    );
  }

  if (splits !== undefined && !hasValidSplitCount(splits, distance, poolLength)) {
    throw new AppError(
      ErrorName.PayloadValidation,
      getSplitCountValidationMessage(distance, poolLength),
      400,
    );
  }

  if (splits !== undefined && !hasValidSplitTotal(splits, timeMs)) {
    throw new AppError(
      ErrorName.PayloadValidation,
      getSplitTotalValidationMessage(timeMs),
      400,
    );
  }

  if (!isPlaceAllowedForSourceType(sourceType, place)) {
    throw new AppError(
      ErrorName.PayloadValidation,
      getPlaceSourceTypeValidationMessage(sourceType),
      400,
    );
  }
}

export async function createPerformance(input: CreatePerformanceInput) {
  assertValidPerformanceConstraints(
    input.stroke,
    input.distance,
    input.poolLength,
    input.timeMs,
    input.place,
    input.splits,
    input.sourceType,
  );

  const now = new Date().toISOString();
  const performance: PerformanceRecord = {
    performanceId: randomUUID(),
    profileId: input.cognitoId,
    stroke: input.stroke,
    distance: input.distance,
    poolLength: input.poolLength,
    poolLengthUnit: input.poolLengthUnit,
    timeMs: input.timeMs,
    place: input.place,
    splits: input.splits,
    performedAt: input.performedAt,
    sourceType: input.sourceType,
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

  assertValidPerformanceConstraints(
    updatedPerformance.stroke,
    updatedPerformance.distance,
    updatedPerformance.poolLength,
    updatedPerformance.timeMs,
    updatedPerformance.place,
    updatedPerformance.splits,
    updatedPerformance.sourceType,
  );

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
