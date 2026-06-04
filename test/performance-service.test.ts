import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, ErrorName } from '../src/lib/error-handler.js';
import type { PerformanceRecord } from '../src/repositories/performance-repository.js';
import * as performanceRepository from '../src/repositories/performance-repository.js';
import {
  createPerformance,
  deletePerformance,
  getPerformances,
  updatePerformance,
} from '../src/services/performance-service.js';

test.afterEach(() => {
  test.mock.restoreAll();
});

test('createPerformance inserts a new performance with generated id and timestamps', async () => {
  let insertedPerformance: unknown;

  test.mock.method(
    performanceRepository,
    'writePerformance',
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

test('updatePerformance updates only the provided fields', async () => {
  let savedPerformance: unknown;

  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
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
    }),
  );
  test.mock.method(
    performanceRepository,
    'writePerformance',
    async (performance: PerformanceRecord) => {
      savedPerformance = performance;
      return performance;
    },
  );

  const result = await updatePerformance({
    cognitoId: 'cognito-123',
    performanceId: 'performance-1',
    timeMs: 32000,
    notes: 'Updated after race review',
  });

  assert.ok(savedPerformance);
  assert.deepEqual(result, savedPerformance);
  assert.deepEqual(
    {
      ...(savedPerformance as Record<string, unknown>),
      updatedAt: typeof (savedPerformance as Record<string, unknown>).updatedAt,
    },
    {
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'butterfly',
      distance: 50,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 32000,
      performedAt: '2026-09-20',
      sourceType: 'competition',
      effortLevel: 5,
      notes: 'Updated after race review',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: 'string',
    },
  );
});

test('updatePerformance throws PerformanceNotFound when the performance does not exist', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => null,
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        timeMs: 32000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PerformanceNotFound);
      assert.equal(error.statusCode, 404);
      assert.equal(
        error.message,
        'PerformanceNotFound: Performance "performance-1" was not found.',
      );
      return true;
    },
  );
});

test('deletePerformance deletes an existing performance', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
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
    }),
  );
  const deletePerformanceByIdMock = test.mock.method(
    performanceRepository,
    'deletePerformanceById',
    async () => undefined,
  );

  await deletePerformance('cognito-123', 'performance-1');

  assert.equal(deletePerformanceByIdMock.mock.callCount(), 1);
  assert.deepEqual(deletePerformanceByIdMock.mock.calls[0]?.arguments, [
    'cognito-123',
    'performance-1',
  ]);
});

test('deletePerformance throws PerformanceNotFound when the performance does not exist', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => null,
  );
  const deletePerformanceByIdMock = test.mock.method(
    performanceRepository,
    'deletePerformanceById',
    async () => undefined,
  );

  await assert.rejects(
    () => deletePerformance('cognito-123', 'performance-1'),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PerformanceNotFound);
      assert.equal(error.statusCode, 404);
      assert.equal(
        error.message,
        'PerformanceNotFound: Performance "performance-1" was not found.',
      );
      return true;
    },
  );

  assert.equal(deletePerformanceByIdMock.mock.callCount(), 0);
});
