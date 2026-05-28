import {
  DescribeTableCommand,
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import { getConfig } from './env.js';

export function createDynamoClient() {
  const config = getConfig();

  if (config.dynamoDbEndpoint) {
    return new DynamoDBClient({
      region: config.awsRegion,
      endpoint: config.dynamoDbEndpoint,
      credentials: {
        accessKeyId: config.awsAccessKeyId ?? 'local',
        secretAccessKey: config.awsSecretAccessKey ?? 'local',
      },
      maxAttempts: 1,
    });
  }

  return new DynamoDBClient({
    region: config.awsRegion,
    maxAttempts: 1,
  });
}

export async function pingDynamoDb() {
  const client = createDynamoClient();
  const { dynamoDbEndpoint, swimCoreTableName } = getConfig();

  try {
    await client.send(
      new DescribeTableCommand({
        TableName: swimCoreTableName,
      }),
    );

    return {
      ok: true,
      endpoint: dynamoDbEndpoint ?? 'aws-managed',
      tableName: swimCoreTableName,
    };
  } catch (error) {
    return {
      ok: false,
      endpoint: dynamoDbEndpoint ?? 'aws-managed',
      tableName: swimCoreTableName,
      error: error instanceof Error ? error.message : 'Unknown DynamoDB error',
    };
  }
}
