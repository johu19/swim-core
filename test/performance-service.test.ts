import assert from 'node:assert/strict';
import test from 'node:test';
import type { PerformanceRecord } from '../src/repositories/performance-repository.js';
import * as performanceRepository from '../src/repositories/performance-repository.js';
import {
  createPerformance,
  getPerformances,
} from '../src/services/performance-service.js';

test.afterEach(() => {
  test.mock.restoreAll();
});

test('createPerformance inserts a new performance with generated id and timestamps', async () => {
  let insertedPerformance: unknown;

  test.mock.method(
    performanceRepository,
    'insertPerformance',
    async (performance: PerformanceRecord) => {
      insertedPerformance = performance;
      return performance;
    },
  );

  const result = await createPerformance({
    cognitoId: 'cognito-123',
    stroke: 'butterfly',
    distance: 50,
    poolLength: 25,
    poolLengthUnit: 'meters',
    timeMs: 32780,
    performedAt: '2026-09-20',
    sourceType: 'competition',
    effortLevel: 5,
    notes: 'National tourney final heat',
  });

  assert.ok(insertedPerformance);
  assert.deepEqual(result, insertedPerformance);
  assert.deepEqual(
    {
      ...(insertedPerformance as Record<string, unknown>),
      performanceId: typeof (insertedPerformance as Record<string, unknown>)
        .performanceId,
      createdAt: typeof (insertedPerformance as Record<string, unknown>)
        .createdAt,
      updatedAt: typeof (insertedPerformance as Record<string, unknown>)
        .updatedAt,
    },
    {
      profileId: 'cognito-123',
      stroke: 'butterfly',
      distance: 50,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 32780,
      performedAt: '2026-09-20',
      sourceType: 'competition',
      effortLevel: 5,
      notes: 'National tourney final heat',
      performanceId: 'string',
      createdAt: 'string',
      updatedAt: 'string',
    },
  );
});

test('getPerformances returns all performances from the repository', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformancesByProfileId',
    async () => [
      {
        performanceId: 'performance-1',
        profileId: 'cognito-123',
        stroke: 'butterfly',
        distance: 50,
        poolLength: 25,
        poolLengthUnit: 'meters',
        timeMs: 32780,
        performedAt: '2026-09-20',
        sourceType: 'competition',
        effortLevel: 5,
        notes: 'National tourney final heat',
        createdAt: '2026-05-27T00:00:00.000Z',
        updatedAt: '2026-05-27T00:00:00.000Z',
      },
    ],
  );

  const result = await getPerformances('cognito-123');

  assert.deepEqual(result, [
    {
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'butterfly',
      distance: 50,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 32780,
      performedAt: '2026-09-20',
      sourceType: 'competition',
      effortLevel: 5,
      notes: 'National tourney final heat',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    },
  ]);
});
