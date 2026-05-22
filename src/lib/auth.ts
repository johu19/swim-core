import { APIGatewayProxyEventV2 } from 'aws-lambda';

type JwtClaims = Record<string, string> | undefined;

export class MissingProfileIdClaimError extends Error {
  constructor() {
    super('Missing authenticated profile id in JWT claims.');
  }
}

function getJwtClaims(event: APIGatewayProxyEventV2): JwtClaims {
  const requestContext = event.requestContext as APIGatewayProxyEventV2['requestContext'] & {
    authorizer?: {
      jwt?: {
        claims?: Record<string, string>;
      };
    };
  };

  return requestContext.authorizer?.jwt?.claims;
}

export function getRequiredProfileIdClaim(event: APIGatewayProxyEventV2) {
  const profileId = getJwtClaims(event)?.sub;

  if (!profileId) {
    throw new MissingProfileIdClaimError();
  }

  return profileId;
}
