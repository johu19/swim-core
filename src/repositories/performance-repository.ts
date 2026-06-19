import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../lib/dynamo.js';
import { getConfig } from '../lib/env.js';
import {
  getDistancePoolLengthValidationMessage,
  getPlaceSourceTypeValidationMessage,
  getSplitCountValidationMessage,
  getSplitTotalValidationMessage,
  getSplitValueValidationMessage,
  getStrokeDistanceValidationMessage,
  hasValidSplitCount,
  hasValidSplitTotal,
  hasValidSplitValues,
  isPlaceAllowedForSourceType,
  isDistanceAllowedForPoolLength,
  isDistanceAllowedForStroke,
  PerformanceDistance,
  PerformanceSourceType,
  PerformancePoolLength,
  PerformanceSplit,
  PerformanceStroke,
} from '../validations/performance-fields.js';

type PerformanceItemAttribute = {
  S?: string;
  N?: string;
  L?: PerformanceItemAttribute[];
};

export type PerformanceRecord = {
  performanceId: string;
  profileId: string;
  stroke: PerformanceStroke;
  distance: PerformanceDistance;
  poolLength: PerformancePoolLength;
  poolLengthUnit: 'yards' | 'meters';
  timeMs: number;
  place?: number;
  splits?: PerformanceSplit[];
  performedAt: string;
  sourceType: PerformanceSourceType;
  createdAt: string;
  updatedAt: string;
};

function getPerformanceKeys(
  profileId: string,
  performanceId: string,
) {
  return {
    pk: `PROFILE#${profileId}`,
    sk: `PERFORMANCE#${performanceId}`,
  };
}

function mapItemToPerformanceRecord(
  item: Record<string, PerformanceItemAttribute> | undefined,
): PerformanceRecord | null {
  if (!item) {
    return null;
  }

  const performanceId = item.performanceId?.S;
  const profileId = item.profileId?.S;
  const stroke = item.stroke?.S;
  const distance = item.distance?.N;
  const poolLength = item.poolLength?.N;
  const poolLengthUnit = item.poolLengthUnit?.S;
  const timeMs = item.timeMs?.N;
  const place = item.place?.N;
  const splits = item.splits?.L;
  const performedAt = item.performedAt?.S;
  const sourceType = item.sourceType?.S;
  const createdAt = item.createdAt?.S;
  const updatedAt = item.updatedAt?.S;

  if (
    !performanceId ||
    !profileId ||
    !stroke ||
    !distance ||
    !poolLength ||
    !poolLengthUnit ||
    !timeMs ||
    !performedAt ||
    !sourceType ||
    !createdAt ||
    !updatedAt
  ) {
    throw new Error(
      'Performance item is missing one or more required attributes.',
    );
  }

  if (
    stroke !== 'butterfly' &&
    stroke !== 'backstroke' &&
    stroke !== 'breaststroke' &&
    stroke !== 'freestyle' &&
    stroke !== 'medley'
  ) {
    throw new Error(`Performance item has unsupported stroke value "${stroke}".`);
  }

  if (poolLengthUnit !== 'yards' && poolLengthUnit !== 'meters') {
    throw new Error(
      `Performance item has unsupported poolLengthUnit value "${poolLengthUnit}".`,
    );
  }

  if (sourceType !== 'competition' && sourceType !== 'training') {
    throw new Error(
      `Performance item has unsupported sourceType value "${sourceType}".`,
    );
  }

  const parsedDistance = Number(distance) as PerformanceDistance;
  const parsedPoolLength = Number(poolLength) as PerformancePoolLength;
  const parsedTimeMs = Number(timeMs);
  const parsedPlace = place !== undefined ? Number(place) : undefined;
  const parsedSplits = splits?.map((split) => {
    if (!split.N) {
      throw new Error('Performance item has invalid split value.');
    }

    return Number(split.N);
  });

  if (!isDistanceAllowedForStroke(stroke, parsedDistance)) {
    throw new Error(getStrokeDistanceValidationMessage(stroke, parsedDistance));
  }

  if (!isDistanceAllowedForPoolLength(parsedDistance, parsedPoolLength)) {
    throw new Error(
      getDistancePoolLengthValidationMessage(parsedDistance, parsedPoolLength),
    );
  }

  if (
    parsedPlace !== undefined &&
    (!Number.isInteger(parsedPlace) || parsedPlace < 1)
  ) {
    throw new Error('Performance item has invalid place value.');
  }

  if (!isPlaceAllowedForSourceType(sourceType, parsedPlace)) {
    throw new Error(getPlaceSourceTypeValidationMessage(sourceType));
  }

  if (
    parsedSplits !== undefined &&
    !hasValidSplitValues(parsedSplits)
  ) {
    throw new Error(getSplitValueValidationMessage());
  }

  if (
    parsedSplits !== undefined &&
    !hasValidSplitCount(parsedSplits, parsedDistance, parsedPoolLength)
  ) {
    throw new Error(
      getSplitCountValidationMessage(parsedDistance, parsedPoolLength),
    );
  }

  if (parsedSplits !== undefined && !hasValidSplitTotal(parsedSplits, parsedTimeMs)) {
    throw new Error(getSplitTotalValidationMessage(parsedTimeMs));
  }

  return {
    performanceId,
    profileId,
    stroke,
    distance: parsedDistance,
    poolLength: parsedPoolLength,
    poolLengthUnit,
    timeMs: parsedTimeMs,
    place: parsedPlace,
    splits: parsedSplits,
    performedAt,
    sourceType,
    createdAt,
    updatedAt,
  };
}

