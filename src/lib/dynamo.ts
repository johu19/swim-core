import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { getConfig } from './env.js';

export function createDynamoClient() {
  const config = getConfig();

  return new DynamoDBClient({
    region: config.awsRegion,
    endpoint: config.dynamoDbEndpoint,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
    maxAttempts: 1,
  });
}

export async function pingDynamoDb() {
  const client = createDynamoClient();
  const { dynamoDbEndpoint } = getConfig();

  try {
    await client.send(new ListTablesCommand({ Limit: 1 }));

    return {
      ok: true,
      endpoint: dynamoDbEndpoint ?? 'aws-managed',
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: dynamoDbEndpoint ?? 'aws-managed',
      error: error instanceof Error ? error.message : 'Unknown DynamoDB error',
    };
  }
}
