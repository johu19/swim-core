import { z } from 'zod';

export const performancePathSchema = z.object({
  performanceId: z.string().trim().min(1),
});

export type PerformancePath = z.infer<typeof performancePathSchema>;
