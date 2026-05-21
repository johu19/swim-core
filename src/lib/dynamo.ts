import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';

function getDynamoEndpoint() {
  return process.env.DYNAMODB_ENDPOINT;
}

export function createDynamoClient() {
  const endpoint = getDynamoEndpoint();

  return new DynamoDBClient({
    region: process.env.AWS_REGION ?? 'us-east-1',
    endpoint,
    credentials: endpoint
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'local',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'local',
        }
      : undefined,
    maxAttempts: 1,
  });
}

export async function pingDynamoDb() {
  const client = createDynamoClient();

  try {
    await client.send(new ListTablesCommand({ Limit: 1 }));

    return {
      ok: true,
      endpoint: getDynamoEndpoint() ?? 'aws-managed',
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: getDynamoEndpoint() ?? 'aws-managed',
      error: error instanceof Error ? error.message : 'Unknown DynamoDB error',
    };
  }
}
