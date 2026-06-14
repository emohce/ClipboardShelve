import { HOTKEY_BINDINGS, HOTKEY_BINDINGS_UPDATED_EVENT, getCommandAwareBindings } from './hotkeyBindings.js'
import { buildShortcutKeybindingSnapshotRows, buildShortcutOverrideRows } from '../storage/shortcutKeybindingRepository.js'
import { normalizeShortcutOverrides } from './shortcutOverrides.js'
import { buildShortcutCommandRowsFromProfiles } from './shortcutCommandRows.js'
import {
  buildCommandShortcutProfiles,
  expandCommandGroupedBindings
} from './commandKeybindings.js'

export const SHORTCUT_STORAGE_MODE_SETTING = 'setting-hotkey-overrides'
export const SHORTCUT_STORAGE_MODE_SQLITE = 'sqlite-shortcut-keybindings'
export const SHORTCUT_STORAGE_MODE_UTOOLS_SYNC = 'utools-sync-hotkey-overrides'
export const SHORTCUT_RUNTIME_SOURCE_LOCAL = 'local'
export const SHORTCUT_RUNTIME_SOURCE_PUBLIC = 'public'
export const SHORTCUT_SYNC_PUBLIC_PROFILE_ID = 'public'

export { normalizeShortcutOverrides }

export function getShortcutOverridesFromSetting(source) {
  return normalizeShortcutOverrides(source?.hotkeyOverrides)
}

export function getLocalShortcutProfileId(nativeId) {
  return `local:${nativeId || 'unknown'}`
}

function normalizeShortcutProfile(profile = {}, fallbackOverrides = {}) {
  return {
    id: typeof profile.id === 'string' && profile.id ? profile.id : '',
    type: profile.type === SHORTCUT_RUNTIME_SOURCE_PUBLIC ? SHORTCUT_RUNTIME_SOURCE_PUBLIC : SHORTCUT_RUNTIME_SOURCE_LOCAL,
    label: typeof profile.label === 'string' ? profile.label : '',
    hotkeyOverrides: normalizeShortcutOverrides(profile.hotkeyOverrides || fallbackOverrides),
    updatedAt: Number(profile.updatedAt) || 0,
    updatedBy: typeof profile.updatedBy === 'string' ? profile.updatedBy : ''
  }
}

export function normalizeShortcutSyncDocument(doc = {}) {
  const source = doc && typeof doc === 'object' ? doc : {}
  const profiles = {}
  Object.entries(source.profiles && typeof source.profiles === 'object' ? source.profiles : {}).forEach(([id, profile]) => {
    profiles[id] = {
      ...normalizeShortcutProfile(profile),
      id,
      type: id === SHORTCUT_SYNC_PUBLIC_PROFILE_ID ? SHORTCUT_RUNTIME_SOURCE_PUBLIC : SHORTCUT_RUNTIME_SOURCE_LOCAL
    }
  })
  const devices = {}
  Object.entries(source.devices && typeof source.devices === 'object' ? source.devices : {}).forEach(([id, device]) => {
    if (!id) return
    devices[id] = {
      nativeId: id,
      alias: typeof device?.alias === 'string' ? device.alias : '',
      runtimeSource: device?.runtimeSource === SHORTCUT_RUNTIME_SOURCE_PUBLIC ? SHORTCUT_RUNTIME_SOURCE_PUBLIC : SHORTCUT_RUNTIME_SOURCE_LOCAL,
      lastUploadedAt: Number(device?.lastUploadedAt) || 0,
      updatedAt: Number(device?.updatedAt) || 0
    }
  })
  const runtimeSourceByDevice = {}
  Object.entries(source.runtimeSourceByDevice && typeof source.runtimeSourceByDevice === 'object' ? source.runtimeSourceByDevice : {}).forEach(
    ([id, value]) => {
      runtimeSourceByDevice[id] = value === SHORTCUT_RUNTIME_SOURCE_PUBLIC ? SHORTCUT_RUNTIME_SOURCE_PUBLIC : SHORTCUT_RUNTIME_SOURCE_LOCAL
    }
  )
  return {
    version: Number(source.version) || 1,
    profiles,
    devices,
    runtimeSourceByDevice,
    masterProfileId: source.masterProfileId === SHORTCUT_SYNC_PUBLIC_PROFILE_ID ? SHORTCUT_SYNC_PUBLIC_PROFILE_ID : SHORTCUT_SYNC_PUBLIC_PROFILE_ID,
    updatedAt: Number(source.updatedAt) || 0,
    updatedBy: typeof source.updatedBy === 'string' ? source.updatedBy : ''
  }
}

