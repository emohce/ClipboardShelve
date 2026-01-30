/**
 * Normalize keyboard events to a canonical shortcut id for binding config.
 * Format: modifier order ctrl, alt, shift, meta (lowercase) + key (special keys as-is, single char lowercased).
 * Examples: "Delete", "ctrl+shift+Delete", "ctrl+f", "Escape"
 */

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta']

/**
 * @param {KeyboardEvent} e
 * @returns {string} shortcutId e.g. "Delete", "ctrl+Backspace", "ctrl+shift+Delete"
 */
const KEY_ALIAS = { ' ': 'Space' }
/** 仅修饰键按下时不再重复加入 key，使 shortcutId 为 "shift"/"ctrl" 等，与绑定 "Shift" 归一化后的 "shift" 一致 */
const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])

export function eventToShortcutId(e) {
  const parts = []
  if (e.ctrlKey) parts.push('ctrl')
  if (e.altKey) parts.push('alt')
  if (e.shiftKey) parts.push('shift')
  if (e.metaKey) parts.push('meta')
  let key = e.key
  if (key && MODIFIER_KEYS.has(key)) return parts.join('+') // 单按修饰键时只输出修饰符，便于匹配绑定 "Shift" 等
  if (key && KEY_ALIAS[key] !== undefined) key = KEY_ALIAS[key]
  else if (key && key.length === 1) key = key.toLowerCase()
  if (key) parts.push(key)
  return parts.join('+')
}

/**
 * @param {string} shortcutId
 * @returns {{ ctrl: boolean, alt: boolean, shift: boolean, meta: boolean, key: string }}
 */
export function parseShortcutId(shortcutId) {
  const result = { ctrl: false, alt: false, shift: false, meta: false, key: '' }
  if (!shortcutId || typeof shortcutId !== 'string') return result
  const parts = shortcutId.split('+').map((p) => p.trim())
  for (const p of parts) {
    const lower = p.toLowerCase()
    if (lower === 'ctrl') result.ctrl = true
    else if (lower === 'alt') result.alt = true
    else if (lower === 'shift') result.shift = true
    else if (lower === 'meta') result.meta = true
    else if (p.length > 0) result.key = p
  }
  return result
}

/**
 * Normalize a shortcutId from config (e.g. "Shift+Delete") to match eventToShortcutId output.
 * @param {string} shortcutId
 * @returns {string}
 */
export function normalizeShortcutId(shortcutId) {
  const parsed = parseShortcutId(shortcutId)
  const parts = []
  if (parsed.ctrl) parts.push('ctrl')
  if (parsed.alt) parts.push('alt')
  if (parsed.shift) parts.push('shift')
  if (parsed.meta) parts.push('meta')
  let key = parsed.key
  if (key && key.length === 1) key = key.toLowerCase()
  if (key) parts.push(key)
  return parts.join('+')
}
