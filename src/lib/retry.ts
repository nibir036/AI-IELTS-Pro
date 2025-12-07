
/**
 * A utility function to retry an async operation with exponential backoff.
 * @param operation The async function to execute.
 * @param options Configuration for retries, delay, and a filter for which errors to retry on.
 * @returns A Promise that resolves with the result of the operation.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    retryOn?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, retryOn = () => true } = options;

  let lastError: any;

  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (retryOn(error)) {
        // This is a retryable error, wait and try again.
        const backoffDelay = delay * Math.pow(2, i);
        console.log(`Operation failed. Retrying in ${backoffDelay}ms... (Attempt ${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      } else {
        // This is not a retryable error, throw immediately.
        throw error;
      }
    }
  }

  // If all retries fail, throw the last captured error.
  console.error("Operation failed after all retries.");
  throw lastError;
}

/**
 * A specific error filter for the withRetry function that checks for
 * common transient network or service overload errors from Google AI.
 * @param error The error object to inspect.
 * @returns True if the error is retryable.
 */
export function isRetryableGoogleAIError(error: any): boolean {
  if (typeof error?.message === 'string') {
    return (
      error.message.includes('429') || // Rate limit exceeded
      error.message.includes('503') || // Service unavailable
      error.message.includes('Service Unavailable') ||
      error.message.includes('The model is overloaded') ||
      error.message.includes('Failed to fetch')
    );
  }
  return false;
}
