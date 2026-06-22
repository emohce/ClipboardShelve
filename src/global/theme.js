export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'
export const THEME_SYSTEM = 'system'
export const THEME_VALUES = [THEME_LIGHT, THEME_DARK, THEME_SYSTEM]

const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function getRoot(root) {
  if (root) return root
  if (typeof document === 'undefined') return null
  return document.documentElement
}

function getMatchMedia(matchMedia) {
  if (typeof matchMedia === 'function') return matchMedia
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  return window.matchMedia.bind(window)
}

export function normalizeThemePreference(value) {
  return THEME_VALUES.includes(value) ? value : THEME_LIGHT
}

export function resolveThemePreference(preference, options = {}) {
  const normalized = normalizeThemePreference(preference)
  if (normalized !== THEME_SYSTEM) return normalized

  const matchMedia = getMatchMedia(options.matchMedia)
  const media = matchMedia?.(DARK_MEDIA_QUERY)
  return media?.matches ? THEME_DARK : THEME_LIGHT
}

export function applyThemePreference(preference, options = {}) {
  const root = getRoot(options.root)
  const normalized = normalizeThemePreference(preference)
  const effectiveTheme = resolveThemePreference(normalized, options)

  if (root) {
    root.setAttribute('data-theme', effectiveTheme)
    root.classList?.toggle?.('dark', effectiveTheme === THEME_DARK)
    if (root.style) root.style.colorScheme = effectiveTheme
  }

  return {
    preference: normalized,
    effectiveTheme
  }
}

export function bindThemePreference(getPreference, options = {}) {
  const matchMedia = getMatchMedia(options.matchMedia)
  const media = matchMedia?.(DARK_MEDIA_QUERY)
  const apply = () => applyThemePreference(getPreference?.(), options)

  apply()

  if (!media) return () => {}

  media.addEventListener?.('change', apply)
  media.addListener?.(apply)

  return () => {
    media.removeEventListener?.('change', apply)
    media.removeListener?.(apply)
  }
}
