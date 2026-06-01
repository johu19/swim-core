import {
  APIGatewayProxyEventV2,
  APIGatewayProxyHandlerV2,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
import { ZodError, ZodType } from 'zod';
import { extractAuth, AuthContext } from './auth.js';
import { AppError, ErrorName, handleError } from './error-handler.js';

export type StructuredParameters<TBody, TPath, TQuery> = {
  event: APIGatewayProxyEventV2;
  auth: AuthContext;
  body: TBody;
  path: TPath;
  query: TQuery;
};

type RunnerOptions<TBody, TPath, TQuery> = {
  authenticationEnabled?: boolean;
  bodySchema?: ZodType<TBody>;
  pathSchema?: ZodType<TPath>;
  querySchema?: ZodType<TQuery>;
};

type LambdaHandler<TBody, TPath, TQuery> = (
  params: StructuredParameters<TBody, TPath, TQuery>,
) => Promise<APIGatewayProxyStructuredResultV2>;

type RequestLogContext = {
  authenticationEnabled: boolean;
  cognitoId: string;
  email: string;
  method: string;
  path: string;
  requestId: string;
};

function formatZodError(error: ZodError, source: string) {
  const [issue] = error.issues;

  if (!issue) {
    return `Invalid ${source}.`;
  }

  const issuePath = issue.path.length > 0 ? issue.path.join('.') : source;
  return `${issuePath}: ${issue.message}`;
}

function parseWithSchema<T>(
  schema: ZodType<T> | undefined,
  input: unknown,
  source: string,
) {
  if (!schema) {
    return undefined as T;
  }

  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(
        ErrorName.PayloadValidation,
        formatZodError(error, source),
        400,
      );
    }

    throw error;
  }
}

function parseBody<T>(rawBody: string | undefined, schema?: ZodType<T>) {
  if (!schema) {
    return undefined as T;
  }

  if (!rawBody) {
    throw new AppError(ErrorName.BadFormat, 'Request body is required.', 400);
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    throw new AppError(
      ErrorName.BadFormat,
      'Request body must be valid JSON.',
      400,
    );
  }

  return parseWithSchema(schema, parsedBody, 'body');
}

function buildRequestLogContext(
  event: APIGatewayProxyEventV2,
  auth: AuthContext,
  authenticationEnabled: boolean,
): RequestLogContext {
  return {
    authenticationEnabled,
    cognitoId: auth.cognitoId,
    email: auth.email,
    method: event.requestContext.http.method,
    path: event.requestContext.http.path,
    requestId: event.requestContext.requestId,
  };
}

function logInfo(message: string, context: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      level: 'info',
      message,
      ...context,
    }),
  );
}

function logError(message: string, context: Record<string, unknown>) {
  console.error(
    JSON.stringify({
      level: 'error',
      message,
      ...context,
    }),
  );
}

function getStatusCode(response: APIGatewayProxyStructuredResultV2) {
  return response.statusCode ?? 200;
}

export function runner<TBody, TPath, TQuery>(
  handlerFn: LambdaHandler<TBody, TPath, TQuery>,
  options: RunnerOptions<TBody, TPath, TQuery> = {},
): APIGatewayProxyHandlerV2 {
  return async (event: APIGatewayProxyEventV2) => {
    const authenticationEnabled = options.authenticationEnabled !== false;
    const startedAt = Date.now();

    try {
      const auth = authenticationEnabled
        ? extractAuth(event)
        : {
            cognitoId: '',
            email: '',
          };
      const requestLogContext = buildRequestLogContext(
        event,
        auth,
        authenticationEnabled,
      );

      logInfo('Lambda request received.', requestLogContext);

      const body = parseBody(event.body, options.bodySchema);
      const path = parseWithSchema(
        options.pathSchema,
        event.pathParameters ?? {},
        'path',
      );
      const query = parseWithSchema(
        options.querySchema,
        event.queryStringParameters ?? {},
        'query',
      );

      const response = await handlerFn({
        event,
        auth,
        body,
        path,
        query,
      });

      logInfo('Lambda request succeeded.', {
        ...requestLogContext,
        durationMs: Date.now() - startedAt,
        statusCode: getStatusCode(response),
      });

      return response;
    } catch (error) {
      const auth = authenticationEnabled
        ? {
            cognitoId: '',
            email: '',
          }
        : {
            cognitoId: '',
            email: '',
          };
      const response = handleError(error);

      logError('Lambda request failed.', {
        ...buildRequestLogContext(event, auth, authenticationEnabled),
        durationMs: Date.now() - startedAt,
        errorMessage: error instanceof Error ? error.message : 'Unknown error.',
        errorName: error instanceof Error ? error.name : 'UnknownError',
        statusCode: response.statusCode ?? 500,
      });

      return response;
    }
  };
}