function getShortcutSyncDocument(setting) {
  return normalizeShortcutSyncDocument(setting?.userConfig?.shortcutSync)
}

function withShortcutSyncDocument(setting, doc) {
  return {
    ...(setting && typeof setting === 'object' ? setting : {}),
    userConfig: {
      ...(setting?.userConfig && typeof setting.userConfig === 'object' ? setting.userConfig : {}),
      shortcutSync: normalizeShortcutSyncDocument(doc)
    }
  }
}

export function getShortcutRuntimeSource(setting, nativeId) {
  const doc = getShortcutSyncDocument(setting)
  const source = doc.runtimeSourceByDevice?.[nativeId] || doc.devices?.[nativeId]?.runtimeSource || SHORTCUT_RUNTIME_SOURCE_LOCAL
  return source === SHORTCUT_RUNTIME_SOURCE_PUBLIC && doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID]
    ? SHORTCUT_RUNTIME_SOURCE_PUBLIC
    : SHORTCUT_RUNTIME_SOURCE_LOCAL
}

export function ensureShortcutSyncDocument(setting, options = {}) {
  const nativeId = options.nativeId || 'unknown'
  const now = Number(options.now) || Date.now()
  const alias = typeof options.alias === 'string' ? options.alias : ''
  const localProfileId = getLocalShortcutProfileId(nativeId)
  const doc = getShortcutSyncDocument(setting)
  const localOverrides = normalizeShortcutOverrides(options.localOverrides)
  const previousLocal = doc.profiles[localProfileId] || {}
  doc.profiles[localProfileId] = {
    ...normalizeShortcutProfile(previousLocal, localOverrides),
    id: localProfileId,
    type: SHORTCUT_RUNTIME_SOURCE_LOCAL,
    label: alias || previousLocal.label || nativeId,
    hotkeyOverrides: localOverrides,
    updatedAt: now,
    updatedBy: nativeId
  }
  if (!doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID]) {
    doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID] = {
      id: SHORTCUT_SYNC_PUBLIC_PROFILE_ID,
      type: SHORTCUT_RUNTIME_SOURCE_PUBLIC,
      label: '公共配置',
      hotkeyOverrides: localOverrides,
      updatedAt: now,
      updatedBy: nativeId
    }
  }
  doc.devices[nativeId] = {
    nativeId,
    alias: alias || doc.devices[nativeId]?.alias || nativeId,
    runtimeSource: doc.runtimeSourceByDevice[nativeId] || doc.devices[nativeId]?.runtimeSource || SHORTCUT_RUNTIME_SOURCE_LOCAL,
    lastUploadedAt: now,
    updatedAt: now
  }
  if (!doc.runtimeSourceByDevice[nativeId]) doc.runtimeSourceByDevice[nativeId] = SHORTCUT_RUNTIME_SOURCE_LOCAL
  doc.updatedAt = now
  doc.updatedBy = nativeId
  return withShortcutSyncDocument(setting, doc)
}

