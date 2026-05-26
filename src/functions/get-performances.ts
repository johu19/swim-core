import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { getPerformances } from '../services/performance-service.js';

export const handler = runner(async ({ auth }) => {
  const performances = await getPerformances(auth.cognitoId);

  return json(200, { performances });
});
