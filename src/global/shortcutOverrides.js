import { migrateToCommandOverrides, normalizeOverrideValueShape } from './commandKeybindings.js'

export function normalizeShortcutOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const raw = Object.entries(value).reduce((acc, [key, overrideValue]) => {
    if (!key || overrideValue === undefined) return acc
    if (overrideValue === null || typeof overrideValue === 'string') {
      acc[key] = overrideValue
      return acc
    }
    if (overrideValue && typeof overrideValue === 'object' && !Array.isArray(overrideValue)) {
      acc[key] = { ...overrideValue }
    }
    return acc
  }, {})
  const migrated = migrateToCommandOverrides(raw)
  return Object.entries(migrated).reduce((acc, [key, overrideValue]) => {
    if (overrideValue === null) {
      acc[key] = null
      return acc
    }
    const shape = normalizeOverrideValueShape(overrideValue)
    const payload = { shortcutIds: shape.shortcutIds, enabled: shape.enabled }
    if (shape.when) payload.when = shape.when
    acc[key] = payload
    return acc
  }, {})
}