export function setShortcutRuntimeSource(setting, nativeId, runtimeSource, options = {}) {
  const doc = getShortcutSyncDocument(setting)
  const nextSource =
    runtimeSource === SHORTCUT_RUNTIME_SOURCE_PUBLIC && doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID]
      ? SHORTCUT_RUNTIME_SOURCE_PUBLIC
      : SHORTCUT_RUNTIME_SOURCE_LOCAL
  const now = Number(options.now) || Date.now()
  doc.runtimeSourceByDevice[nativeId] = nextSource
  doc.devices[nativeId] = {
    nativeId,
    alias: doc.devices[nativeId]?.alias || nativeId,
    runtimeSource: nextSource,
    lastUploadedAt: Number(doc.devices[nativeId]?.lastUploadedAt) || 0,
    updatedAt: now
  }
  doc.updatedAt = now
  doc.updatedBy = nativeId
  return withShortcutSyncDocument(setting, doc)
}

export function promoteLocalShortcutProfileToPublic(setting, options = {}) {
  const nativeId = options.nativeId || 'unknown'
  const now = Number(options.now) || Date.now()
  const doc = getShortcutSyncDocument(setting)
  const localProfile = doc.profiles[getLocalShortcutProfileId(nativeId)]
  const hotkeyOverrides = normalizeShortcutOverrides(localProfile?.hotkeyOverrides)
  doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID] = {
    id: SHORTCUT_SYNC_PUBLIC_PROFILE_ID,
    type: SHORTCUT_RUNTIME_SOURCE_PUBLIC,
    label: '公共配置',
    hotkeyOverrides,
    updatedAt: now,
    updatedBy: nativeId
  }
  doc.masterProfileId = SHORTCUT_SYNC_PUBLIC_PROFILE_ID
  doc.updatedAt = now
  doc.updatedBy = nativeId
  return withShortcutSyncDocument(setting, doc)
}

export function updateShortcutDeviceAlias(setting, options = {}) {
  const nativeId = options.nativeId || 'unknown'
  const now = Number(options.now) || Date.now()
  const doc = getShortcutSyncDocument(setting)
  const alias = typeof options.alias === 'string' ? options.alias.trim() : ''
  doc.devices[nativeId] = {
    nativeId,
    alias: alias || nativeId,
    runtimeSource: doc.runtimeSourceByDevice[nativeId] || doc.devices[nativeId]?.runtimeSource || SHORTCUT_RUNTIME_SOURCE_LOCAL,
    lastUploadedAt: Number(doc.devices[nativeId]?.lastUploadedAt) || 0,
    updatedAt: now
  }
  const localProfileId = getLocalShortcutProfileId(nativeId)
  if (doc.profiles[localProfileId]) doc.profiles[localProfileId].label = alias || nativeId
  doc.updatedAt = now
  doc.updatedBy = nativeId
  return withShortcutSyncDocument(setting, doc)
}

function getPublicShortcutOverrides(setting) {
  const doc = getShortcutSyncDocument(setting)
  return normalizeShortcutOverrides(doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID]?.hotkeyOverrides)
}

function getRuntimeSetting() {
  try {
    if (typeof utools !== 'undefined') return utools?.dbStorage?.getItem?.('setting')
  } catch (_) {}
  try {
    if (typeof window !== 'undefined') {
      return window?.utools?.dbStorage?.getItem?.('setting') || window?.exports?.utools?.dbStorage?.getItem?.('setting')
    }
  } catch (_) {}
  return null
}

export function isShortcutUToolsSyncEnabled(source) {
  return source?.userConfig?.shortcut?.syncWithUTools === true
}

export function getShortcutStorageBackend(source = typeof window !== 'undefined' ? window?.db : null) {
  const backend = source?.shortcutKeybindings
  if (
    backend &&
    typeof backend.getOverridesMap === 'function' &&
    typeof backend.upsertOverrideRows === 'function' &&
    typeof backend.deleteOverride === 'function'
  ) {
    return backend
  }
  return null
}

