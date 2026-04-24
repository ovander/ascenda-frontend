#!/usr/bin/env node
/**
 * check-i18n.mjs
 *
 * Static analysis: extract every t('key') / $t('key') call from Vue/TS source files
 * and verify that each key exists in both en.json and fr.json locale catalogs.
 *
 * Usage:
 *   node scripts/check-i18n.mjs
 *   node scripts/check-i18n.mjs --fix      (not implemented — for future use)
 *
 * Exit codes:
 *   0 — all keys found in both catalogs
 *   1 — one or more missing keys detected
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname, '..')

// ── Config ────────────────────────────────────────────────────────────────────

const SRC_DIR    = join(ROOT, 'src')
const LOCALE_DIR = join(ROOT, 'src', 'locales')
const LOCALES    = ['en', 'fr']

/**
 * Keys that are intentionally dynamic (computed at runtime) and cannot be
 * statically extracted.  Add patterns here to suppress false positives.
 */
const DYNAMIC_KEY_PATTERNS = [
  /^enums\.planStatus\./,   // t(`enums.planStatus.${status}`, status)
  /^enums\.tier\./,
  /^ai\.features\./,        // ai.features.*.label — built from AI_FEATURES registry
  /^fiplan\.label\./,       // future: might be dynamic
  /^fiplan\.tooltip\./,
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Flatten a nested JSON object into dot-separated keys */
function flattenKeys(obj, prefix = '') {
  const keys = []
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full))
    } else {
      keys.push(full)
    }
  }
  return keys
}

/** Recursively walk a directory and return file paths matching an extension list */
function walkDir(dir, exts = ['.vue', '.ts', '.js']) {
  const results = []
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      results.push(...walkDir(full, exts))
    } else if (exts.some(e => full.endsWith(e))) {
      results.push(full)
    }
  }
  return results
}

/**
 * Extract i18n keys from source text.
 *
 * Matches:
 *  t('some.key')
 *  t("some.key")
 *  $t('some.key')
 *  $t("some.key")
 *  t(`some.key`)   ← template literals with no interpolation
 *
 * Does NOT match:
 *  emit('update:visible')  — `t` at end of `emit`
 *  digest('SHA-256')       — `t` at end of `digest`
 *  format('value')         — `t` at end of `format`
 *  Dynamic expressions like t(`prefix.${variable}`)
 *
 * The key word boundary check: the `t` or `$t` call must NOT be immediately
 * preceded by another word character (a-z, A-Z, 0-9, _).
 */
function extractKeys(source) {
  const keys = new Set()

  // Static string keys: t('x') / $t("x")
  // (?<!\w) ensures the `t` is not the end of a longer identifier like `emit`
  const staticRe = /(?<!\w)\$?t\(\s*['"`]([^'"`${}]+?)['"`]\s*[,)]/g
  let m
  while ((m = staticRe.exec(source)) !== null) {
    keys.add(m[1])
  }

  return [...keys]
}

// ── Load catalogs ─────────────────────────────────────────────────────────────

const catalogs = {}
for (const locale of LOCALES) {
  const raw = readFileSync(join(LOCALE_DIR, `${locale}.json`), 'utf8')
  catalogs[locale] = new Set(flattenKeys(JSON.parse(raw)))
}

// ── Scan source files ─────────────────────────────────────────────────────────

const sourceFiles = walkDir(SRC_DIR)
const allFindings = []  // { file, key, missingIn: string[] }

for (const file of sourceFiles) {
  // Skip spec/test files, test helpers, and the locale files themselves
  if (file.includes('.spec.') || file.includes('.test.') || file.startsWith(LOCALE_DIR)) continue
  if (file.includes('/test/') || file.includes('/__tests__/') || file.includes('/fixtures')) continue

  const source = readFileSync(file, 'utf8')
  const keys = extractKeys(source)

  for (const key of keys) {
    // Skip known dynamic patterns
    if (DYNAMIC_KEY_PATTERNS.some(re => re.test(key))) continue

    const missingIn = LOCALES.filter(locale => !catalogs[locale].has(key))
    if (missingIn.length > 0) {
      allFindings.push({ file: file.replace(ROOT + '/', ''), key, missingIn })
    }
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

if (allFindings.length === 0) {
  console.log('✅  All i18n keys found in every locale catalog.')
  process.exit(0)
}

// Group by key for a cleaner report
const byKey = {}
for (const { file, key, missingIn } of allFindings) {
  if (!byKey[key]) byKey[key] = { files: [], missingIn }
  byKey[key].files.push(file)
}

console.error(`\n❌  ${Object.keys(byKey).length} missing i18n key(s) detected:\n`)
for (const [key, { files, missingIn }] of Object.entries(byKey)) {
  console.error(`  Key:       ${key}`)
  console.error(`  Missing in: ${missingIn.join(', ')}`)
  console.error(`  Used in:`)
  for (const f of files) console.error(`    - ${f}`)
  console.error()
}

process.exit(1)
