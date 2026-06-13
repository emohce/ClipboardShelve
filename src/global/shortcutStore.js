import { HOTKEY_BINDINGS_UPDATED_EVENT, getCommandAwareBindings } from './hotkeyBindings.js'
import { buildShortcutKeybindingSnapshotRows, buildShortcutOverrideRows } from '../storage/shortcutKeybindingRepository.js'
import { normalizeShortcutOverrides } from './shortcutOverrides.js'
import { buildShortcutCommandRowsFromProfiles } from './shortcutCommandRows.js'
import {
  buildCommandShortcutProfiles,
  expandCommandGroupedBindings
} from './commandKeybindings.js'

export const SHORTCUT_STORAGE_MODE_SETTING = 'setting-hotkey-overrides'
export const SHORTCUT_STORAGE_MODE_SQLITE = 'sqlite-shortcut-keybindings'

export { normalizeShortcutOverrides }

export function getShortcutOverridesFromSetting(source) {
  return normalizeShortcutOverrides(source?.hotkeyOverrides)
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
  const { setting, backend = getShortcutStorageBackend(), warn = console.warn } = options
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
  return expandCommandGroupedBindings(profiles)
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
    getFeatureLabel = (featureId) => featureId,
    warn = console.warn
  } = options
  const { hotkeyOverrides, storageMode } = getEffectiveShortcutOverrides({ setting, backend, warn })
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
    eventTarget = typeof window !== 'undefined' ? window : null,
    storageTarget = typeof window !== 'undefined' ? window?.db : null,
    backend = getShortcutStorageBackend(),
    warn = console.warn
  } = options
  const payload = buildShortcutSettingsPayload(settingPayload, overrides)
  const saved = typeof saveSetting === 'function' ? saveSetting(payload) : payload
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
