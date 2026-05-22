import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../lib/dynamo.js';
import { getConfig } from '../lib/env.js';

export type ProfileRecord = {
  profileId: string;
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'male' | 'female';
  teamName: string;
  createdAt: string;
  updatedAt: string;
};

function getProfileKeys(profileId: string) {
  return {
    pk: `PROFILE#${profileId}`,
    sk: `PROFILE#${profileId}`,
  };
}

function mapItemToProfileRecord(
  item: Record<string, { S?: string }> | undefined,
): ProfileRecord | null {
  if (!item) {
    return null;
  }

  const profileId = item.profileId?.S;
  const email = item.email?.S;
  const firstName = item.firstName?.S;
  const lastName = item.lastName?.S;
  const birthDate = item.birthDate?.S;
  const gender = item.gender?.S;
  const teamName = item.teamName?.S;
  const createdAt = item.createdAt?.S;
  const updatedAt = item.updatedAt?.S;

  if (
    !profileId ||
    !email ||
    !firstName ||
    !lastName ||
    !birthDate ||
    !gender ||
    !teamName ||
    !createdAt ||
    !updatedAt
  ) {
    throw new Error('Profile item is missing one or more required attributes.');
  }

  if (gender !== 'male' && gender !== 'female') {
    throw new Error(`Profile item has unsupported gender value "${gender}".`);
  }

  return {
    profileId,
    email,
    firstName,
    lastName,
    birthDate,
    gender,
    teamName,
    createdAt,
    updatedAt,
  };
}

export async function createProfile(profile: ProfileRecord) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();
  const keys = getProfileKeys(profile.profileId);

  await client.send(
    new PutItemCommand({
      TableName: swimCoreTableName,
      Item: {
        pk: { S: keys.pk },
        sk: { S: keys.sk },
        profileId: { S: profile.profileId },
        email: { S: profile.email },
        firstName: { S: profile.firstName },
        lastName: { S: profile.lastName },
        birthDate: { S: profile.birthDate },
        gender: { S: profile.gender },
        teamName: { S: profile.teamName },
        createdAt: { S: profile.createdAt },
        updatedAt: { S: profile.updatedAt },
      },
      ConditionExpression: 'attribute_not_exists(pk)',
    }),
  );

  return profile;
}

export async function getProfile(profileId: string) {
  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();
  const keys = getProfileKeys(profileId);
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

  return mapItemToProfileRecord(response.Item as Record<string, { S?: string }> | undefined);
}
