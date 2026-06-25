const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  info: (message: string, meta?: unknown) => {
    // Disabled to prevent info logs in the terminal
  },
  warn: (message: string, meta?: unknown) => {
    // Disabled to prevent warning logs in the terminal
  },
  error: (message: string, meta?: unknown) => {
    console.error(`[ERROR] ${message}`, meta ?? '')
  },
}
