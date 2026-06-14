import { HOTKEY_BINDINGS, bindingKey, getCommandAwareBindings } from './hotkeyBindings.js'
import { compactToLegacyShortcutId, normalizeShortcutId } from './shortcutKey.js'

export const COMMAND_OVERRIDE_PREFIX = 'cmd:'

export function getCommandOverrideKey(commandId) {
  return commandId ? `${COMMAND_OVERRIDE_PREFIX}${commandId}` : ''
}

export function isCommandOverrideKey(key) {
  return typeof key === 'string' && key.startsWith(COMMAND_OVERRIDE_PREFIX)
}

export function parseCommandOverrideKey(key) {
  if (!isCommandOverrideKey(key)) return ''
  return key.slice(COMMAND_OVERRIDE_PREFIX.length)
}

export function dedupeShortcutIds(ids) {
  const seen = new Set()
  const result = []
  for (const id of ids || []) {
    const normalized = normalizeShortcutId(id)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export function normalizeOverrideValueShape(overrideValue) {
  if (overrideValue === null) return { enabled: false, shortcutIds: [] }
  if (typeof overrideValue === 'string') {
    const shortcutId = normalizeShortcutId(overrideValue)
    return shortcutId ? { shortcutIds: [shortcutId], enabled: true } : { enabled: true, shortcutIds: [] }
  }
  if (!overrideValue || typeof overrideValue !== 'object' || Array.isArray(overrideValue)) {
    return { enabled: true, shortcutIds: [] }
  }
  const shortcutIds = dedupeShortcutIds(
    Array.isArray(overrideValue.shortcutIds)
      ? overrideValue.shortcutIds
      : overrideValue.shortcutId
        ? [overrideValue.shortcutId]
        : []
  )
  const enabled = overrideValue.enabled !== false
  const value = { shortcutIds, enabled }
  if (typeof overrideValue.when === 'string' && overrideValue.when.trim()) {
    value.when = overrideValue.when.trim()
  }
  return value
}

export function getDefaultShortcutIdsForCommand(commandId, bindings = getCommandAwareBindings(HOTKEY_BINDINGS)) {
  const ids = []
  for (const binding of bindings) {
    const commands = Array.isArray(binding.commands) ? binding.commands : []
    if (!commands.includes(commandId)) continue
    const shortcutId = normalizeShortcutId(binding.defaultShortcutId || binding.shortcutId)
    if (shortcutId) ids.push(shortcutId)
  }
  return dedupeShortcutIds(ids)
}

function buildBindingOverrideKeyMap(bindings = getCommandAwareBindings(HOTKEY_BINDINGS)) {
  const map = new Map()
  for (const binding of HOTKEY_BINDINGS) {
    const key = bindingKey(binding)
    const aware = bindings.find(
      (item) =>
        item.layer === binding.layer &&
        (item.state || '') === (binding.state || '') &&
        normalizeShortcutId(item.defaultShortcutId || item.shortcutId) ===
          normalizeShortcutId(binding.shortcutId)
    )
    const commandId = aware?.commands?.[0]
    if (commandId) {
      map.set(key, commandId)
      const legacyShortcutId = compactToLegacyShortcutId(binding.shortcutId)
      if (legacyShortcutId && legacyShortcutId !== binding.shortcutId) {
        map.set(bindingKey({ ...binding, shortcutId: legacyShortcutId }), commandId)
      }
    }
  }
  return map
}

export function migrateToCommandOverrides(rawOverrides = {}, bindings = getCommandAwareBindings(HOTKEY_BINDINGS)) {
  const legacyKeyMap = buildBindingOverrideKeyMap(bindings)
  const next = {}
  const pendingByCommand = new Map()

  for (const [key, overrideValue] of Object.entries(rawOverrides || {})) {
    if (!key || overrideValue === undefined) continue
    if (isCommandOverrideKey(key)) {
      next[key] = overrideValue
      continue
    }
    const commandId = legacyKeyMap.get(key)
    if (!commandId) continue
    if (!pendingByCommand.has(commandId)) pendingByCommand.set(commandId, [])
    pendingByCommand.get(commandId).push(overrideValue)
  }

  for (const [commandId, values] of pendingByCommand.entries()) {
    const cmdKey = getCommandOverrideKey(commandId)
    if (next[cmdKey] !== undefined) continue
    const defaults = getDefaultShortcutIdsForCommand(commandId, bindings)
    let merged = { shortcutIds: [...defaults], enabled: true }
    let when
    for (const value of values) {
      if (value === null) {
        merged = { shortcutIds: [...defaults], enabled: false }
        continue
      }
      const shape = normalizeOverrideValueShape(value)
      if (shape.shortcutIds.length) merged.shortcutIds = shape.shortcutIds
      if (shape.enabled === false) merged.enabled = false
      if (shape.when) when = shape.when
    }
    const payload = { shortcutIds: merged.shortcutIds, enabled: merged.enabled }
    if (when) payload.when = when
    const sameKeys =
      dedupeShortcutIds(payload.shortcutIds).join('|') === defaults.join('|') &&
      payload.enabled !== false &&
      !payload.when
    if (!sameKeys || payload.enabled === false) next[cmdKey] = payload
  }

  return next
}

export function buildCommandShortcutProfiles(overrides = {}, bindings = getCommandAwareBindings(HOTKEY_BINDINGS)) {
  const migrated = migrateToCommandOverrides(overrides, bindings)
  const profileMap = new Map()

  for (const binding of bindings) {
    if (binding?.internal === true) continue
    const commandIds = Array.isArray(binding.commands) ? binding.commands : []
    for (const commandId of commandIds) {
      if (!commandId) continue
      if (!profileMap.has(commandId)) {
        profileMap.set(commandId, {
          commandId,
          layer: binding.layer || '',
          state: binding.state || '',
          when: binding.defaultWhen || binding.when || '',
          defaultWhen: binding.defaultWhen || binding.when || '',
          defaultShortcutIds: [],
          shortcutIds: [],
          features: Array.isArray(binding.features) ? [...binding.features] : [binding.features].filter(Boolean),
          commands: [commandId],
          weight: Number.isFinite(binding.weight) ? binding.weight : 100,
          enabled: true,
          source: 'system',
          overrideKey: getCommandOverrideKey(commandId)
        })
      }
      const profile = profileMap.get(commandId)
      const sid = normalizeShortcutId(binding.defaultShortcutId || binding.shortcutId)
      if (sid && !profile.defaultShortcutIds.includes(sid)) {
        profile.defaultShortcutIds.push(sid)
      }
    }
  }

  for (const profile of profileMap.values()) {
    profile.defaultShortcutIds = dedupeShortcutIds(profile.defaultShortcutIds)
    const overrideKey = profile.overrideKey
    const overrideRaw = migrated[overrideKey]
    const overrideShape = overrideRaw !== undefined ? normalizeOverrideValueShape(overrideRaw) : null
    if (overrideShape) {
      profile.when = overrideShape.when !== undefined ? overrideShape.when : profile.defaultWhen
      profile.shortcutIds =
        overrideShape.shortcutIds.length ? overrideShape.shortcutIds : profile.defaultShortcutIds
      profile.enabled = overrideShape.enabled !== false
      profile.source = profile.enabled ? 'user' : 'removed'
    } else {
      profile.shortcutIds = [...profile.defaultShortcutIds]
      profile.enabled = true
      profile.source = 'system'
    }
  }

  return [...profileMap.values()].sort((a, b) => a.commandId.localeCompare(b.commandId))
}

export function expandCommandGroupedBindings(profiles) {
  const result = []
  for (const profile of profiles || []) {
    const shortcutIds = dedupeShortcutIds(
      profile.shortcutIds?.length ? profile.shortcutIds : profile.defaultShortcutIds
    )
    for (const shortcutId of shortcutIds) {
      result.push({
        layer: profile.layer || '',
        state: profile.state || '',
        shortcutId,
        defaultShortcutId: profile.defaultShortcutIds?.[0] || shortcutId,
        when: profile.when || '',
        defaultWhen: profile.defaultWhen || '',
        commands: [profile.commandId],
        features: profile.features || [],
        commandEnabled: profile.enabled !== false,
        enabled: profile.enabled !== false,
        source: profile.source || 'system',
        disabled: false,
        overrideKey: profile.overrideKey || getCommandOverrideKey(profile.commandId),
        weight: profile.weight || 100
      })
    }
  }
  return result
}

export function buildCommandShortcutOverrideValue(profile, patch = {}) {
  if (!profile) return undefined
  const defaultShortcutIds = dedupeShortcutIds(profile.defaultShortcutIds || [])
  const nextShortcutIds =
    patch.shortcutIds !== undefined ? dedupeShortcutIds(patch.shortcutIds) : dedupeShortcutIds(profile.shortcutIds)
  const nextWhen = patch.when !== undefined ? patch.when : profile.when
  const nextEnabled = patch.enabled !== undefined ? patch.enabled !== false : profile.enabled !== false
  const sameKeys = nextShortcutIds.join('|') === defaultShortcutIds.join('|')
  const sameWhen = String(nextWhen || '').trim() === String(profile.defaultWhen || '').trim()
  const sameEnabled = nextEnabled === true
  if (sameKeys && sameWhen && sameEnabled) return undefined
  const value = { shortcutIds: nextShortcutIds, enabled: nextEnabled }
  if (!sameWhen && typeof nextWhen === 'string') value.when = nextWhen.trim()
  return value
}

export function isCommandShortcutEnabled(profile) {
  return profile?.enabled !== false
}
