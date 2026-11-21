/** How many ratings go out at once: enough to be quick, not a burst of 30. */
export const SEND_BATCH_SIZE = 4

/**
 * Sends each item, a few at a time, and waits for all of them whatever
 * happens: one refusal never stops the others (#235). Returns why each failed
 * one did not go through, by its key.
 */
export async function sendEach<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  send: (item: T) => Promise<unknown>,
  batchSize = SEND_BATCH_SIZE,
): Promise<Map<string, unknown>> {
  const failures = new Map<string, unknown>()
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize)
    const results = await Promise.allSettled(batch.map(send))
    batch.forEach((item, index) => {
      const result = results[index]
      if (result?.status === "rejected") failures.set(keyOf(item), result.reason)
    })
  }
  return failures
}
