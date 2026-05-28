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

export function runner<TBody, TPath, TQuery>(
  handlerFn: LambdaHandler<TBody, TPath, TQuery>,
  options: RunnerOptions<TBody, TPath, TQuery> = {},
): APIGatewayProxyHandlerV2 {
  return async (event: APIGatewayProxyEventV2) => {
    try {
      const auth =
        options.authenticationEnabled === false
          ? {
              cognitoId: '',
              email: '',
            }
          : extractAuth(event);
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

      return await handlerFn({
        event,
        auth,
        body,
        path,
        query,
      });
    } catch (error) {
      return handleError(error);
    }
  };
}
