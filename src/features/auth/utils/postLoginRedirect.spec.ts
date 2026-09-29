import { describe, it, expect, beforeEach } from 'vitest'
import { rememberPostLoginRedirect, safeRedirectPath, takePostLoginRedirect } from './postLoginRedirect'

beforeEach(() => localStorage.clear())

describe('safeRedirectPath', () => {
  it('keeps in-app paths', () => {
    expect(safeRedirectPath('/plans/p1/scenarios/s1/pnl?tab=graphs')).toBe('/plans/p1/scenarios/s1/pnl?tab=graphs')
  })

  it('rejects anything that could leave the app', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/\\evil.com', 'evil.com', '', null, undefined, 42]) {
      expect(safeRedirectPath(bad)).toBeNull()
    }
  })
})

describe('post-login redirect', () => {
  it('is kept until taken, then cleared', () => {
    rememberPostLoginRedirect('/plans/p1')
    expect(takePostLoginRedirect()).toBe('/plans/p1')
    expect(takePostLoginRedirect()).toBe('/')
  })

  it('falls back to the dashboard for missing or unsafe values', () => {
    rememberPostLoginRedirect(undefined)
    expect(takePostLoginRedirect()).toBe('/')
    rememberPostLoginRedirect('//evil.com')
    expect(takePostLoginRedirect()).toBe('/')
  })

  it('ignores a value tampered with in storage', () => {
    localStorage.setItem('magic_link_redirect', 'https://evil.com')
    expect(takePostLoginRedirect()).toBe('/')
  })
})
