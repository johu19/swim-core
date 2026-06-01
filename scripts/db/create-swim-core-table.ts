import {
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../../src/lib/dynamo.js';
import { getConfig } from '../../src/lib/env.js';

const MAX_READY_ATTEMPTS = 10;
const READY_RETRY_DELAY_MS = 1_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDynamoDb() {
  const client = createDynamoClient();

  for (let attempt = 1; attempt <= MAX_READY_ATTEMPTS; attempt += 1) {
    try {
      await client.send(new ListTablesCommand({ Limit: 1 }));
      console.log(`DynamoDB is ready after ${attempt} attempt(s).`);
      return;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown DynamoDB error';

      if (attempt === MAX_READY_ATTEMPTS) {
        throw new Error(
          `DynamoDB was not ready after ${MAX_READY_ATTEMPTS} attempts: ${message}`,
        );
      }

      console.log(
        `Waiting for DynamoDB to become ready (attempt ${attempt}/${MAX_READY_ATTEMPTS}): ${message}`,
      );
      await sleep(READY_RETRY_DELAY_MS);
    }
  }
}

async function main() {
  await waitForDynamoDb();

  const client = createDynamoClient();
  const { swimCoreTableName } = getConfig();

  try {
    await client.send(
      new CreateTableCommand({
        TableName: swimCoreTableName,
        AttributeDefinitions: [
          { AttributeName: 'pk', AttributeType: 'S' },
          { AttributeName: 'sk', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );

    console.log(`Created DynamoDB table "${swimCoreTableName}".`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`DynamoDB table "${swimCoreTableName}" already exists.`);
    } else {
      throw error;
    }
  }

  const table = await client.send(
    new DescribeTableCommand({
      TableName: swimCoreTableName,
    }),
  );

  console.log(JSON.stringify(table.Table, null, 2));
  console.log('');
  console.log('Planned item shapes for this table:');
  console.log('- Profile item: pk = PROFILE#<profileId>, sk = PROFILE#<profileId>');
  console.log(
    '- Performance item: pk = PROFILE#<profileId>, sk = PERFORMANCE#<performedAt>#<performanceId>',
  );
  console.log('');
  console.log(
    'Note: DynamoDB only defines key attributes at table creation time. Non-key fields like email, firstName, stroke, timeMs, and notes are stored on each item when the app writes data.',
  );
}

void main();
