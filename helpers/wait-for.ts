/**
 * Wait for a condition to be met within the timeout period.
 * @param condition - A function that returns a promise resolving to true when the condition is met.
 * @param out - The object that contains out result of a condition if necessary.
 * @param timeout - Maximum time to wait for the condition to be fulfilled (in milliseconds).
 * @param interval - Time between consecutive condition checks (in milliseconds).
 * @returns A promise resolving to true if the condition is met, or rejecting if the timeout is reached.
 */
export async function waitFor(
    condition: () => Promise<boolean>,
    out: any = null,
    timeout: number = 10_000,
    interval: number = 300
): Promise<void> {
    const startTime = Date.now(); // Track when the wait started

    const poll = async (): Promise<void> => {
        if (Date.now() - startTime >= timeout) {
            throw new Error(`Timeout of ${timeout}ms exceeded while waiting for condition`);
        }

        const result = await condition();
        if (result) {
            return; // Condition met, resolve successfully
        }

        await new Promise(resolve => setTimeout(resolve, interval)); // Wait the interval time
        await poll(); // Retry
    };

    await poll(); // Start polling the condition
}