function mapPerformanceRecordToItem(performance: PerformanceRecord) {
  const keys = getPerformanceKeys(
    performance.profileId,
    performance.performanceId,
  );

  return {
    pk: { S: keys.pk },
    sk: { S: keys.sk },
    performanceId: { S: performance.performanceId },
    profileId: { S: performance.profileId },
    stroke: { S: performance.stroke },
    distance: { N: String(performance.distance) },
    poolLength: { N: String(performance.poolLength) },
    poolLengthUnit: { S: performance.poolLengthUnit },
    timeMs: { N: String(performance.timeMs) },
    ...(performance.place !== undefined
      ? { place: { N: String(performance.place) } }
      : {}),
    ...(performance.splits !== undefined
      ? {
          splits: {
            L: performance.splits.map((split) => ({ N: String(split) })),
          },
        }
      : {}),
    performedAt: { S: performance.performedAt },
    sourceType: { S: performance.sourceType },
    createdAt: { S: performance.createdAt },
    updatedAt: { S: performance.updatedAt },
  };
}

export async function writePerformance(performance: PerformanceRecord) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();

  await client.send(
    new PutItemCommand({
      TableName: swimCoreTableName,
      Item: mapPerformanceRecordToItem(performance),
    }),
  );

  return performance;
}

export async function getPerformanceById(
  profileId: string,
  performanceId: string,
) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();
  const keys = getPerformanceKeys(profileId, performanceId);
  const response = await client.send(
    new GetItemCommand({
      TableName: swimCoreTableName,
      Key: {
        pk: { S: keys.pk },
        sk: { S: keys.sk },
      },
      ConsistentRead: true,
    }),
  );

  return mapItemToPerformanceRecord(
    response.Item as Record<string, PerformanceItemAttribute> | undefined,
  );
}

export async function deletePerformanceById(
  profileId: string,
  performanceId: string,
) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();
  const keys = getPerformanceKeys(profileId, performanceId);

  await client.send(
    new DeleteItemCommand({
      TableName: swimCoreTableName,
      Key: {
        pk: { S: keys.pk },
        sk: { S: keys.sk },
      },
    }),
  );
}

export async function getPerformancesByProfileId(profileId: string) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();
  const response = await client.send(
    new QueryCommand({
      TableName: swimCoreTableName,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': { S: `PROFILE#${profileId}` },
        ':skPrefix': { S: 'PERFORMANCE#' },
      },
      ConsistentRead: true,
    }),
  );

  const performances = (response.Items ?? [])
    .map((item) =>
      mapItemToPerformanceRecord(
        item as Record<string, PerformanceItemAttribute>,
      ),
    )
    .filter((item): item is PerformanceRecord => item !== null);

  performances.sort((left, right) => {
    const performedAtComparison = left.performedAt.localeCompare(right.performedAt);

    if (performedAtComparison !== 0) {
      return performedAtComparison;
    }

    return left.performanceId.localeCompare(right.performanceId);
  });

  return performances;
}
