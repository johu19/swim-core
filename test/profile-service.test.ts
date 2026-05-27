import assert from 'node:assert/strict';
import test from 'node:test';
import { AppError, ErrorName } from '../src/lib/error-handler.js';
import { type ProfileRecord } from '../src/repositories/profile-repository.js';
import * as profileRepository from '../src/repositories/profile-repository.js';
import { createProfile, getProfile } from '../src/services/profile-service.js';

test.afterEach(() => {
  test.mock.restoreAll();
});

test('createProfile inserts a new profile when one does not already exist', async () => {
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

  const result = await createProfile({
    cognitoId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    lastName: 'Galvis',
    birthDate: '1997-01-12',
    gender: 'male',
    teamName: 'Acuacol',
  });

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
      firstName: 'Jose',
      lastName: 'Galvis',
      birthDate: '1997-01-12',
      gender: 'male',
      teamName: 'Acuacol',
      createdAt: 'string',
      updatedAt: 'string',
    },
  );
});

test('createProfile throws ProfileAlreadyExists when profile already exists', async () => {
  const insertProfileMock = test.mock.method(
    profileRepository,
    'insertProfile',
    async () => {
      throw new Error('should not be called');
    },
  );

  test.mock.method(profileRepository, 'getProfileById', async () => ({
    profileId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    lastName: 'Galvis',
    birthDate: '1997-01-12',
    gender: 'male',
    teamName: 'Acuacol',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  }));

  await assert.rejects(
    () =>
      createProfile({
        cognitoId: 'cognito-123',
        email: 'jose@example.com',
        firstName: 'Jose',
        lastName: 'Galvis',
        birthDate: '1997-01-12',
        gender: 'male',
        teamName: 'Acuacol',
      }),
    (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.name, ErrorName.ProfileAlreadyExists);
      assert.equal(error.statusCode, 400);
      assert.equal(
        error.message,
        'ProfileAlreadyExists: Profile "cognito-123" already exists.',
      );
      return true;
    },
  );

  assert.equal(insertProfileMock.mock.callCount(), 0);
});

test('getProfile returns the stored profile', async () => {
  test.mock.method(profileRepository, 'getProfileById', async () => ({
    profileId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    lastName: 'Galvis',
    birthDate: '1997-01-12',
    gender: 'male',
    teamName: 'Acuacol',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  }));

  const result = await getProfile('cognito-123');

  assert.deepEqual(result, {
    profileId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    lastName: 'Galvis',
    birthDate: '1997-01-12',
    gender: 'male',
    teamName: 'Acuacol',
    createdAt: '2026-05-27T00:00:00.000Z',
    updatedAt: '2026-05-27T00:00:00.000Z',
  });
});

test('getProfile throws ProfileNotFound when profile does not exist', async () => {
  test.mock.method(profileRepository, 'getProfileById', async () => null);

  await assert.rejects(
    () => getProfile('cognito-123'),
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
