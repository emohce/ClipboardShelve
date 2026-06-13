export function normalizeShortcutOverrides(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.entries(value).reduce((acc, [key, overrideValue]) => {
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
}
