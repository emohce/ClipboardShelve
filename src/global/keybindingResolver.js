import { evaluateWhenExpression, getWhenLiteralSets } from './whenExpression.js'

const OVERLAY_CONTEXT_KEYS = [
  'clearDialogOpen',
  'drawerOpen',
  'fullDataOpen',
  'tagSearchOpen',
  'tagEditOpen',
  'pinGroupEditOpen',
  'settingFocus'
]

const SOURCE_WEIGHT = {
  user: 300,
  system: 100,
  defaultSnapshot: 90,
  removed: 0
}

function bindingKey(binding) {
  return binding?.key || binding?.shortcutId || ''
}

function whenSpecificity(when) {
  try {
    return getWhenLiteralSets(when).reduce((max, set) => {
      return Math.max(max, set.positive.size + set.negative.size)
    }, 0)
  } catch (_) {
    return 0
  }
}

function overlayScore(binding, context) {
  if (!binding?.when) return 0
  return OVERLAY_CONTEXT_KEYS.some((key) => context?.[key] === true && String(binding.when).includes(key)) ? 1000 : 0
}

function resolveWeight(binding, index, context) {
  const wildcardPenalty = bindingKey(binding) === '*' ? -500 : 0
  const explicitWeight = Number.isFinite(binding?.weight) ? binding.weight : 100
  const sourceWeight = SOURCE_WEIGHT[binding?.source || 'system'] || 0
  return (
    overlayScore(binding, context) +
    sourceWeight +
    explicitWeight +
    whenSpecificity(binding?.when) +
    wildcardPenalty -
    index / 10000
  )
}

export function resolveKeybinding(bindings, shortcutId, context = {}) {
  const candidates = (bindings || [])
    .map((binding, index) => ({ binding, index }))
    .filter(({ binding }) => {
      if (!binding || binding.disabled === true || binding.enabled === false) return false
      const key = bindingKey(binding)
      if (key !== shortcutId && key !== '*') return false
      try {
        return evaluateWhenExpression(binding.when, context)
      } catch (_) {
        return false
      }
    })
    .sort((a, b) => resolveWeight(b.binding, b.index, context) - resolveWeight(a.binding, a.index, context))

  return candidates[0]?.binding || null
}
