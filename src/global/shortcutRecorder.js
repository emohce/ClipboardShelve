import { normalizeShortcutId } from './shortcutKey.js'

/** 不可绑定为命令快捷键的固定按键（归一化 shortcutId，后续可扩充） */
export const NON_CONFIGURABLE_SHORTCUT_IDS = [
  'Escape',
  'Enter',
  'ctrl+c',
  'ctrl+r',
  'ArrowLeft',
  'ArrowRight'
]

const NON_CONFIGURABLE_SHORTCUT_SET = new Set(
  NON_CONFIGURABLE_SHORTCUT_IDS.map((shortcutId) => normalizeShortcutId(shortcutId))
)

/** 设置页内固定快捷键说明（悬浮提示用） */
export const SETTING_PAGE_FIXED_SHORTCUTS = [
  { shortcutId: 'Escape', description: '关闭当前弹窗（不退出设置页）' },
  { shortcutId: 'ArrowLeft', description: '切换到上一个 Tab' },
  { shortcutId: 'ArrowRight', description: '切换到下一个 Tab' },
  { shortcutId: 'ArrowUp', description: '设置页向上滚动' },
  { shortcutId: 'ArrowDown', description: '设置页向下滚动' },
  { shortcutId: 'ctrl+f', description: '聚焦命令搜索框' }
]

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

export function isNonConfigurableShortcutId(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  return Boolean(normalized && NON_CONFIGURABLE_SHORTCUT_SET.has(normalized))
}

export function isRecordableShortcutId(shortcutId) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return false
  if (MODIFIER_SHORTCUTS.has(normalized)) return false
  if (isNonConfigurableShortcutId(normalized)) return false
  return true
}
