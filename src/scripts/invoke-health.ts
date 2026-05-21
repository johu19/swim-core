import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
  Handler,
} from 'aws-lambda';
import { handler } from '../functions/health.js';

const typedHandler = handler as Handler<
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2
>;

const mockEvent: APIGatewayProxyEventV2 = {
  version: '2.0',
  routeKey: 'GET /health',
  rawPath: '/health',
  rawQueryString: '',
  headers: {},
  requestContext: {
    accountId: 'local',
    apiId: 'local',
    domainName: 'localhost',
    domainPrefix: 'localhost',
    http: {
      method: 'GET',
      path: '/health',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'local-script',
    },
    requestId: 'local-request-id',
    routeKey: 'GET /health',
    stage: '$default',
    time: new Date().toUTCString(),
    timeEpoch: Date.now(),
  },
  isBase64Encoded: false,
  body: undefined,
  pathParameters: undefined,
  queryStringParameters: undefined,
  stageVariables: undefined,
  cookies: undefined,
};

const mockContext: Context = {
  awsRequestId: 'local-request-id',
  callbackWaitsForEmptyEventLoop: false,
  functionName: 'health',
  functionVersion: '$LATEST',
  invokedFunctionArn: 'arn:aws:lambda:local:0:function:health',
  logGroupName: 'local',
  logStreamName: 'local',
  memoryLimitInMB: '128',
  done: () => undefined,
  fail: () => undefined,
  getRemainingTimeInMillis: () => 1_000,
  succeed: () => undefined,
};

async function main() {
  const response = await typedHandler(mockEvent, mockContext, () => undefined);
  console.log(JSON.stringify(response, null, 2));
}

void main();