export function getEffectiveShortcutOverrides(options = {}) {
  const { setting = getRuntimeSetting(), backend = getShortcutStorageBackend(), nativeId, warn = console.warn } = options
  if (nativeId && getShortcutRuntimeSource(setting, nativeId) === SHORTCUT_RUNTIME_SOURCE_PUBLIC) {
    return {
      hotkeyOverrides: getPublicShortcutOverrides(setting),
      storageMode: SHORTCUT_STORAGE_MODE_UTOOLS_SYNC
    }
  }
  if (isShortcutUToolsSyncEnabled(setting)) {
    return {
      hotkeyOverrides: getShortcutOverridesFromSetting(setting),
      storageMode: SHORTCUT_STORAGE_MODE_UTOOLS_SYNC
    }
  }
  if (backend) {
    try {
      return {
        hotkeyOverrides: normalizeShortcutOverrides(backend.getOverridesMap()),
        storageMode: SHORTCUT_STORAGE_MODE_SQLITE
      }
    } catch (err) {
      warn?.('[shortcutStore] 读取 SQLite 快捷键配置失败，回退 setting:', err)
    }
  }
  return {
    hotkeyOverrides: getShortcutOverridesFromSetting(setting),
    storageMode: SHORTCUT_STORAGE_MODE_SETTING
  }
}

export function getEffectiveShortcutProfiles(options = {}) {
  const { hotkeyOverrides } = getEffectiveShortcutOverrides(options)
  return buildCommandShortcutProfiles(hotkeyOverrides)
}

export function getEffectiveShortcutBindings(options = {}) {
  const profiles = getEffectiveShortcutProfiles(options)
  const internalBindings = getCommandAwareBindings(HOTKEY_BINDINGS)
    .filter((binding) => binding?.internal === true)
    .map((binding) => ({
      ...binding,
      commands: [],
      commandEnabled: true,
      enabled: true,
      disabled: false,
      overrideKey: ''
    }))
  return [...expandCommandGroupedBindings(profiles), ...internalBindings]
}

export function keybindingSnapshotRowsToBindings(snapshotRows, overrides = {}) {
  const normalizedOverrides = normalizeShortcutOverrides(overrides)
  return expandCommandGroupedBindings(buildCommandShortcutProfiles(normalizedOverrides))
}

export function commandSnapshotRowsToMap(snapshotRows) {
  return new Map(
    (Array.isArray(snapshotRows) ? snapshotRows : [])
      .filter((row) => row?.commandId)
      .map((row) => [row.commandId, row])
  )
}

export function getEffectiveShortcutCommandRows(options = {}) {
  const {
    setting,
    backend = getShortcutStorageBackend(),
    nativeId,
    getFeatureLabel = (featureId) => featureId,
    warn = console.warn
  } = options
  const { hotkeyOverrides, storageMode } = getEffectiveShortcutOverrides({ setting, backend, nativeId, warn })
  let commandMap = new Map()
  if (backend && typeof backend.getCommandSnapshotRows === 'function') {
    try {
      commandMap = commandSnapshotRowsToMap(backend.getCommandSnapshotRows())
    } catch (err) {
      warn?.('[shortcutStore] 读取 SQLite 命令快照失败，继续使用代码默认命令元数据:', err)
    }
  }
  const profiles = buildCommandShortcutProfiles(hotkeyOverrides)
  return {
    rows: buildShortcutCommandRowsFromProfiles(profiles, getFeatureLabel, (commandId) => commandMap.get(commandId)),
    storageMode
  }
}

export function buildShortcutSettingsPayload(settingPayload, overrides) {
  return {
    ...(settingPayload && typeof settingPayload === 'object' ? settingPayload : {}),
    hotkeyOverrides: normalizeShortcutOverrides(overrides)
  }
}

export function emitShortcutBindingsUpdated(target = typeof window !== 'undefined' ? window : null) {
  if (!target || typeof target.dispatchEvent !== 'function') return false
  target.dispatchEvent(new CustomEvent(HOTKEY_BINDINGS_UPDATED_EVENT))
  return true
}

