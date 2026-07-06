/**
 * Normalize keyboard shortcuts to compact semantic ids.
 * Format: c/s/a modifiers + key token, separated by "-".
 * Examples: "del", "c-s-del", "c-f", "cr", "left".
 */

const MODIFIER_ORDER = ['c', 's', 'a']
const MODIFIER_ALIAS = {
  c: 'c',
  ctrl: 'c',
  control: 'c',
  cmd: 'c',
  command: 'c',
  meta: 'c',
  s: 's',
  shift: 's',
  a: 'a',
  alt: 'a',
  option: 'a'
}

const LEGACY_MODIFIER_DISPLAY = {
  c: 'Ctrl',
  s: 'Shift',
  a: 'Alt'
}

const KEY_ALIAS = {
  ' ': 'space',
  spacebar: 'space',
  space: 'space',
  tab: 'tab',
  enter: 'cr',
  return: 'cr',
  cr: 'cr',
  escape: 'esc',
  esc: 'esc',
  delete: 'del',
  del: 'del',
  backspace: 'backspace',
  arrowleft: 'left',
  left: 'left',
  arrowright: 'right',
  right: 'right',
  arrowup: 'up',
  up: 'up',
  arrowdown: 'down',
  down: 'down',
  pageup: 'pageup',
  pgup: 'pageup',
  pagedown: 'pagedown',
  pgdn: 'pagedown'
}

const KEY_DISPLAY = {
  cr: 'Enter',
  esc: 'Esc',
  del: 'Delete',
  backspace: 'Backspace',
  tab: 'Tab',
  space: 'Space',
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  pageup: 'PageUp',
  pagedown: 'PageDown'
}

const COMPACT_TO_LEGACY_KEY = {
  cr: 'Enter',
  esc: 'Escape',
  del: 'Delete',
  backspace: 'Backspace',
  tab: 'Tab',
  space: 'Space',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  pageup: 'PageUp',
  pagedown: 'PageDown'
}

const CODE_ALIAS = {
  Space: 'space',
  Digit0: '0',
  Digit1: '1',
  Digit2: '2',
  Digit3: '3',
  Digit4: '4',
  Digit5: '5',
  Digit6: '6',
  Digit7: '7',
  Digit8: '8',
  Digit9: '9'
}

const WINDOWS_SHIFTED_PUNCTUATION_CODE_ALIAS = {
  Comma: ',',
  Period: '.'
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])
const FIXED_MAIN_KEY_TOKENS = new Set(['tab', 'space'])
const INTERNAL_MODIFIER_EVENT_IDS = new Set(['mod-c', 'mod-s', 'mod-a'])
const MODIFIER_EVENT_ID_BY_KEY = {
  Shift: 'mod-s',
  Control: 'mod-c',
  Alt: 'mod-a',
  Meta: 'mod-c'
}

function keyFromCode(code) {
  if (!code) return null
  if (CODE_ALIAS[code] !== undefined) return CODE_ALIAS[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase()
  if (/^F\d{1,2}$/.test(code)) return code.toLowerCase()
  return null
}

function keyFromWindowsShiftedPunctuationCode(code) {
  if (!code) return null
  return WINDOWS_SHIFTED_PUNCTUATION_CODE_ALIAS[code] ?? null
}

function isWindowsPlatform() {
  try {
    const osPlatform = typeof window !== 'undefined' ? window.exports?.os?.platform?.() : ''
    if (osPlatform) return osPlatform === 'win32'
  } catch (_) {}
  try {
    if (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform || '')) return true
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.platform) return process.platform === 'win32'
  } catch (_) {}
  return false
}

function shouldUseWindowsShiftedPunctuationKey(e, key, codeKey) {
  if (!codeKey || !e?.shiftKey || !isWindowsPlatform()) return false
  return normalizeKeyToken(key) !== codeKey
}

function normalizeKeyToken(token) {
  if (token == null) return ''
  const raw = String(token).trim()
  if (!raw) return ''
  const lower = raw.toLowerCase()
  if (KEY_ALIAS[lower]) return KEY_ALIAS[lower]
  if (/^f\d{1,2}$/.test(lower)) return lower
  if (raw.length === 1) return raw.toLowerCase()
  return lower
}

function orderedModifierParts(modifiers) {
  return MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier))
}

function buildShortcutId(modifiers, key) {
  const parts = orderedModifierParts(modifiers)
  const normalizedKey = normalizeKeyToken(key)
  if (normalizedKey) parts.push(normalizedKey)
  return parts.join('-')
}

export function parseCompactShortcutId(shortcutId) {
  const result = { ctrl: false, alt: false, shift: false, meta: false, key: '', valid: false }
  if (!shortcutId || typeof shortcutId !== 'string') return result
  const raw = shortcutId.trim()
  if (!raw) return result

  const separator = raw.includes('+') ? '+' : '-'
  const parts = raw.split(separator).map((part) => part.trim()).filter(Boolean)
  if (!parts.length) return result

  const modifiers = new Set()
  let key = ''
  const compactWithKey = separator === '-' && parts.length > 1
  const modifierParts = compactWithKey ? parts.slice(0, -1) : parts
  for (const part of modifierParts) {
    const lower = part.toLowerCase()
    const modifier = MODIFIER_ALIAS[lower]
    if (modifier) {
      modifiers.add(modifier)
      continue
    }
    key = normalizeKeyToken(part)
  }
  if (compactWithKey) key = normalizeKeyToken(parts[parts.length - 1])

  result.ctrl = modifiers.has('c')
  result.meta = false
  result.shift = modifiers.has('s')
  result.alt = modifiers.has('a')
  result.key = key
  result.valid = Boolean(modifiers.size || key)
  return result
}

