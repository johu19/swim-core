import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { runner } from '../lib/lambda-runner.js';
import { deletePerformance } from '../services/performance-service.js';
import {
  PerformancePath,
  performancePathSchema,
} from '../validations/performance-path.js';

export const handler = runner(
  async ({ auth, path }) => {
    await deletePerformance(
      auth.cognitoId,
      (path as PerformancePath).performanceId,
    );

    return {
      statusCode: 204,
    } satisfies APIGatewayProxyStructuredResultV2;
  },
  {
    pathSchema: performancePathSchema,
  },
);
