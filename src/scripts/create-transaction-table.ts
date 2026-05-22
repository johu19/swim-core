import {
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
} from '@aws-sdk/client-dynamodb';
import { createDynamoClient } from '../lib/dynamo.js';

process.env.AWS_REGION ??= 'us-east-1';
process.env.AWS_ACCESS_KEY_ID ??= 'local';
process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
process.env.DYNAMODB_ENDPOINT ??= 'http://localhost:8000';

const TABLE_NAME = 'transaction';

async function main() {
  const client = createDynamoClient();

  try {
    await client.send(
      new CreateTableCommand({
        TableName: TABLE_NAME,
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

    console.log(`Created DynamoDB table "${TABLE_NAME}".`);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`DynamoDB table "${TABLE_NAME}" already exists.`);
    } else {
      throw error;
    }
  }

  const table = await client.send(
    new DescribeTableCommand({
      TableName: TABLE_NAME,
    }),
  );

  console.log(JSON.stringify(table.Table, null, 2));
}

void main();
