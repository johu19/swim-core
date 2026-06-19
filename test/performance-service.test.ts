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
    stroke: 'medley',
    distance: 200,
    poolLength: 25,
    poolLengthUnit: 'meters',
    timeMs: 32780,
    place: 1,
    splits: [4200, 4100, 4100, 4100, 4100, 4100, 4040, 4040],
    performedAt: '2026-09-20',
    sourceType: 'competition',
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
      stroke: 'medley',
      distance: 200,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 32780,
      place: 1,
      splits: [4200, 4100, 4100, 4100, 4100, 4100, 4040, 4040],
      performedAt: '2026-09-20',
      sourceType: 'competition',
      performanceId: 'string',
      createdAt: 'string',
      updatedAt: 'string',
    },
  );
});

test('createPerformance throws PayloadValidation when place is provided for training', async () => {
  await assert.rejects(
    () =>
      createPerformance({
        cognitoId: 'cognito-123',
        stroke: 'freestyle',
        distance: 100,
        poolLength: 50,
        poolLengthUnit: 'meters',
        timeMs: 60000,
        place: 1,
        performedAt: '2026-09-20',
        sourceType: 'training',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: place is not allowed when sourceType is "training".',
      );
      return true;
    },
  );
});

test('createPerformance inserts a performance without splits', async () => {
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
    stroke: 'freestyle',
    distance: 100,
    poolLength: 50,
    poolLengthUnit: 'meters',
    timeMs: 60000,
    performedAt: '2026-09-20',
    sourceType: 'competition',
  });

  assert.ok(insertedPerformance);
  assert.deepEqual(result, insertedPerformance);
  assert.equal(
    (insertedPerformance as PerformanceRecord).splits,
    undefined,
  );
});

test('createPerformance throws PayloadValidation when stroke and distance are incompatible', async () => {
  await assert.rejects(
    () =>
      createPerformance({
        cognitoId: 'cognito-123',
        stroke: 'medley',
        distance: 50,
        poolLength: 25,
        poolLengthUnit: 'meters',
        timeMs: 32780,
        performedAt: '2026-09-20',
        sourceType: 'competition',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: distance 50 is not allowed for stroke "medley". Allowed distances: 100, 200, 400.',
      );
      return true;
    },
  );
});

test('createPerformance throws PayloadValidation when splits count does not match distance and poolLength', async () => {
  await assert.rejects(
    () =>
      createPerformance({
        cognitoId: 'cognito-123',
        stroke: 'freestyle',
        distance: 100,
        poolLength: 25,
        poolLengthUnit: 'meters',
        timeMs: 60000,
        splits: [15000, 15000],
        performedAt: '2026-09-20',
        sourceType: 'competition',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: splits must contain exactly 4 entries for distance 100 and poolLength 25.',
      );
      return true;
    },
  );
});

test('createPerformance throws PayloadValidation when splits total does not match timeMs', async () => {
  await assert.rejects(
    () =>
      createPerformance({
        cognitoId: 'cognito-123',
        stroke: 'freestyle',
        distance: 100,
        poolLength: 25,
        poolLengthUnit: 'meters',
        timeMs: 60000,
        splits: [15000, 15000, 15000, 14000],
        performedAt: '2026-09-20',
        sourceType: 'competition',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: splits must sum exactly to timeMs 60000.',
      );
      return true;
    },
  );
});

test('createPerformance throws PayloadValidation when distance 25 is used in a 50 pool', async () => {
  await assert.rejects(
    () =>
      createPerformance({
        cognitoId: 'cognito-123',
        stroke: 'freestyle',
        distance: 25,
        poolLength: 50,
        poolLengthUnit: 'meters',
        timeMs: 32780,
        performedAt: '2026-09-20',
        sourceType: 'competition',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: distance 25 is not allowed for poolLength 50. Distance 25 is only allowed when poolLength is 25.',
      );
      return true;
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
        place: 2,
        splits: [16300, 16480],
        performedAt: '2026-09-20',
        sourceType: 'competition',
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
      place: 2,
      splits: [16300, 16480],
      performedAt: '2026-09-20',
      sourceType: 'competition',
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
      place: 2,
      performedAt: '2026-09-20',
      sourceType: 'competition',
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
      place: 2,
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: 'string',
    },
  );
});

test('updatePerformance throws PayloadValidation when merged sourceType training keeps place', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'freestyle',
      distance: 100,
      poolLength: 50,
      poolLengthUnit: 'meters',
      timeMs: 60000,
      place: 1,
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }),
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        sourceType: 'training',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: place is not allowed when sourceType is "training".',
      );
      return true;
    },
  );
});

test('updatePerformance throws PayloadValidation when merged splits count does not match distance and poolLength', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'freestyle',
      distance: 100,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 60000,
      splits: [15000, 15000, 15000, 15000],
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }),
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        poolLength: 50,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: splits must contain exactly 2 entries for distance 100 and poolLength 50.',
      );
      return true;
    },
  );
});

test('updatePerformance throws PayloadValidation when merged splits total does not match timeMs', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'freestyle',
      distance: 100,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 60000,
      splits: [15000, 15000, 15000, 15000],
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }),
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        timeMs: 59000,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: splits must sum exactly to timeMs 59000.',
      );
      return true;
    },
  );
});

test('updatePerformance throws PayloadValidation when merged stroke and distance are incompatible', async () => {
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
      splits: [16300, 16480],
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }),
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        distance: 400,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: distance 400 is not allowed for stroke "butterfly". Allowed distances: 25, 50, 100, 200.',
      );
      return true;
    },
  );
});

test('updatePerformance throws PayloadValidation when merged distance 25 and poolLength 50 are incompatible', async () => {
  test.mock.method(
    performanceRepository,
    'getPerformanceById',
    async () => ({
      performanceId: 'performance-1',
      profileId: 'cognito-123',
      stroke: 'freestyle',
      distance: 50,
      poolLength: 25,
      poolLengthUnit: 'meters',
      timeMs: 32780,
      splits: [16300, 16480],
      performedAt: '2026-09-20',
      sourceType: 'competition',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: '2026-05-27T00:00:00.000Z',
    }),
  );

  await assert.rejects(
    () =>
      updatePerformance({
        cognitoId: 'cognito-123',
        performanceId: 'performance-1',
        distance: 25,
        poolLength: 50,
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.PayloadValidation);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'PayloadValidation: distance 25 is not allowed for poolLength 50. Distance 25 is only allowed when poolLength is 25.',
      );
      return true;
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
      splits: [16300, 16480],
      performedAt: '2026-09-20',
      sourceType: 'competition',
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
