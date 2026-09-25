/**
 * escapeHtml — HTML-escape a value for interpolation into markup built as a
 * string (print popups, generated documents).
 *
 * Every user-controlled string that ends up inside `document.write`,
 * `innerHTML` or a template string rendered as HTML must go through this:
 * product, opex and plan names are free text entered by any editor of a plan,
 * and a popup opened with `window.open('')` runs in the application's origin.
 *
 * Escapes the five characters that can break out of text or attribute
 * context: & < > " '.  `null` / `undefined` become the empty string; other
 * values are stringified first.
 */
const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch)
}
