import { getCommandById } from './commandDefaults.js'
import { getOperationShortcutSummary } from './shortcutCommandRows.js'

export const ALIAS_CONTEXT_MENU_ACTION_ID = 'edit-alias'

export const ALIAS_CONTEXT_MENU_ACTION = {
  id: ALIAS_CONTEXT_MENU_ACTION_ID,
  title: '别名编辑',
  icon: '🏷️',
  commandId: 'list.item.editTagOrAlias',
  risk: 'data-write',
  source: 'system',
  orderable: false
}

const OPERATION_COMMAND_MAP = {
  copy: 'list.item.copyOnly',
  paste: 'list.item.copyPaste',
  view: 'list.item.openFull',
  collect: 'list.item.collectToggle',
  'un-collect': 'list.item.collectToggle',
  'edit-tags': 'list.item.editTagOrAlias',
  'line-join': 'list.item.joinLines',
  'line-surround-join': 'list.item.surroundJoinLines',
  'line-surround': 'list.item.surroundLines',
  remove: 'list.item.delete'
}

function normalizeOperation(operation = {}) {
  const commandId = operation.commandId || OPERATION_COMMAND_MAP[operation.id] || ''
  const command = commandId ? getCommandById(commandId) : null
  return {
    ...operation,
    commandId,
    risk: operation.risk || command?.risk || 'normal',
    source: operation.source || 'operation',
    orderable: operation.orderable !== false
  }
}

function getActionShortcutSummary(action, shortcutRows = [], formatShortcut) {
  const operationSummary = getOperationShortcutSummary(action.id, shortcutRows, formatShortcut)
  if (operationSummary.count || !action.commandId) return operationSummary
  const rows = (shortcutRows || []).filter((row) => row.commandId === action.commandId)
  if (!rows.length) return operationSummary
  const visibleRows = rows.filter((row) => row.disabled !== true)
  const labelRows = visibleRows.length ? visibleRows : rows
  const formatter = formatShortcut || ((shortcutId) => shortcutId)
  return {
    count: rows.length,
    activeCount: visibleRows.length,
    label: labelRows
      .slice(0, 2)
      .map((row) => formatter(row.shortcutId))
      .filter(Boolean)
      .join(' / ') || '已禁用',
    query: rows[0].commandId,
    hint: '点击查看或修改对应 command 快捷键'
  }
}

export function applyContextMenuOrder(actions, drawerOrder = []) {
  const list = (actions || []).filter(Boolean)
  if (!Array.isArray(drawerOrder) || !drawerOrder.length) return list
  const orderSet = new Set(drawerOrder)
  const ordered = drawerOrder
    .map((id) => list.find((action) => action.id === id))
    .filter(Boolean)
  const remaining = list.filter((action) => !orderSet.has(action.id))
  return [...ordered, ...remaining]
}

export function insertAliasContextMenuAction(actions) {
  const list = (actions || []).filter((action) => action?.id !== ALIAS_CONTEXT_MENU_ACTION_ID)
  list.splice(Math.min(1, list.length), 0, { ...ALIAS_CONTEXT_MENU_ACTION })
  return list
}

export function buildDrawerMenuItems(options = {}) {
  const { item, operations = [], filterOperate = () => true, drawerOrder = [] } = options
  if (!item) return []
  const available = operations
    .filter((operation) => filterOperate(operation, item, false, 'drawer'))
    .map((operation) => normalizeOperation(operation))
  return insertAliasContextMenuAction(applyContextMenuOrder(available, drawerOrder))
}

export function buildContextMenuActionRows(options = {}) {
  const { operations = [], drawerOrder = [], shortcutRows = [], formatShortcut } = options
  const ordered = insertAliasContextMenuAction(
    applyContextMenuOrder(
      operations.map((operation) => normalizeOperation(operation)),
      drawerOrder
    )
  )
  return ordered.map((action, index) => ({
    ...action,
    defaultIndex: index + 1,
    currentIndex: index + 1,
    sourceLabel: action.source === 'system' ? '系统' : '功能',
    riskLabel: action.risk === 'data-write' ? '写入' : '普通',
    shortcutSummary: getActionShortcutSummary(action, shortcutRows, formatShortcut)
  }))
}

export function getContextMenuActionByIndex(actions = [], number) {
  const normalizedNumber = Number(number)
  const index = Number.isInteger(normalizedNumber) ? normalizedNumber - 1 : -1
  if (index < 0 || index >= actions.length) {
    return {
      ok: false,
      action: null,
      index,
      number: normalizedNumber,
      reason: 'out-of-range'
    }
  }
  return {
    ok: true,
    action: actions[index],
    index,
    number: normalizedNumber
  }
}

export function buildContextMenuDrawerOrderFromRows(rows = []) {
  return (rows || [])
    .filter((row) => row?.orderable !== false && row?.id)
    .map((row) => row.id)
}

export function getContextMenuActionSummary(rows = []) {
  const directCount = rows.filter((row) => row.shortcutSummary?.count > 0).length
  return `右键菜单 ${rows.length} 项，${directCount} 项可直接跳转到 command 快捷键。`
}
