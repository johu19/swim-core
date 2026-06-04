import { z } from 'zod';

export const patchProfileBodySchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    birthDate: z.iso.date().optional(),
    gender: z.enum(['male', 'female']).optional(),
    teamName: z.string().trim().min(1).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one profile field must be provided.',
  });

export type PatchProfileBody = z.infer<typeof patchProfileBodySchema>;

export type PatchProfileInput = PatchProfileBody & {
  cognitoId: string;
};
