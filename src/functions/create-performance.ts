import { json } from '../lib/http.js';
import { runner } from '../lib/lambda-runner.js';
import { createPerformance } from '../services/performance-service.js';
import {
  createPerformanceBodySchema,
  CreatePerformanceBody,
} from '../validations/create-performance.js';

export const handler = runner(
  async ({ auth, body }) => {
    const performance = await createPerformance({
      cognitoId: auth.cognitoId,
      ...(body as CreatePerformanceBody),
    });

    return json(201, { performance });
  },
  {
    bodySchema: createPerformanceBodySchema,
  },
);