export function saveShortcutSettingsPayload(settingPayload, options = {}) {
  const {
    overrides = settingPayload?.hotkeyOverrides,
    saveSetting,
    nativeId,
    eventTarget = typeof window !== 'undefined' ? window : null,
    storageTarget = typeof window !== 'undefined' ? window?.db : null,
    backend = getShortcutStorageBackend(),
    warn = console.warn
  } = options
  const payload = buildShortcutSettingsPayload(settingPayload, overrides)
  let nextPayload = payload
  if (nativeId) {
    if (getShortcutRuntimeSource(payload, nativeId) === SHORTCUT_RUNTIME_SOURCE_PUBLIC) {
      const doc = getShortcutSyncDocument(payload)
      doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID] = {
        id: SHORTCUT_SYNC_PUBLIC_PROFILE_ID,
        type: SHORTCUT_RUNTIME_SOURCE_PUBLIC,
        label: doc.profiles[SHORTCUT_SYNC_PUBLIC_PROFILE_ID]?.label || '公共配置',
        hotkeyOverrides: normalizeShortcutOverrides(overrides),
        updatedAt: Date.now(),
        updatedBy: nativeId
      }
      doc.updatedAt = Date.now()
      doc.updatedBy = nativeId
      nextPayload = withShortcutSyncDocument(payload, doc)
    } else {
      nextPayload = ensureShortcutSyncDocument(payload, {
        nativeId,
        localOverrides: overrides
      })
    }
  }
  const saved = typeof saveSetting === 'function' ? saveSetting(nextPayload) : nextPayload
  if (nativeId && getShortcutRuntimeSource(saved, nativeId) === SHORTCUT_RUNTIME_SOURCE_PUBLIC) {
    emitShortcutBindingsUpdated(eventTarget)
    return {
      setting: saved,
      storageMode: SHORTCUT_STORAGE_MODE_UTOOLS_SYNC,
      settingSaved: true,
      sqliteSaved: false,
      hotkeyOverrides: getPublicShortcutOverrides(saved)
    }
  }
  if (isShortcutUToolsSyncEnabled(saved)) {
    emitShortcutBindingsUpdated(eventTarget)
    return {
      setting: saved,
      storageMode: SHORTCUT_STORAGE_MODE_UTOOLS_SYNC,
      settingSaved: true,
      sqliteSaved: false,
      hotkeyOverrides: getShortcutOverridesFromSetting(saved)
    }
  }
  let storageMode = SHORTCUT_STORAGE_MODE_SETTING
  let sqliteSaved = false
  if (backend) {
    try {
      const bindingRows = buildShortcutKeybindingSnapshotRows()
      const nextRows = buildShortcutOverrideRows(saved?.hotkeyOverrides, bindingRows)
      if (typeof backend.replaceOverrideRows === 'function') {
        backend.replaceOverrideRows(nextRows)
      } else {
        const nextKeys = new Set(nextRows.map((row) => row.overrideKey))
        const previousKeys = Object.keys(normalizeShortcutOverrides(backend.getOverridesMap()))
        previousKeys.forEach((overrideKey) => {
          if (!nextKeys.has(overrideKey)) backend.deleteOverride(overrideKey)
        })
        backend.upsertOverrideRows(nextRows)
      }
      storageTarget?.queuePersist?.()
      storageMode = SHORTCUT_STORAGE_MODE_SQLITE
      sqliteSaved = true
    } catch (err) {
      warn?.('[shortcutStore] 写入 SQLite 快捷键配置失败，回退 setting:', err)
    }
  }
  emitShortcutBindingsUpdated(eventTarget)
  return {
    setting: saved,
    storageMode,
    settingSaved: true,
    sqliteSaved,
    hotkeyOverrides: getShortcutOverridesFromSetting(saved)
  }
}
