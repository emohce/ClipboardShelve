import { canWhenClausesOverlap } from './keybindingConflicts.js'
import { normalizeShortcutId } from './shortcutKey.js'

/** @type {Array<{ shortcutId: string, commandId: string, when: string, description: string, scope?: string }>} */
export const SHORTCUT_RESERVATION_RULES = [
  { shortcutId: 'Escape', commandId: 'main.escape', when: 'mainFocus', description: '主界面退出搜索/有锁条件', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'dialog.clear.close', when: 'clearDialogOpen', description: '关闭清除对话框', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'drawer.close', when: 'drawerOpen', description: '关闭剪贴板抽屉', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'preview.full.close', when: 'fullDataOpen', description: '关闭全文预览', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'tag.search.close', when: 'tagSearchOpen', description: '关闭标签搜索', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'tag.edit.close', when: 'tagEditOpen', description: '关闭标签编辑', scope: 'system' },
  { shortcutId: 'Escape', commandId: 'pin.group.edit.close', when: 'pinGroupEditOpen', description: '关闭置顶组合编辑', scope: 'system' },
  { shortcutId: 'Enter', commandId: 'list.item.copyPaste', when: 'mainFocus && !inputFocus', description: '粘贴选中项', scope: 'system' },
  { shortcutId: 'Enter', commandId: 'dialog.clear.confirm', when: 'clearDialogOpen', description: '确认清除对话框', scope: 'system' },
  { shortcutId: 'Enter', commandId: 'drawer.select', when: 'drawerOpen', description: '选择抽屉项', scope: 'system' },
  { shortcutId: 'ctrl+c', commandId: 'list.item.copyOnly', when: 'mainFocus', description: '复制选中项', scope: 'system' },
  { shortcutId: 'ctrl+r', commandId: 'main.tab.next', when: 'mainFocus', description: '系统刷新保留（浏览器）', scope: 'system' },
  { shortcutId: 'ArrowLeft', commandId: 'setting.tab.prev', when: 'settingFocus && !inputFocus', description: '设置页上一个 Tab', scope: 'setting-ui' },
  { shortcutId: 'ArrowRight', commandId: 'setting.tab.next', when: 'settingFocus && !inputFocus', description: '设置页下一个 Tab', scope: 'setting-ui' },
  { shortcutId: 'ArrowUp', commandId: 'setting.scroll.up', when: 'settingFocus', description: '设置页向上滚动', scope: 'setting-ui' },
  { shortcutId: 'ArrowDown', commandId: 'setting.scroll.down', when: 'settingFocus', description: '设置页向下滚动', scope: 'setting-ui' },
  { shortcutId: 'ctrl+f', commandId: 'search.focus', when: 'mainFocus', description: '主界面聚焦搜索', scope: 'setting-ui' }
]

const MODIFIER_SHORTCUTS = new Set([
  'ctrl',
  'alt',
  'shift',
  'meta',
  'ctrl+alt',
  'ctrl+shift',
  'ctrl+meta',
  'alt+shift',
  'alt+meta',
  'shift+meta',
  'ctrl+alt+shift',
  'ctrl+alt+meta',
  'ctrl+shift+meta',
  'alt+shift+meta',
  'ctrl+alt+shift+meta'
])

export function getShortcutReservationRows() {
  return SHORTCUT_RESERVATION_RULES.map((rule) => ({ ...rule }))
}

export function findReservationConflicts(shortcutId, { commandId = '', when = '' } = {}) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return []
  const overlappingRules = SHORTCUT_RESERVATION_RULES.filter((rule) => {
    if (normalizeShortcutId(rule.shortcutId) !== normalized) return false
    return canWhenClausesOverlap(when, rule.when)
  })
  if (!overlappingRules.length) return []
  if (overlappingRules.some((rule) => rule.commandId === commandId)) return []
  return overlappingRules.filter((rule) => rule.commandId !== commandId)
}

export function isShortcutAssignable(shortcutId, { commandId = '', when = '' } = {}) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) {
    return { allowed: false, reason: 'invalid-shortcut' }
  }
  if (MODIFIER_SHORTCUTS.has(normalized)) {
    return { allowed: false, reason: 'modifier-only' }
  }
  const conflicts = findReservationConflicts(normalized, { commandId, when })
  if (conflicts.length) {
    return { allowed: false, reason: 'reserved', rules: conflicts }
  }
  return { allowed: true }
}

export function isRecordableShortcutId(shortcutId, context = null) {
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return false
  if (MODIFIER_SHORTCUTS.has(normalized)) return false
  if (context && typeof context === 'object') {
    return isShortcutAssignable(normalized, context).allowed
  }
  return true
}

export function isNonConfigurableShortcutId(shortcutId, context = null) {
  if (context && typeof context === 'object') {
    return !isShortcutAssignable(shortcutId, context).allowed
  }
  const normalized = normalizeShortcutId(shortcutId)
  if (!normalized) return false
  return SHORTCUT_RESERVATION_RULES.some((rule) => normalizeShortcutId(rule.shortcutId) === normalized)
}

/** @deprecated use SHORTCUT_RESERVATION_RULES */
export const NON_CONFIGURABLE_SHORTCUT_IDS = [
  'Escape',
  'Enter',
  'ctrl+c',
  'ctrl+r',
  'ArrowLeft',
  'ArrowRight'
]

/** @deprecated use SHORTCUT_RESERVATION_RULES */
export const SETTING_PAGE_FIXED_SHORTCUTS = SHORTCUT_RESERVATION_RULES.filter((rule) => rule.scope === 'setting-ui').map(
  (rule) => ({
    shortcutId: rule.shortcutId,
    description: rule.description
  })
)
