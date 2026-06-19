import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, ErrorName } from '../src/lib/error-handler.js';
import { type ProfileRecord } from '../src/repositories/profile-repository.js';
import * as profileRepository from '../src/repositories/profile-repository.js';
import {
  getOrCreateProfile,
  updateProfile,
} from '../src/services/profile-service.js';

test.afterEach(() => {
  test.mock.restoreAll();
});

test('getOrCreateProfile returns the stored profile when one already exists', async () => {
  test.mock.method(profileRepository, 'getProfileById', async () => ({
    profileId: 'cognito-123',
    email: 'jose@example.com',
    favStroke: 'freestyle',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  }));

  const result = await getOrCreateProfile('cognito-123', 'jose@example.com');

  assert.deepEqual(result, {
    profileId: 'cognito-123',
    email: 'jose@example.com',
    favStroke: 'freestyle',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  });
});

test('getOrCreateProfile inserts a minimal profile when one does not exist', async () => {
  let insertedProfile: unknown;

  test.mock.method(profileRepository, 'getProfileById', async () => null);
  test.mock.method(
    profileRepository,
    'insertProfile',
    async (profile: ProfileRecord) => {
      insertedProfile = profile;
      return profile;
    },
  );

  const result = await getOrCreateProfile('cognito-123', 'jose@example.com');

  assert.ok(insertedProfile);
  assert.deepEqual(result, insertedProfile);
  assert.deepEqual(
    {
      ...(insertedProfile as Record<string, unknown>),
      createdAt: typeof (insertedProfile as Record<string, unknown>).createdAt,
      updatedAt: typeof (insertedProfile as Record<string, unknown>).updatedAt,
    },
    {
      profileId: 'cognito-123',
      email: 'jose@example.com',
      createdAt: 'string',
      updatedAt: 'string',
    },
  );
});

test('updateProfile updates only the provided fields', async () => {
  let savedProfile: unknown;

  test.mock.method(profileRepository, 'getProfileById', async () => ({
    profileId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  }));
  test.mock.method(
    profileRepository,
    'saveProfile',
    async (profile: ProfileRecord) => {
      savedProfile = profile;
      return profile;
    },
  );

  const result = await updateProfile({
    cognitoId: 'cognito-123',
    lastName: 'Galvis',
    favStroke: 'medley',
    teamName: 'Acuacol',
  });

  assert.ok(savedProfile);
  assert.deepEqual(result, savedProfile);
  assert.deepEqual(
    {
      ...(savedProfile as Record<string, unknown>),
      updatedAt: typeof (savedProfile as Record<string, unknown>).updatedAt,
    },
    {
      profileId: 'cognito-123',
      email: 'jose@example.com',
      firstName: 'Jose',
      lastName: 'Galvis',
      favStroke: 'medley',
      teamName: 'Acuacol',
      createdAt: '2026-05-27T00:00:00.000Z',
      updatedAt: 'string',
    },
  );
});

test('updateProfile throws ProfileNotFound when profile does not exist', async () => {
  test.mock.method(profileRepository, 'getProfileById', async () => null);

  await assert.rejects(
    () =>
      updateProfile({
        cognitoId: 'cognito-123',
        firstName: 'Jose',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.ProfileNotFound);
      assert.equal(error.statusCode, 404);
      assert.equal(
        error.message,
        'ProfileNotFound: Profile "cognito-123" was not found.',
      );
      return true;
    },
  );
});
