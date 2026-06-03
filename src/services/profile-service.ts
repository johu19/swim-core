import { AppError, ErrorName } from '../lib/error-handler.js';
import {
  getProfileById,
  ProfileRecord,
  insertProfile,
  saveProfile,
} from '../repositories/profile-repository.js';
import { PatchProfileInput } from '../validations/patch-profile.js';

export async function getOrCreateProfile(cognitoId: string, email: string) {
  const existingProfile = await getProfileById(cognitoId);

  if (existingProfile) {
    return existingProfile;
  }

  const now = new Date().toISOString();
  const profile: ProfileRecord = {
    profileId: cognitoId,
    email,
    createdAt: now,
    updatedAt: now,
  };

  return await insertProfile(profile);
}

export async function updateProfile(input: PatchProfileInput) {
  const existingProfile = await getProfileById(input.cognitoId);

  if (!existingProfile) {
    throw new AppError(
      ErrorName.ProfileNotFound,
      `Profile "${input.cognitoId}" was not found.`,
      404,
    );
  }

  const {
    cognitoId: _cognitoId,
    ...profileUpdates
  } = input;
  const updatedProfile: ProfileRecord = {
    ...existingProfile,
    ...profileUpdates,
    profileId: existingProfile.profileId,
    email: existingProfile.email,
    updatedAt: new Date().toISOString(),
  };

  return await saveProfile(updatedProfile);
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
