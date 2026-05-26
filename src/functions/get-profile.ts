import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { getProfile } from '../services/profile-service.js';

export const handler = runner(async ({ auth }) => {
  const profile = await getProfile(auth.cognitoId);

  return json(200, { profile });
});
