import assert from 'node:assert/strict';
import test from 'node:test';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { handler } from '../src/functions/get-profile.js';
import { AppError, ErrorName } from '../src/lib/error-handler.js';
import * as profileService from '../src/services/profile-service.js';

function buildEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'GET /profile',
    rawPath: '/profile',
    rawQueryString: '',
    headers: {},
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      http: {
        method: 'GET',
        path: '/profile',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'node:test',
      },
      requestId: 'local-request-id',
      routeKey: 'GET /profile',
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
    body: undefined,
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

test('get-profile returns 200 and looks up profile using cognito id from claims', async () => {
  let capturedCognitoId: string | undefined;
  const originalGetProfile = profileService.getProfile;
  (profileService as { getProfile: typeof profileService.getProfile }).getProfile =
    async (cognitoId) => {
      capturedCognitoId = cognitoId;

      return {
        profileId: cognitoId,
        email: 'jose@example.com',
        firstName: 'Jose',
        lastName: 'Galvis',
        birthDate: '1997-01-12',
        gender: 'male',
        teamName: 'Acuacol',
        createdAt: '2026-05-25T00:00:00.000Z',
        updatedAt: '2026-05-25T00:00:00.000Z',
      };
    };

  const response = await handler(buildEvent(), {} as never, () => undefined);
  (profileService as { getProfile: typeof profileService.getProfile }).getProfile =
    originalGetProfile;

  const structuredResponse = getStructuredResponse(response);

  assert.equal(structuredResponse.statusCode, 200);
  assert.equal(capturedCognitoId, 'cognito-123');
  assert.deepEqual(JSON.parse(structuredResponse.body), {
    profile: {
      profileId: 'cognito-123',
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

test('get-profile returns mapped app error response when profile is missing', async () => {
  const originalGetProfile = profileService.getProfile;
  (profileService as { getProfile: typeof profileService.getProfile }).getProfile =
    async () => {
      throw new AppError(
        ErrorName.ProfileNotFound,
        'Profile "cognito-123" was not found.',
        404,
      );
    };

  const response = await handler(buildEvent(), {} as never, () => undefined);
  (profileService as { getProfile: typeof profileService.getProfile }).getProfile =
    originalGetProfile;

  const structuredResponse = getStructuredResponse(response);

  assert.equal(structuredResponse.statusCode, 404);
  assert.deepEqual(JSON.parse(structuredResponse.body), {
    error: 'ProfileNotFound',
    message: 'ProfileNotFound: Profile "cognito-123" was not found.',
  });
});
