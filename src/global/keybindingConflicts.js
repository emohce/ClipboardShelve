import { getWhenLiteralSets } from './whenExpression.js'
import { WHEN_MUTEX_GROUPS } from './whenBuilder.js'

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
    if (binding.enabled === false) return false
    if (normalizedKey(binding) !== key) return false
    return canWhenClausesOverlap(candidate.when, binding.when)
  })
}

export function getShortcutCommandRowConflicts(row, rows, patch = {}) {
  if (!row) return []
  const candidate = {
    id: row.id,
    key: patch.shortcutId === undefined ? row.shortcutId : patch.shortcutId,
    when: patch.when === undefined ? row.when : patch.when,
    source: 'user'
  }
  return (rows || [])
    .filter((item) => item && item.id !== row.id && !item.disabled)
    .filter(
      (item) =>
        detectKeybindingConflicts(candidate, [
          { id: item.id, key: item.shortcutId, when: item.when, source: item.source }
        ]).length > 0
    )
}
