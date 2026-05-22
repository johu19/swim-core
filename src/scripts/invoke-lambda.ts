import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  Context,
  Handler,
} from 'aws-lambda';
import { loadLocalEnvDefaults } from '../lib/env.js';

loadLocalEnvDefaults();

type SupportedLambdaName = 'health' | 'create-profile' | 'get-profile';

type InvokeRequestFixture = {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
  claims?: Record<string, string>;
};

type LambdaRegistration = {
  defaultMethod: string;
  defaultPath: string;
  implemented: boolean;
  requestFixturePath: string;
  bodyFixturePath?: string;
  loadHandler?: () => Promise<
    Handler<APIGatewayProxyEventV2, APIGatewayProxyResultV2>
  >;
};

const REGISTRY: Record<SupportedLambdaName, LambdaRegistration> = {
  health: {
    defaultMethod: 'GET',
    defaultPath: '/health',
    implemented: true,
    requestFixturePath: resolve(
      process.cwd(),
      'src/scripts/fixtures/requests/health.json',
    ),
    loadHandler: async () => (await import('../functions/health.js')).handler,
  },
  'create-profile': {
    defaultMethod: 'POST',
    defaultPath: '/profiles',
    implemented: true,
    requestFixturePath: resolve(
      process.cwd(),
      'src/scripts/fixtures/requests/create-profile.json',
    ),
    bodyFixturePath: resolve(
      process.cwd(),
      'src/scripts/fixtures/bodies/create-profile.json',
    ),
    loadHandler: async () =>
      (await import('../functions/create-profile.js')).handler,
  },
  'get-profile': {
    defaultMethod: 'GET',
    defaultPath: '/profiles/me',
    implemented: true,
    requestFixturePath: resolve(
      process.cwd(),
      'src/scripts/fixtures/requests/get-profile.json',
    ),
    loadHandler: async () => (await import('../functions/get-profile.js')).handler,
  },
};

function getLambdaNameArg() {
  const lambdaName = process.argv[2] as SupportedLambdaName | undefined;

  if (!lambdaName) {
    throw new Error(
      `Missing lambda name. Usage: npm run dev:invoke -- ${Object.keys(REGISTRY).join(' | ')}`,
    );
  }

  if (!(lambdaName in REGISTRY)) {
    throw new Error(
      `Unsupported lambda "${lambdaName}". Supported lambdas: ${Object.keys(REGISTRY).join(', ')}`,
    );
  }

  return lambdaName;
}

async function loadFixture(fixturePath: string) {
  const rawFixture = await readFile(fixturePath, 'utf-8');
  return JSON.parse(rawFixture) as InvokeRequestFixture;
}

async function loadBodyFixture(bodyFixturePath?: string) {
  if (!bodyFixturePath) {
    return undefined;
  }

  const rawFixture = await readFile(bodyFixturePath, 'utf-8');
  return JSON.parse(rawFixture) as unknown;
}

function buildRawQueryString(queryStringParameters?: Record<string, string>) {
  if (!queryStringParameters || Object.keys(queryStringParameters).length === 0) {
    return '';
  }

  return new URLSearchParams(queryStringParameters).toString();
}

function buildEvent(
  lambdaName: SupportedLambdaName,
  registration: LambdaRegistration,
  fixture: InvokeRequestFixture,
  body: unknown,
): APIGatewayProxyEventV2 {
  const method = fixture.method ?? registration.defaultMethod;
  const path = fixture.path ?? registration.defaultPath;
  const queryStringParameters =
    fixture.queryStringParameters &&
    Object.keys(fixture.queryStringParameters).length > 0
      ? fixture.queryStringParameters
      : undefined;
  const pathParameters =
    fixture.pathParameters && Object.keys(fixture.pathParameters).length > 0
      ? fixture.pathParameters
      : undefined;
  const claims = fixture.claims ?? {};
  const requestContext: APIGatewayProxyEventV2['requestContext'] = {
    accountId: 'local',
    apiId: 'local',
    domainName: 'localhost',
    domainPrefix: 'localhost',
    http: {
      method,
      path,
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'local-script',
    },
    requestId: `local-${lambdaName}-request-id`,
    routeKey: `${method} ${path}`,
    stage: '$default',
    time: new Date().toUTCString(),
    timeEpoch: Date.now(),
  };

  (requestContext as APIGatewayProxyEventV2['requestContext'] & {
    authorizer?: {
      jwt: {
        claims: Record<string, string>;
        scopes: string[];
      };
    };
  }).authorizer = {
    jwt: {
      claims,
      scopes: [],
    },
  };

  return {
    version: '2.0',
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: buildRawQueryString(queryStringParameters),
    headers: fixture.headers ?? {},
    requestContext,
    isBase64Encoded: false,
    body: body === undefined || body === null ? undefined : JSON.stringify(body),
    pathParameters,
    queryStringParameters,
    stageVariables: undefined,
    cookies: undefined,
  };
}

function buildContext(lambdaName: SupportedLambdaName): Context {
  return {
    awsRequestId: `local-${lambdaName}-request-id`,
    callbackWaitsForEmptyEventLoop: false,
    functionName: lambdaName,
    functionVersion: '$LATEST',
    invokedFunctionArn: `arn:aws:lambda:local:0:function:${lambdaName}`,
    logGroupName: 'local',
    logStreamName: 'local',
    memoryLimitInMB: '128',
    done: () => undefined,
    fail: () => undefined,
    getRemainingTimeInMillis: () => 1_000,
    succeed: () => undefined,
  };
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function normalizeResponse(response: APIGatewayProxyResultV2 | void) {
  if (response === undefined) {
    return {
      statusCode: null,
      headers: {},
      body: null,
    };
  }

  if (typeof response === 'string') {
    return {
      statusCode: null,
      headers: {},
      body: tryParseJson(response),
    };
  }

  return {
    statusCode: response.statusCode ?? null,
    headers: response.headers ?? {},
    body:
      typeof response.body === 'string' ? tryParseJson(response.body) : response.body,
  };
}

function formatResponse(response: APIGatewayProxyResultV2 | void) {
  return JSON.stringify(normalizeResponse(response), null, 2);
}

async function main() {
  const lambdaName = getLambdaNameArg();
  const registration = REGISTRY[lambdaName];

  if (!registration.implemented || !registration.loadHandler) {
    throw new Error(
      `Lambda "${lambdaName}" is registered for local invocation but its handler has not been implemented yet.`,
    );
  }

  const [fixture, handler] = await Promise.all([
    loadFixture(registration.requestFixturePath),
    registration.loadHandler(),
  ]);

  const body = await loadBodyFixture(registration.bodyFixturePath);
  const event = buildEvent(lambdaName, registration, fixture, body);
  const context = buildContext(lambdaName);
  const response = await handler(event, context, () => undefined);

  console.log(formatResponse(response));
}

void main();
