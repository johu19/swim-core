import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { updatePerformance } from '../services/performance-service.js';
import {
  PatchPerformanceBody,
  patchPerformanceBodySchema,
} from '../validations/patch-performance.js';
import {
  PerformancePath,
  performancePathSchema,
} from '../validations/performance-path.js';

export const handler = runner(
  async ({ auth, body, path }) => {
    const performance = await updatePerformance({
      cognitoId: auth.cognitoId,
      performanceId: (path as PerformancePath).performanceId,
      ...(body as PatchPerformanceBody),
    });

    return json(200, { performance });
  },
  {
    bodySchema: patchPerformanceBodySchema,
    pathSchema: performancePathSchema,
  },
);
