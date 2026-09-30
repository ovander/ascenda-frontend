// Build-time checks for the Socrate settings baked into the bundle.
//
// VITE_SOCRATE_BASE_URL is Socrate's issuer: the SPA sends users to
// `${base}/oauth/authorize`, and the backend compares the token's iss with the
// same value exactly. A trailing slash is rejected rather than stripped, as in
// the backend (SOCRATE_BASE_URL), so both sides always hold the same string.
// VITE_SOCRATE_REDIRECT_URI must be absolute: Socrate matches redirect URIs
// exactly, with no wildcards.
//
// Used by vite.config.ts (the build fails on any error) and unit-tested; it
// imports nothing, so both the app and the Node build can load it.

export type SocrateEnv = Partial<
  Record<'VITE_SOCRATE_BASE_URL' | 'VITE_SOCRATE_CLIENT_ID' | 'VITE_SOCRATE_REDIRECT_URI', string>
>

// The WHATWG parser is lenient: it reads "http:httpd://host/callback" as host
// "httpd". Require the literal scheme and "//" as well.
function absoluteHttpURL(value: string): boolean {
  if (!/^https?:\/\/[^/]/i.test(value)) return false
  try {
    const u = new URL(value)
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.host !== ''
  } catch {
    return false
  }
}

/**
 * Returns one message per problem, or an empty list. With `production`, the
 * three Socrate values are required; otherwise only values that are set are
 * checked (local development may run without Socrate).
 */
export function socrateEnvErrors(env: SocrateEnv, production: boolean): string[] {
  const errors: string[] = []
  const base = env.VITE_SOCRATE_BASE_URL?.trim() ?? ''
  const clientId = env.VITE_SOCRATE_CLIENT_ID?.trim() ?? ''
  const redirect = env.VITE_SOCRATE_REDIRECT_URI?.trim() ?? ''

  if (production) {
    if (!base) errors.push('VITE_SOCRATE_BASE_URL is required')
    if (!clientId) errors.push('VITE_SOCRATE_CLIENT_ID is required')
    if (!redirect) errors.push('VITE_SOCRATE_REDIRECT_URI is required')
  }
  if (base) {
    if (!absoluteHttpURL(base)) {
      errors.push(`VITE_SOCRATE_BASE_URL must be an absolute http(s) URL, got "${base}"`)
    } else if (base.endsWith('/')) {
      errors.push(`VITE_SOCRATE_BASE_URL must not end with / (it is the issuer), got "${base}"`)
    }
  }
  if (redirect && !absoluteHttpURL(redirect)) {
    errors.push(`VITE_SOCRATE_REDIRECT_URI must be an absolute http(s) URL, got "${redirect}"`)
  }
  return errors
}
