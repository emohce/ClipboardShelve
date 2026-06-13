import { normalizeShortcutId } from './shortcutKey.js'

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

const KEY_ALIAS = {
  ' ': 'Space',
  Esc: 'Escape',
  Del: 'Delete'
}

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta'])
const MODIFIER_SHORTCUTS = new Set(['ctrl', 'alt', 'shift', 'meta', 'ctrl+alt', 'ctrl+shift', 'ctrl+meta', 'alt+shift', 'alt+meta', 'shift+meta', 'ctrl+alt+shift', 'ctrl+alt+meta', 'ctrl+shift+meta', 'alt+shift+meta', 'ctrl+alt+shift+meta'])

function keyFromCode(code) {
  if (!code) return null
  if (CODE_ALIAS[code] !== undefined) return CODE_ALIAS[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase()
  return null
}

export function eventLikeToShortcutId(eventLike) {
  const parts = []
  if (eventLike?.ctrlKey) parts.push('ctrl')
  if (eventLike?.altKey) parts.push('alt')
  if (eventLike?.shiftKey) parts.push('shift')
  if (eventLike?.metaKey) parts.push('meta')

  let key = eventLike?.key || ''
  if (MODIFIER_KEYS.has(key)) return normalizeShortcutId(parts.join('+'))

  const codeKey = keyFromCode(eventLike?.code)
  if (codeKey != null && (eventLike?.altKey || key.length !== 1)) key = codeKey

  if (KEY_ALIAS[key] !== undefined) key = KEY_ALIAS[key]
  else if (key && key.length === 1) key = key.toLowerCase()

  if (key) parts.push(key)
  return normalizeShortcutId(parts.join('+'))
}

export function isRecordableShortcutId(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return false
  return !MODIFIER_SHORTCUTS.has(normalized)
}
