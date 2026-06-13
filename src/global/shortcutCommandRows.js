import { getCommandById } from './commandDefaults.js'

export const SHORTCUT_SOURCE_LABELS = {
  system: '系统',
  user: '用户',
  defaultSnapshot: '默认快照',
  removed: '已禁用'
}

const LAYER_SCOPE_LABELS = {
  main: '主界面',
  setting: '设置页',
  'clear-dialog': '清除对话框',
  'clip-drawer': '剪贴板抽屉',
  'full-data-overlay': '全文预览',
  'tag-search': '标签搜索',
  'tag-edit': '标签编辑',
  'pin-group-edit': '置顶组合编辑'
}

export const OPERATION_SHORTCUT_COMMANDS = {
  copy: ['list.item.copyOnly'],
  paste: ['list.item.copyPaste'],
  view: ['list.item.openFull'],
  collect: ['list.item.collectToggle'],
  'un-collect': ['list.item.collectToggle'],
  'edit-tags': ['list.item.editTagOrAlias'],
  remove: ['list.item.delete']
}

export function getShortcutScopeLabel(layer, state) {
  if (layer === 'main' && state === 'search') return '主界面（搜索中）'
  return LAYER_SCOPE_LABELS[layer] || layer || '未分组'
}

export function buildShortcutCommandRows(bindings, getFeatureLabel = (featureId) => featureId, getCommand = getCommandById) {
  return (bindings || []).flatMap((binding, bindingIndex) => {
    const featureIds = Array.isArray(binding.features) ? binding.features : [binding.features].filter(Boolean)
    const commandIds = Array.isArray(binding.commands) ? binding.commands : []
    const commands = commandIds.length ? commandIds : featureIds
    return commands.map((commandId, commandIndex) => {
      const featureId = featureIds[commandIndex] || featureIds[0] || ''
      const command = getCommand(commandId) || getCommandById(commandId)
      const title = getFeatureLabel(featureId) || command?.title || commandId
      return {
        id: `${binding.layer || 'unknown'}:${binding.state || ''}:${binding.shortcutId || ''}:${commandId}:${bindingIndex}:${commandIndex}`,
        commandId,
        commandTitle: title,
        commandDescription: command?.description || title,
        category: command?.category || 'other',
        risk: command?.risk || 'normal',
        shortcutId: binding.shortcutId || '',
        key: binding.shortcutId || '',
        when: binding.when || '',
        defaultWhen: binding.defaultWhen || binding.when || '',
        source: binding.source || 'system',
        sourceLabel: SHORTCUT_SOURCE_LABELS[binding.source || 'system'] || binding.source || '系统',
        disabled: binding.disabled === true || binding.source === 'removed',
        defaultShortcutId: binding.defaultShortcutId || binding.shortcutId || '',
        overrideKey: binding.overrideKey || '',
        layer: binding.layer || '',
        state: binding.state || '',
        scopeLabel: getShortcutScopeLabel(binding.layer, binding.state),
        featureId,
        binding
      }
    })
  })
}

export function filterShortcutCommandRows(rows, options = {}) {
  const {
    keyword = '',
    scope = 'all',
    formatShortcut = (shortcutId) => shortcutId
  } = options
  const normalizedKeyword = String(keyword || '').trim().toLowerCase()
  const scopedRows = (rows || []).filter((row) => {
    if (scope === 'all') return true
    if (scope === 'main') return row.layer === 'main'
    if (scope === 'dialog') return row.layer !== 'main'
    if (scope === 'user') return row.source === 'user' || row.source === 'removed'
    if (scope === 'risk') return row.risk === 'data-write'
    return true
  })
  if (!normalizedKeyword) return scopedRows

  return scopedRows.filter((row) =>
    [
      row.commandTitle,
      row.commandId,
      row.shortcutId,
      formatShortcut(row.shortcutId),
      row.when,
      row.sourceLabel,
      row.scopeLabel,
      row.featureId
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(normalizedKeyword))
  )
}

export function findOperationShortcutRows(operationId, shortcutRows) {
  const commandIds = OPERATION_SHORTCUT_COMMANDS[operationId] || []
  if (!commandIds.length) return []
  const commandSet = new Set(commandIds)
  return (shortcutRows || []).filter((row) => commandSet.has(row.commandId))
}

export function getOperationShortcutSummary(operationId, shortcutRows, formatShortcut = (shortcutId) => shortcutId) {
  const rows = findOperationShortcutRows(operationId, shortcutRows)
  if (!rows.length) {
    return {
      count: 0,
      activeCount: 0,
      label: '无直接快捷键',
      query: '',
      hint: '可通过功能按钮或动态抽屉序号执行'
    }
  }
  const visibleRows = rows.filter((row) => row.disabled !== true)
  const labelRows = visibleRows.length ? visibleRows : rows
  return {
    count: rows.length,
    activeCount: visibleRows.length,
    label: labelRows
      .slice(0, 2)
      .map((row) => formatShortcut(row.shortcutId))
      .filter(Boolean)
      .join(' / ') || '已禁用',
    query: rows[0].commandId,
    hint: '点击查看或修改对应 command 快捷键'
  }
}

export function buildShortcutOverrideValue(row, patch = {}) {
  if (!row) return undefined
  const nextShortcutId = patch.shortcutId === undefined ? row.shortcutId : patch.shortcutId
  const nextWhen = patch.when === undefined ? row.when : patch.when
  const value = {}
  if (nextShortcutId && nextShortcutId !== row.defaultShortcutId) value.shortcutId = nextShortcutId
  if (typeof nextWhen === 'string' && nextWhen.trim() !== row.defaultWhen) value.when = nextWhen.trim()
  return Object.keys(value).length ? value : undefined
}

export function applyShortcutOverrideValue(overrides, row, overrideValue) {
  if (!row?.overrideKey) return { ...(overrides || {}) }
  const next = { ...(overrides || {}) }
  if (overrideValue === undefined) delete next[row.overrideKey]
  else next[row.overrideKey] = overrideValue
  return next
}

export function disableShortcutOverride(overrides, row) {
  return applyShortcutOverrideValue(overrides, row, null)
}