/**
 * @param {KeyboardEvent|object} e
 * @returns {string} compact shortcut id, e.g. "del", "c-s-del"
 */
export function eventToShortcutId(e) {
  const modifiers = new Set()
  if (e?.ctrlKey || e?.metaKey) modifiers.add('c')
  if (e?.shiftKey) modifiers.add('s')
  if (e?.altKey) modifiers.add('a')

  let key = e?.key || ''
  if (key && MODIFIER_KEYS.has(key)) return MODIFIER_EVENT_ID_BY_KEY[key] || ''

  const shiftedPunctuationKey = keyFromWindowsShiftedPunctuationCode(e?.code)
  if (shouldUseWindowsShiftedPunctuationKey(e, key, shiftedPunctuationKey)) key = shiftedPunctuationKey

  const codeKey = keyFromCode(e?.code)
  if (codeKey != null && (e?.altKey || key.length !== 1 || key === ' ')) key = codeKey

  return buildShortcutId(modifiers, key)
}

/**
 * @param {string} shortcutId
 * @returns {{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean, key: string }}
 */
export function parseShortcutId(shortcutId) {
  const parsed = parseCompactShortcutId(normalizeShortcutId(shortcutId))
  return {
    ctrl: parsed.ctrl,
    alt: parsed.alt,
    shift: parsed.shift,
    meta: false,
    key: parsed.key
  }
}

/**
 * Normalize legacy ids like "ctrl+shift+Delete" and compact ids like "c-s-del".
 * @param {string} shortcutId
 * @returns {string}
 */
export function normalizeShortcutId(shortcutId) {
  if (shortcutId == null) return ''
  const raw = String(shortcutId).trim()
  if (!raw) return ''
  if (raw === '*') return '*'
  if (INTERNAL_MODIFIER_EVENT_IDS.has(raw)) return raw
  const parsed = parseCompactShortcutId(raw)
  if (!parsed.valid) return ''
  const modifiers = new Set()
  if (parsed.ctrl || parsed.meta) modifiers.add('c')
  if (parsed.shift) modifiers.add('s')
  if (parsed.alt) modifiers.add('a')
  return buildShortcutId(modifiers, parsed.key)
}

export function legacyToCompactShortcutId(shortcutId) {
  return normalizeShortcutId(shortcutId)
}

export function compactToLegacyShortcutId(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized || normalized === '*') return normalized
  if (normalized === 'mod-c') return 'Control'
  if (normalized === 'mod-s') return 'Shift'
  if (normalized === 'mod-a') return 'Alt'
  const parsed = parseCompactShortcutId(normalized)
  const parts = []
  if (parsed.ctrl) parts.push('ctrl')
  if (parsed.alt) parts.push('alt')
  if (parsed.shift) parts.push('shift')
  const key = COMPACT_TO_LEGACY_KEY[parsed.key] || parsed.key
  if (key) parts.push(key)
  return parts.join('+')
}

export function getShortcutMainKeyToken(shortcutId) {
  return parseCompactShortcutId(normalizeShortcutId(shortcutId)).key
}

export function isFixedMainKeyToken(keyToken) {
  return FIXED_MAIN_KEY_TOKENS.has(normalizeKeyToken(keyToken))
}

export function isShortcutIdFixedNonConfigurable(shortcutId) {
  return isFixedMainKeyToken(getShortcutMainKeyToken(shortcutId))
}

export function isMacPlatform() {
  if (typeof window !== 'undefined' && window.exports?.utools?.isMacOs?.()) return true
  if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) return true
  return false
}

/**
 * Convert compact shortcut ids like "c-a-f" to UI labels.
 * On macOS, `c` is shown as `Command` and `a` as `Option`.
 * @param {string} shortcutId
 * @returns {string}
 */
export function formatShortcutDisplay(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return ''
  if (normalized === '*') return '*'
  if (normalized === 'mod-c') return isMacPlatform() ? 'Command' : 'Ctrl'
  if (normalized === 'mod-s') return 'Shift'
  if (normalized === 'mod-a') return isMacPlatform() ? 'Option' : 'Alt'

  const parsed = parseCompactShortcutId(normalized)
  const useMacLabels = isMacPlatform()
  const modifierDisplay = {
    ...LEGACY_MODIFIER_DISPLAY,
    c: useMacLabels ? 'Command' : 'Ctrl',
    a: useMacLabels ? 'Option' : 'Alt'
  }
  const parts = []
  for (const modifier of MODIFIER_ORDER) {
    if (modifier === 'c' && parsed.ctrl) parts.push(modifierDisplay.c)
    if (modifier === 's' && parsed.shift) parts.push(modifierDisplay.s)
    if (modifier === 'a' && parsed.alt) parts.push(modifierDisplay.a)
  }
  if (parsed.key) parts.push(KEY_DISPLAY[parsed.key] || parsed.key.toUpperCase())
  return parts.join('+')
}

/**
 * Format shortcut ID in compact cross-platform format (e.g., "s-esc" instead of "Shift+Esc").
 * @param {string} shortcutId
 * @returns {string}
 */
export function formatShortcutDisplayCompact(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return ''
  if (normalized === '*') return '*'
  if (normalized === 'mod-c') return 'mod-c'
  if (normalized === 'mod-s') return 'mod-s'
  if (normalized === 'mod-a') return 'mod-a'
  return normalized
}

/**
 * Replace shortcut text inside feature descriptions for platform-aware display.
 * @param {string} text
 * @returns {string}
 */
export function formatShortcutTextForPlatform(text) {
  if (!text) return ''
  if (!isMacPlatform()) return text
  return String(text)
    .replace(/\bCtrl\b/g, 'Command')
    .replace(/\bAlt\b/g, 'Option')
}
