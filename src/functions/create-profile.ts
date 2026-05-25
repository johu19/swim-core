import { json } from '../lib/http.js';
import { createProfile } from '../services/profile-service.js';
import { runner } from '../lib/lambda-runner.js';
import {
  createProfileBodySchema,
  CreateProfileBody,
  CreateProfileInput,
} from '../validations/create-profile.js';

type CreateProfileDependencies = {
  createProfile: (input: CreateProfileInput) => Promise<unknown>;
};

export function buildCreateProfileHandler(
  dependencies: CreateProfileDependencies,
) {
  return runner(
    async ({ auth, body }) => {
      const profile = await dependencies.createProfile({
        cognitoId: auth.cognitoId,
        email: auth.email,
        ...(body as CreateProfileBody),
      });

      return json(201, { profile });
    },
    {
      bodySchema: createProfileBodySchema,
    },
  );
}

export const handler = buildCreateProfileHandler({
  createProfile,
});
