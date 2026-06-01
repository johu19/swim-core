import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { pingDynamoDb } from '../lib/dynamo.js';
import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';

export const handler = runner(async () => {
  const database = await pingDynamoDb();
  const statusCode = database.ok ? 200 : 503;

  return json(statusCode, {
    status: database.ok ? 'ok' : 'degraded',
    service: 'swim-core-api',
    database,
  });
}, {
  authenticationEnabled: false,
});
