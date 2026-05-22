export type CreateProfileInput = {
  email: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: 'male' | 'female';
  teamName: string;
};

export class CreateProfileValidationError extends Error {}

const ALLOWED_GENDERS = new Set<CreateProfileInput['gender']>([
  'male',
  'female',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRequiredString(
  payload: Record<string, unknown>,
  fieldName: keyof CreateProfileInput,
) {
  const value = payload[fieldName];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CreateProfileValidationError(
      `Field "${fieldName}" must be a non-empty string.`,
    );
  }

  return value.trim();
}

function validateBirthDate(value: string) {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new CreateProfileValidationError(
      'Field "birthDate" must be a valid ISO date string.',
    );
  }

  return value;
}

function validateEmail(value: string) {
  if (!value.includes('@')) {
    throw new CreateProfileValidationError(
      'Field "email" must be a valid email address.',
    );
  }

  return value;
}

function validateGender(value: string): CreateProfileInput['gender'] {
  if (!ALLOWED_GENDERS.has(value as CreateProfileInput['gender'])) {
    throw new CreateProfileValidationError(
      'Field "gender" must be either "male" or "female".',
    );
  }

  return value as CreateProfileInput['gender'];
}

export function validateCreateProfileBody(body: string | undefined) {
  if (!body) {
    throw new CreateProfileValidationError('Request body is required.');
  }

  let parsedBody: unknown;

  try {
    parsedBody = JSON.parse(body);
  } catch {
    throw new CreateProfileValidationError('Request body must be valid JSON.');
  }

  if (!isRecord(parsedBody)) {
    throw new CreateProfileValidationError('Request body must be a JSON object.');
  }

  return {
    email: validateEmail(getRequiredString(parsedBody, 'email')),
    firstName: getRequiredString(parsedBody, 'firstName'),
    lastName: getRequiredString(parsedBody, 'lastName'),
    birthDate: validateBirthDate(getRequiredString(parsedBody, 'birthDate')),
    gender: validateGender(getRequiredString(parsedBody, 'gender')),
    teamName: getRequiredString(parsedBody, 'teamName'),
  } satisfies CreateProfileInput;
}
