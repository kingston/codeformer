import { NotFoundError } from '#src/services/filesystem/errors.js';

/**
 * Handles an error and checks if it's a NotFoundError.
 * If it is, returns undefined. Otherwise, rethrows the error.
 *
 * @param error - The error to handle.
 * @returns undefined if the error is a NotFoundError, otherwise throws the error.
 */
export function handleNotFoundError(error: unknown): undefined {
  if (error instanceof NotFoundError) {
    return undefined;
  }
  throw error;
}
