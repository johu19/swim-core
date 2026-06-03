import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { updateProfile } from '../services/profile-service.js';
import {
  patchProfileBodySchema,
  PatchProfileBody,
} from '../validations/patch-profile.js';

export const handler = runner(
  async ({ auth, body }) => {
    const profile = await updateProfile({
      cognitoId: auth.cognitoId,
      ...(body as PatchProfileBody),
    });

    return json(200, { profile });
  },
  {
    bodySchema: patchProfileBodySchema,
  },
);
