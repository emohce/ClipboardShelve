/**
 * Normalize keyboard events to a canonical shortcut id for binding config.
 * Format: modifier order ctrl, alt, shift, meta (lowercase) + key (special keys as-is, single char lowercased).
 * Examples: "Delete", "ctrl+shift+Delete", "ctrl+f", "Escape"
 */

const MODIFIER_ORDER = ['ctrl', 'alt', 'shift', 'meta']
const DISPLAY_TOKEN_MAP = {
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  meta: 'Meta'
}
const CODE_ALIAS = {
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

function keyFromCode(code) {
  if (!code) return null
  if (CODE_ALIAS[code] !== undefined) return CODE_ALIAS[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase()
  return null
}

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
  // macOS 下按 Option+数字/字母时，event.key 可能变成特殊字符，这里优先用物理按键位还原。
  if (e.altKey) {
    const codeKey = keyFromCode(e.code)
    if (codeKey != null) key = codeKey
  }
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

export function isMacPlatform() {
  if (typeof window !== 'undefined' && window.exports?.utools?.isMacOs?.()) return true
  if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) return true
  return false
}

/**
 * Convert canonical shortcut ids like "ctrl+alt+f" to UI labels.
 * On macOS, `alt` is shown as `Option`.
 * @param {string} shortcutId
 * @returns {string}
 */
export function formatShortcutDisplay(shortcutId) {
  if (!shortcutId) return ''
  const parts = String(shortcutId)
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)

  if (!parts.length) return ''

  const useMacLabels = isMacPlatform()
  return parts
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower === 'alt' && useMacLabels) return 'Option'
      return DISPLAY_TOKEN_MAP[lower] || part
    })
    .join('+')
}

/**
 * Replace shortcut text inside feature descriptions for platform-aware display.
 * Currently only maps Alt -> Option on macOS.
 * @param {string} text
 * @returns {string}
 */
export function formatShortcutTextForPlatform(text) {
  if (!text) return ''
  if (!isMacPlatform()) return text
  return String(text).replace(/\bAlt\b/g, 'Option')
}
