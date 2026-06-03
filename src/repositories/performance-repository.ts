import {
  DeleteItemCommand,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
} from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../lib/dynamo.js';
import { getConfig } from '../lib/env.js';

export type PerformanceRecord = {
  performanceId: string;
  profileId: string;
  stroke: 'butterfly' | 'backstroke' | 'breaststroke' | 'freestyle';
  distance: 25 | 50 | 100 | 200 | 400 | 800 | 1500;
  poolLength: 25 | 50;
  poolLengthUnit: 'yards' | 'meters';
  timeMs: number;
  performedAt: string;
  sourceType: 'competition' | 'training';
  effortLevel: 1 | 2 | 3 | 4 | 5;
  notes: string;
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
  item: Record<string, { S?: string; N?: string }> | undefined,
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
  const performedAt = item.performedAt?.S;
  const sourceType = item.sourceType?.S;
  const effortLevel = item.effortLevel?.N;
  const notes = item.notes?.S;
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
    !effortLevel ||
    notes === undefined ||
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
    stroke !== 'freestyle'
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

  return {
    performanceId,
    profileId,
    stroke,
    distance: Number(distance) as PerformanceRecord['distance'],
    poolLength: Number(poolLength) as PerformanceRecord['poolLength'],
    poolLengthUnit,
    timeMs: Number(timeMs),
    performedAt,
    sourceType,
    effortLevel: Number(effortLevel) as PerformanceRecord['effortLevel'],
    notes,
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
    performedAt: { S: performance.performedAt },
    sourceType: { S: performance.sourceType },
    effortLevel: { N: String(performance.effortLevel) },
    notes: { S: performance.notes },
    createdAt: { S: performance.createdAt },
    updatedAt: { S: performance.updatedAt },
  };
}

export async function insertPerformance(performance: PerformanceRecord) {
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

export async function savePerformance(performance: PerformanceRecord) {
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
    response.Item as Record<string, { S?: string; N?: string }> | undefined,
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
        item as Record<string, { S?: string; N?: string }>,
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
