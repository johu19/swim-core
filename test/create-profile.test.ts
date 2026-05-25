import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { buildCreateProfileHandler } from '../src/functions/create-profile.js';

function buildEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /profile',
    rawPath: '/profile',
    rawQueryString: '',
    headers: {
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'POST',
        path: '/profile',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'node:test',
      },
      requestId: 'local-request-id',
      routeKey: 'POST /profile',
      stage: '$default',
      time: new Date().toUTCString(),
      timeEpoch: Date.now(),
      authorizer: {
        jwt: {
          claims: {
            sub: 'cognito-123',
            email: 'jose@example.com',
          },
          scopes: [],
        },
      },
    } as APIGatewayProxyEventV2['requestContext'],
    isBase64Encoded: false,
    body: JSON.stringify({
      firstName: 'Jose',
      lastName: 'Galvis',
      birthDate: '1997-01-12',
      gender: 'male',
      teamName: 'Acuacol',
    }),
    pathParameters: undefined,
    queryStringParameters: undefined,
    stageVariables: undefined,
    cookies: undefined,
    ...overrides,
  };
}

function getStructuredResponse(
  response: APIGatewayProxyStructuredResultV2 | string | void,
) {
  if (!response || typeof response === 'string') {
    assert.fail('Expected a structured API Gateway response object.');
  }

  assert.ok('statusCode' in response);
  assert.ok('body' in response);

  return response as {
    statusCode: number;
    body: string;
  };
}

test('create-profile returns 201 and sends auth + body fields to service', async () => {
  let capturedInput: unknown;

  const handler = buildCreateProfileHandler({
    createProfile: async (input) => {
      capturedInput = input;

      return {
        ...input,
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
      };
    },
  });

  const response = await handler(buildEvent(), {} as never, () => undefined);

  const structuredResponse = getStructuredResponse(response);

  assert.equal(structuredResponse.statusCode, 201);
  assert.deepEqual(capturedInput, {
    cognitoId: 'cognito-123',
    email: 'jose@example.com',
    firstName: 'Jose',
    lastName: 'Galvis',
    birthDate: '1997-01-12',
    gender: 'male',
    teamName: 'Acuacol',
  });

  assert.deepEqual(JSON.parse(structuredResponse.body), {
    profile: {
      cognitoId: 'cognito-123',
      email: 'jose@example.com',
      firstName: 'Jose',
      lastName: 'Galvis',
      birthDate: '1997-01-12',
      gender: 'male',
      teamName: 'Acuacol',
      createdAt: '2026-05-25T00:00:00.000Z',
      updatedAt: '2026-05-25T00:00:00.000Z',
    },
  });
});

test('create-profile returns 400 when payload validation fails', async () => {
  const handler = buildCreateProfileHandler({
    createProfile: async () => {
      throw new Error('should not be called');
    },
  });

  const response = await handler(
    buildEvent({
      body: JSON.stringify({
        lastName: 'Galvis',
        birthDate: '1997-01-12',
        gender: 'male',
        teamName: 'Acuacol',
      }),
    }),
    {} as never,
    () => undefined,
  );

  const structuredResponse = getStructuredResponse(response);

  assert.equal(structuredResponse.statusCode, 400);
  assert.deepEqual(JSON.parse(structuredResponse.body), {
    error: 'PayloadValidation',
    message:
      'PayloadValidation: firstName: Invalid input: expected string, received undefined',
  });
});
