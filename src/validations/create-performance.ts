import { z } from 'zod';

export const createPerformanceBodySchema = z.object({
  stroke: z.enum(['butterfly', 'backstroke', 'breaststroke', 'freestyle']),
  distance: z.union([
    z.literal(25),
    z.literal(50),
    z.literal(100),
    z.literal(200),
    z.literal(400),
    z.literal(800),
    z.literal(1500),
  ]),
  poolLength: z.union([z.literal(25), z.literal(50)]),
  poolLengthUnit: z.enum(['yards', 'meters']),
  timeMs: z.number().int().positive(),
  performedAt: z.iso.date(),
  sourceType: z.enum(['competition', 'training']),
  effortLevel: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  notes: z.string().trim(),
});

export type CreatePerformanceBody = z.infer<typeof createPerformanceBodySchema>;

export type CreatePerformanceInput = CreatePerformanceBody & {
  cognitoId: string;
};
