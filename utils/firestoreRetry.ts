/**
 * Retry a Firestore operation with exponential backoff
 * @param fn - The async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param onRetry - Optional callback when retrying
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    onRetry?: (attempt: number) => void
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Don't retry on certain errors
            if (error instanceof Error) {
                // Permission denied, not found, etc. - don't retry
                if (error.message.includes('permission-denied') ||
                    error.message.includes('not-found')) {
                    throw error;
                }
            }

            // Last attempt - throw the error
            if (attempt === maxRetries - 1) {
                throw lastError;
            }

            // Exponential backoff: 1s, 2s, 4s
            const delay = 1000 * Math.pow(2, attempt);

            if (onRetry) {
                onRetry(attempt + 1);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Wrapper for Firestore operations with automatic retry and error handling
 */
export async function safeFirestoreOperation<T>(
    operation: () => Promise<T>,
    errorMessage = 'Une erreur est survenue'
): Promise<T | null> {
    try {
        return await withRetry(operation);
    } catch (error) {
        console.error(errorMessage, error);
        return null;
    }
}
