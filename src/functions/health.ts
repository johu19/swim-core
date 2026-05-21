import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { json } from '../lib/http.js';

export const handler: APIGatewayProxyHandlerV2 = async () => {
  return json(200, {
    status: 'ok',
    service: 'finance-manager-api',
  });
};
