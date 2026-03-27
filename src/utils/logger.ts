/**
 * Extracts a human-readable message from an Axios error response.
 *
 * Priority order:
 *   1. error.response.data.error.message  (AppError envelope from Go backend)
 *   2. error.response.data.message        (flat message field)
 *   3. error.message                      (JS Error / network error)
 *   4. fallback
 */
export function extractApiError(err: any, fallback = 'An unexpected error occurred'): string {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.message ||
    fallback
  )
}

/**
 * Dev-only logger. In production builds Vite statically replaces
 * `import.meta.env.DEV` with `false`, so Rollup tree-shakes every branch
 * and no console calls reach the production bundle.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noop = (..._args: unknown[]) => {}

export const devlog = {
  debug: import.meta.env.DEV ? (...args: unknown[]) => console.debug(...args) : noop,
  info:  import.meta.env.DEV ? (...args: unknown[]) => console.info(...args)  : noop,
  warn:  import.meta.env.DEV ? (...args: unknown[]) => console.warn(...args)  : noop,
  error: import.meta.env.DEV ? (...args: unknown[]) => console.error(...args) : noop,
}
