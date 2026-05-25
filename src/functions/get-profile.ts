import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { getProfile } from '../services/profile-service.js';

type GetProfileDependencies = {
  getProfile: (cognitoId: string) => Promise<unknown>;
};

export function buildGetProfileHandler(dependencies: GetProfileDependencies) {
  return runner(async ({ auth }) => {
    const profile = await dependencies.getProfile(auth.cognitoId);

    return json(200, { profile });
  });
}

export const handler = buildGetProfileHandler({
  getProfile,
});
