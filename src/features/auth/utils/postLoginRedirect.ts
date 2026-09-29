/**
 * postLoginRedirect — where to send the user after a magic-link sign-in.
 *
 * The e-mailed link usually opens in a new tab, where sessionStorage is empty,
 * so the destination is kept in localStorage between asking for the link and
 * clicking it. Only an in-app path is kept (no scheme, host or protocol-
 * relative "//"), so a crafted ?redirect= cannot send the user off-site.
 */
const KEY = 'magic_link_redirect'

export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  return value
}

export function rememberPostLoginRedirect(value: unknown): void {
  const path = safeRedirectPath(value)
  try {
    if (path && path !== '/') localStorage.setItem(KEY, path)
    else localStorage.removeItem(KEY)
  } catch {
    // Storage unavailable (private mode, blocked): the user lands on the dashboard.
  }
}

export function takePostLoginRedirect(): string {
  try {
    const path = safeRedirectPath(localStorage.getItem(KEY))
    localStorage.removeItem(KEY)
    return path ?? '/'
  } catch {
    return '/'
  }
}
