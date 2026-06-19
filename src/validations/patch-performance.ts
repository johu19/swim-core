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

export const patchPerformanceBodySchema = z
  .object({
    stroke: performanceStrokeSchema.optional(),
    distance: performanceDistanceSchema.optional(),
    poolLength: z.union([z.literal(25), z.literal(50)]).optional(),
    poolLengthUnit: z.enum(['yards', 'meters']).optional(),
    timeMs: z.number().int().positive().optional(),
    place: performancePlaceSchema.optional(),
    splits: performanceSplitsSchema.optional(),
    performedAt: z.iso.date().optional(),
    sourceType: performanceSourceTypeSchema.optional(),
  })
  .superRefine((body, ctx) => {
    if (
      body.stroke !== undefined &&
      body.distance !== undefined &&
      !isDistanceAllowedForStroke(body.stroke, body.distance)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['distance'],
        message: getStrokeDistanceValidationMessage(body.stroke, body.distance),
      });
    }

    if (
      body.distance !== undefined &&
      body.poolLength !== undefined &&
      !isDistanceAllowedForPoolLength(body.distance, body.poolLength)
    ) {
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
      body.distance !== undefined &&
      body.poolLength !== undefined &&
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
      body.timeMs !== undefined &&
      !hasValidSplitTotal(body.splits, body.timeMs)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['splits'],
        message: getSplitTotalValidationMessage(body.timeMs),
      });
    }

    if (
      body.sourceType !== undefined &&
      body.place !== undefined &&
      !isPlaceAllowedForSourceType(body.sourceType, body.place)
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['place'],
        message: getPlaceSourceTypeValidationMessage(body.sourceType),
      });
    }
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one performance field must be provided.',
  });

export type PatchPerformanceBody = z.infer<typeof patchPerformanceBodySchema>;

export type PatchPerformanceInput = PatchPerformanceBody & {
  cognitoId: string;
  performanceId: string;
};
