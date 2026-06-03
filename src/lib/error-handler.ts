import { json } from './http.js';

export enum ErrorName {
  BadFormat = 'BadFormat',
  PayloadValidation = 'PayloadValidation',
  Unauthorized = 'Unauthorized',
  ProfileNotFound = 'ProfileNotFound',
  PerformanceNotFound = 'PerformanceNotFound',
  Internal = 'Internal',
}

export class AppError extends Error {
  constructor(
    public name: ErrorName,
    message: string,
    public statusCode: number,
  ) {
    super(`${name}: ${message}`);
    this.name = name;
    this.statusCode = statusCode;
  }
}

export function handleError(error: Error | AppError | unknown) {
  if (error instanceof AppError) {
    return json(error.statusCode, {
      error: error.name,
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return json(500, {
      error: ErrorName.Internal,
      message: error.message || 'Unexpected error.',
    });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return json(500, {
      error: ErrorName.Internal,
      message: error.message || 'Unexpected error.',
    });
  }

  return json(500, {
    error: ErrorName.Internal,
    message: 'Unexpected error.',
  });
}
