import { z } from 'zod';

export const patchPerformanceBodySchema = z
  .object({
    stroke: z
      .enum(['butterfly', 'backstroke', 'breaststroke', 'freestyle'])
      .optional(),
    distance: z
      .union([
        z.literal(25),
        z.literal(50),
        z.literal(100),
        z.literal(200),
        z.literal(400),
        z.literal(800),
        z.literal(1500),
      ])
      .optional(),
    poolLength: z.union([z.literal(25), z.literal(50)]).optional(),
    poolLengthUnit: z.enum(['yards', 'meters']).optional(),
    timeMs: z.number().int().positive().optional(),
    performedAt: z.iso.date().optional(),
    sourceType: z.enum(['competition', 'training']).optional(),
    effortLevel: z
      .union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
      ])
      .optional(),
    notes: z.string().trim().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one performance field must be provided.',
  });

export type PatchPerformanceBody = z.infer<typeof patchPerformanceBodySchema>;

export type PatchPerformanceInput = PatchPerformanceBody & {
  cognitoId: string;
  performanceId: string;
};
