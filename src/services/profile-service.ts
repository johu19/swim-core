import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { AppError, ErrorName } from '../lib/error-handler.js';
import {
  insertProfile,
  getProfileById,
  ProfileRecord,
} from '../repositories/profile-repository.js';
import { CreateProfileInput } from '../validations/create-profile.js';

export async function createProfile(input: CreateProfileInput) {
  const now = new Date().toISOString();
  const profile: ProfileRecord = {
    profileId: input.cognitoId,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    birthDate: input.birthDate,
    gender: input.gender,
    teamName: input.teamName,
    createdAt: now,
    updatedAt: now,
  };

  const existingProfile = await getProfileById(input.cognitoId);

  if (existingProfile) {
    throw new AppError(
      ErrorName.ProfileAlreadyExists,
      `Profile "${input.cognitoId}" already exists.`,
      400,
    );
  }

  return await insertProfile(profile);
}

export async function getProfile(profileId: string) {
  const profile = await getProfileById(profileId);

  if (!profile) {
    throw new AppError(
      ErrorName.ProfileNotFound,
      `Profile "${profileId}" was not found.`,
      404,
    );
  }

  return profile;
}
