import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  getRequiredProfileIdClaim,
  MissingProfileIdClaimError,
} from '../lib/auth.js';
import { json } from '../lib/http.js';
import {
  getProfileForAuthenticatedUser,
  ProfileNotFoundError,
} from '../services/profile-service.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const profileId = getRequiredProfileIdClaim(event);
    const profile = await getProfileForAuthenticatedUser(profileId);

    return json(200, { profile });
  } catch (error) {
    if (error instanceof ProfileNotFoundError) {
      return json(404, {
        message: error.message,
      });
    }

    if (error instanceof MissingProfileIdClaimError) {
      return json(400, {
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return json(500, {
        message: error.message || 'Unexpected error while fetching profile.',
      });
    }

    return json(500, {
      message: 'Unknown error while fetching profile.',
    });
  }
};
