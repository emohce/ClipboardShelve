import { getWhenLiteralSets } from './whenExpression.js'
import { WHEN_MUTEX_GROUPS } from './whenBuilder.js'
import { dedupeShortcutIds } from './commandKeybindings.js'
import { findReservationConflicts } from './shortcutReservations.js'

const MUTEX_GROUPS = WHEN_MUTEX_GROUPS

function normalizedKey(binding) {
  return String(binding?.key || binding?.shortcutId || '').trim()
}

function setsContradict(a, b) {
  for (const value of a.positive) {
    if (a.negative.has(value) || b.negative.has(value)) return true
  }
  for (const value of b.positive) {
    if (b.negative.has(value) || a.negative.has(value)) return true
  }
  for (const group of MUTEX_GROUPS) {
    const active = group.filter((key) => a.positive.has(key) || b.positive.has(key))
    if (active.length > 1) return true
  }
  return false
}

export function canWhenClausesOverlap(leftWhen, rightWhen) {
  const leftSets = getWhenLiteralSets(leftWhen)
  const rightSets = getWhenLiteralSets(rightWhen)
  return leftSets.some((left) => rightSets.some((right) => !setsContradict(left, right)))
}

export function detectKeybindingConflicts(candidate, bindings) {
  const key = normalizedKey(candidate)
  if (!key) return []
  return (bindings || []).filter((binding) => {
    if (!binding || binding === candidate) return false
    if (normalizedKey(binding) !== key) return false
    return canWhenClausesOverlap(candidate.when, binding.when)
  })
}

function expandRowShortcutIds(row, patch = {}) {
  if (patch.shortcutIds !== undefined) return dedupeShortcutIds(patch.shortcutIds)
  if (patch.shortcutId !== undefined) return dedupeShortcutIds([patch.shortcutId])
  if (Array.isArray(row?.shortcutIds) && row.shortcutIds.length) return dedupeShortcutIds(row.shortcutIds)
  return dedupeShortcutIds([row?.shortcutId].filter(Boolean))
}

function buildConflictCandidateRows(row, patch = {}) {
  const shortcutIds = expandRowShortcutIds(row, patch)
  const when = patch.when === undefined ? row?.when : patch.when
  return shortcutIds.map((shortcutId) => ({
    id: row?.id,
    commandId: row?.commandId,
    key: shortcutId,
    shortcutId,
    when,
    source: 'user'
  }))
}

function buildBindingPoolRows(rows, options = {}) {
  const {
    excludeCommandId = '',
    extraShortcutIds = [],
    extraWhen = '',
    row
  } = options
  const pool = []
  for (const item of rows || []) {
    if (!item) continue
    const ids = Array.isArray(item.shortcutIds) && item.shortcutIds.length ? item.shortcutIds : [item.shortcutId]
    for (const shortcutId of dedupeShortcutIds(ids)) {
      if (!shortcutId) continue
      pool.push({
        id: item.id,
        commandId: item.commandId,
        key: shortcutId,
        shortcutId,
        when: item.when,
        source: item.source,
        disabled: item.disabled
      })
    }
  }
  for (const shortcutId of dedupeShortcutIds(extraShortcutIds)) {
    if (!shortcutId) continue
    pool.push({
      id: row?.id,
      commandId: excludeCommandId || row?.commandId,
      key: shortcutId,
      shortcutId,
      when: extraWhen || row?.when,
      source: 'user'
    })
  }
  return pool
}

export function getShortcutCommandRowConflicts(row, rows, patch = {}) {
  if (!row) return []
  const candidates = buildConflictCandidateRows(row, patch)
  const ownIds = new Set(expandRowShortcutIds(row, patch))
  const conflicts = []
  for (const candidate of candidates) {
    const reservationConflicts = findReservationConflicts(candidate.shortcutId, {
      commandId: row.commandId,
      when: candidate.when
    })
    for (const rule of reservationConflicts) {
      conflicts.push({
        id: `reserved:${rule.commandId}:${candidate.shortcutId}`,
        commandId: rule.commandId,
        commandTitle: rule.description,
        shortcutId: candidate.shortcutId,
        when: rule.when,
        scopeLabel: '保留规则',
        source: 'system',
        sourceLabel: '保留'
      })
    }
    const bindingPool = buildBindingPoolRows(rows, { row }).filter((item) => {
      if (!item || item.id === row.id) return false
      if (row.commandId && item.commandId === row.commandId && ownIds.has(item.shortcutId)) return false
      return true
    })
    const keyConflicts = detectKeybindingConflicts(candidate, bindingPool)
    for (const conflict of keyConflicts) {
      const matched = (rows || []).find((item) => item.id === conflict.id)
      conflicts.push({
        id: conflict.id,
        commandId: matched?.commandId || conflict.commandId,
        commandTitle: matched?.commandTitle || conflict.commandTitle || conflict.commandId,
        shortcutId: candidate.shortcutId,
        when: matched?.when || conflict.when,
        scopeLabel: matched?.scopeLabel || '',
        source: matched?.source || conflict.source,
        sourceLabel: matched?.sourceLabel || ''
      })
    }
  }
  const seen = new Set()
  return conflicts.filter((item) => {
    const key = `${item.commandId}:${item.shortcutId}:${item.when}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function formatShortcutConflictMessage(conflicts, formatShortcut = (id) => id) {
  if (!conflicts?.length) return ''
  const first = conflicts[0]
  const label = formatShortcut(first.shortcutId)
  const target = first.commandTitle || first.commandId || '其他命令'
  if (conflicts.length === 1) return `「${label}」与「${target}」冲突（${first.scopeLabel || first.when || 'when 重叠'}）`
  return `「${label}」与 ${conflicts.length} 个命令冲突`
}
