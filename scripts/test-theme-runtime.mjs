import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const themeModulePath = new URL('../src/global/theme.js', import.meta.url)
const source = await readFile(themeModulePath, 'utf8')
const themeModule = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`)

function createClassList() {
  const classes = new Set()
  return {
    classes,
    toggle(name, force) {
      if (force) classes.add(name)
      else classes.delete(name)
    },
    contains(name) {
      return classes.has(name)
    }
  }
}

function createRoot() {
  const attrs = new Map()
  return {
    attrs,
    style: {},
    classList: createClassList(),
    setAttribute(name, value) {
      attrs.set(name, String(value))
    },
    getAttribute(name) {
      return attrs.get(name) || null
    }
  }
}

function createMedia(matches = false) {
  const listeners = new Set()
  return {
    get matches() {
      return matches
    },
    setMatches(next) {
      matches = next
      const event = { matches }
      listeners.forEach((listener) => listener(event))
    },
    addEventListener(type, listener) {
      if (type === 'change') listeners.add(listener)
    },
    removeEventListener(type, listener) {
      if (type === 'change') listeners.delete(listener)
    },
    listenerCount() {
      return listeners.size
    }
  }
}

assert.equal(themeModule.normalizeThemePreference('dark'), 'dark')
assert.equal(themeModule.normalizeThemePreference('system'), 'system')
assert.equal(themeModule.normalizeThemePreference('invalid'), 'light')
assert.equal(themeModule.normalizeThemePreference(undefined), 'light')

{
  const root = createRoot()
  const result = themeModule.applyThemePreference('dark', { root })

  assert.deepEqual(result, { preference: 'dark', effectiveTheme: 'dark' })
  assert.equal(root.getAttribute('data-theme'), 'dark')
  assert.equal(root.classList.contains('dark'), true)
  assert.equal(root.style.colorScheme, 'dark')
}

{
  const root = createRoot()
  const media = createMedia(true)
  const result = themeModule.applyThemePreference('system', {
    root,
    matchMedia: () => media
  })

  assert.deepEqual(result, { preference: 'system', effectiveTheme: 'dark' })
  assert.equal(root.getAttribute('data-theme'), 'dark')
  assert.equal(root.classList.contains('dark'), true)
}

{
  const root = createRoot()
  const media = createMedia(false)
  const stop = themeModule.bindThemePreference(
    () => 'system',
    {
      root,
      matchMedia: () => media
    }
  )

  assert.equal(root.getAttribute('data-theme'), 'light')
  assert.equal(media.listenerCount(), 1)

  media.setMatches(true)
  assert.equal(root.getAttribute('data-theme'), 'dark')
  assert.equal(root.classList.contains('dark'), true)

  stop()
  assert.equal(media.listenerCount(), 0)
}

console.log('theme runtime tests passed')
