/**
 * Safely extracts an error message from an unknown error type.
 * This is useful for React Query v5 where onError receives unknown type.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}
