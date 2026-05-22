import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { pingDynamoDb } from '../lib/dynamo.js';
import { json } from '../lib/http.js';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  const database = await pingDynamoDb();
  const statusCode = database.ok ? 200 : 503;

  return json(statusCode, {
    status: database.ok ? 'ok' : 'degraded',
    service: 'finance-manager-api',
    database,
  });
};
``