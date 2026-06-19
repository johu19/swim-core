import { z } from 'zod';
import {
  getDistancePoolLengthValidationMessage,
  getPlaceSourceTypeValidationMessage,
  getSplitCountValidationMessage,
  getSplitTotalValidationMessage,
  getStrokeDistanceValidationMessage,
  hasValidSplitCount,
  hasValidSplitTotal,
  isPlaceAllowedForSourceType,
  isDistanceAllowedForPoolLength,
  isDistanceAllowedForStroke,
  performanceDistanceSchema,
  performancePlaceSchema,
  performanceSourceTypeSchema,
  performanceSplitsSchema,
  performanceStrokeSchema,
} from './performance-fields.js';

export const createPerformanceBodySchema = z
  .object({
    stroke: performanceStrokeSchema,
    distance: performanceDistanceSchema,
    poolLength: z.union([z.literal(25), z.literal(50)]),
    poolLengthUnit: z.enum(['yards', 'meters']),
    timeMs: z.number().int().positive(),
    place: performancePlaceSchema.optional(),
    splits: performanceSplitsSchema.optional(),
    performedAt: z.iso.date(),
    sourceType: performanceSourceTypeSchema,
  })
  .superRefine((body, ctx) => {
    if (!isDistanceAllowedForStroke(body.stroke, body.distance)) {
      ctx.addIssue({
        code: 'custom',
        path: ['distance'],
        message: getStrokeDistanceValidationMessage(body.stroke, body.distance),
      });
    }

    if (!isDistanceAllowedForPoolLength(body.distance, body.poolLength)) {
      ctx.addIssue({
        code: 'custom',
        path: ['distance'],
        message: getDistancePoolLengthValidationMessage(
          body.distance,
          body.poolLength,
        ),
      });
    }

    if (
      body.splits !== undefined &&
      !hasValidSplitCount(body.splits, body.distance, body.poolLength)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['splits'],
        message: getSplitCountValidationMessage(body.distance, body.poolLength),
      });
    }

    if (
      body.splits !== undefined &&
      !hasValidSplitTotal(body.splits, body.timeMs)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['splits'],
        message: getSplitTotalValidationMessage(body.timeMs),
      });
    }

    if (!isPlaceAllowedForSourceType(body.sourceType, body.place)) {
      ctx.addIssue({
        code: 'custom',
        path: ['place'],
        message: getPlaceSourceTypeValidationMessage(body.sourceType),
      });
    }
  });

export type CreatePerformanceBody = z.infer<typeof createPerformanceBodySchema>;

export type CreatePerformanceInput = CreatePerformanceBody & {
  cognitoId: string;
};
