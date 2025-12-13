import { APP_CONFIG } from "../config";
import { Logger } from "winston";
import { LoggerProvider } from "../services/logger-provider";

const logger = LoggerProvider.create("retry-utility");

export interface RetryOptions {
  maxAttempts?: number;
  backoffBaseMs?: number;
  backoffMaxMs?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn - The function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = APP_CONFIG.RETRY.MAX_ATTEMPTS,
    backoffBaseMs = APP_CONFIG.RETRY.BACKOFF_BASE_MS,
    backoffMaxMs = APP_CONFIG.RETRY.BACKOFF_MAX_MS,
    retryableErrors = [
      "socket hang up",
      "ECONNRESET",
      "ETIMEDOUT",
      "timeout",
      "ENOTFOUND",
      "ECONNREFUSED",
    ],
    onRetry,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;

      // Check if it's a retryable error
      const isRetryable = retryableErrors.some((retryableError) =>
        errorMessage.includes(retryableError)
      );

      if (isRetryable && attempt < maxAttempts) {
        const delayMs = Math.min(
          backoffBaseMs * Math.pow(2, attempt - 1),
          backoffMaxMs
        );

        logger.warn(
          `Operation failed (attempt ${attempt}/${maxAttempts}): ${errorMessage}. Retrying in ${delayMs}ms...`
        );

        if (onRetry) {
          onRetry(attempt, lastError);
        }

        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      // If not retryable or last attempt, throw the error
      throw lastError;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error("Operation failed after retries");
}
