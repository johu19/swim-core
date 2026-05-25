import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { AppError, ErrorName } from './error-handler';

type JwtClaims = Record<string, string> | undefined;

export type AuthContext = {
  cognitoId: string;
  email: string;
};

function getJwtClaims(event: APIGatewayProxyEventV2): JwtClaims {
  const requestContext =
    event.requestContext as APIGatewayProxyEventV2['requestContext'] & {
      authorizer?: {
        jwt?: {
          claims?: Record<string, string>;
        };
      };
    };

  return requestContext.authorizer?.jwt?.claims;
}

export function extractAuth(event: APIGatewayProxyEventV2): AuthContext {
  const claims = getJwtClaims(event);
  const cognitoId = claims?.sub;
  const email = claims?.email;

  if (!cognitoId) {
    throw new AppError(
      ErrorName.Unauthorized,
      'Missing authenticated user in JWT claims.',
      401,
    );
  } else if (!email) {
    throw new AppError(
      ErrorName.Unauthorized,
      'Missing email claim for authenticated user.',
      401,
    );
  }

  return {
    cognitoId,
    email,
  };
}
