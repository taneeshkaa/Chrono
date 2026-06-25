interface RetryOptions {
  retries: number
  delay: number
  exponential?: boolean
}

export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const { retries, delay, exponential = true } = options
  let lastError: unknown

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (i === retries) break

      const waitTime = exponential ? delay * Math.pow(2, i) : delay
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }

  throw lastError
}
