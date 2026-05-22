import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  createProfile,
  getProfile,
  ProfileRecord,
} from '../repositories/profile-repository.js';
import { CreateProfileInput } from '../validations/create-profile.js';

export class ProfileAlreadyExistsError extends Error {
  constructor(profileId: string) {
    super(`Profile "${profileId}" already exists.`);
  }
}

export class ProfileNotFoundError extends Error {
  constructor(profileId: string) {
    super(`Profile "${profileId}" was not found.`);
  }
}

export async function createProfileForAuthenticatedUser(
  profileId: string,
  input: CreateProfileInput,
) {
  const now = new Date().toISOString();
  const profile: ProfileRecord = {
    profileId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate,
    gender: input.gender,
    teamName: input.teamName,
    createdAt: now,
    updatedAt: now,
  };

  try {
    return await createProfile(profile);
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) {
      throw new ProfileAlreadyExistsError(profileId);
    }

    throw error;
  }
}

export async function getProfileForAuthenticatedUser(profileId: string) {
  const profile = await getProfile(profileId);

  if (!profile) {
    throw new ProfileNotFoundError(profileId);
  }

  return profile;
}
