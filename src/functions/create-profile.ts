import { json } from '../lib/http.js';
import { createProfile } from '../services/profile-service.js';
import { runner } from '../lib/lambda-runner.js';
import { createProfileBodySchema, CreateProfileBody } from '../validations/create-profile.js';

export const handler = runner(
  async ({ auth, body }) => {
    const profile = await createProfile({
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
