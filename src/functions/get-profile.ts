import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { getOrCreateProfile } from '../services/profile-service.js';

export const handler = runner(async ({ auth }) => {
  const profile = await getOrCreateProfile(auth.cognitoId, auth.email);

  return json(200, { profile });
});
