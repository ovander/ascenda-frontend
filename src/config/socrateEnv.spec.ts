import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { socrateEnvErrors } from './socrateEnv'

const valid = {
  VITE_SOCRATE_BASE_URL: 'https://socrate.vandermoten.eu',
  VITE_SOCRATE_CLIENT_ID: 'VowmSxfnObxDKFvdk1Lucg',
  VITE_SOCRATE_REDIRECT_URI: 'https://ascenda.vandermoten.eu/callback',
}

describe('socrateEnvErrors', () => {
  it('accepts a complete production configuration', () => {
    expect(socrateEnvErrors(valid, true)).toEqual([])
  })

  it('rejects an issuer with a trailing slash instead of stripping it', () => {
    const errors = socrateEnvErrors({ ...valid, VITE_SOCRATE_BASE_URL: 'https://socrate.vandermoten.eu/' }, true)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('must not end with /')
  })

  it('rejects a malformed or relative redirect URI', () => {
    for (const bad of ['http:httpd://ascenda.vandermoten.eu/callback', '/callback']) {
      const errors = socrateEnvErrors({ ...valid, VITE_SOCRATE_REDIRECT_URI: bad }, true)
      expect(errors.join()).toContain('VITE_SOCRATE_REDIRECT_URI must be an absolute http(s) URL')
    }
  })

  it('rejects a base URL that is not http(s)', () => {
    expect(socrateEnvErrors({ ...valid, VITE_SOCRATE_BASE_URL: 'socrate.vandermoten.eu' }, true).join()).toContain(
      'VITE_SOCRATE_BASE_URL must be an absolute http(s) URL',
    )
  })

  it('requires the three values in production only', () => {
    expect(socrateEnvErrors({}, true)).toHaveLength(3)
    expect(socrateEnvErrors({}, false)).toEqual([])
  })

  it('passes on the committed .env.production', () => {
    const env = Object.fromEntries(
      readFileSync('.env.production', 'utf8')
        .split('\n')
        .filter((line) => /^[A-Z_]+=/.test(line))
        .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
    )
    expect(socrateEnvErrors(env, true)).toEqual([])
  })
})
