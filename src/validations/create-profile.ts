import { z } from 'zod';

export const createProfileBodySchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  birthDate: z.iso.date(),
  gender: z.enum(['male', 'female']),
  teamName: z.string().trim().min(1),
});

export type CreateProfileBody = z.infer<typeof createProfileBodySchema>;

export type CreateProfileInput = CreateProfileBody & {
  cognitoId: string;
  email: string;
};
