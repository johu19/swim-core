import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import {
  getRequiredProfileIdClaim,
  MissingProfileIdClaimError,
} from '../lib/auth.js';
import { json } from '../lib/http.js';
import {
  createProfileForAuthenticatedUser,
  ProfileAlreadyExistsError,
} from '../services/profile-service.js';
import {
  CreateProfileValidationError,
  validateCreateProfileBody,
} from '../validations/create-profile.js';

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const profileId = getRequiredProfileIdClaim(event);
    const payload = validateCreateProfileBody(event.body);
    const profile = await createProfileForAuthenticatedUser(profileId, payload);

    return json(201, { profile });
  } catch (error) {
    if (error instanceof ProfileAlreadyExistsError) {
      return json(409, {
        message: error.message,
      });
    }

    if (
      error instanceof CreateProfileValidationError ||
      error instanceof MissingProfileIdClaimError
    ) {
      return json(400, {
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return json(500, {
        message: error.message || 'Unexpected error while creating profile.',
      });
    }

    return json(500, {
      message: 'Unknown error while creating profile.',
    });
  }
};
