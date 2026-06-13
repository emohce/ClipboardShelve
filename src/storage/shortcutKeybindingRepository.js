import { COMMANDS } from '../global/commandDefaults.js'
import { HOTKEY_BINDINGS, bindingKey, getCommandAwareBindings } from '../global/hotkeyBindings.js'
import { normalizeShortcutOverrides } from '../global/shortcutOverrides.js'
import {
  getCommandOverrideKey,
  isCommandOverrideKey,
  normalizeOverrideValueShape,
  parseCommandOverrideKey
} from '../global/commandKeybindings.js'

export const SHORTCUT_OVERRIDE_MIGRATION_META_KEY = 'shortcut_override_migration_hash'

export const SHORTCUT_KEYBINDING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS shortcut_command_snapshot (
  command_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  risk TEXT NOT NULL DEFAULT 'normal',
  source TEXT NOT NULL DEFAULT 'system',
  default_when TEXT NOT NULL DEFAULT '',
  version_hash TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shortcut_keybinding_snapshot (
  override_key TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  feature_id TEXT NOT NULL DEFAULT '',
  layer TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  default_shortcut_id TEXT NOT NULL,
  default_when TEXT NOT NULL DEFAULT '',
  weight INTEGER NOT NULL DEFAULT 0,
  declaration_order INTEGER NOT NULL DEFAULT 0,
  version_hash TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS shortcut_keybinding_overrides (
  override_key TEXT PRIMARY KEY,
  command_id TEXT NOT NULL,
  shortcut_id TEXT,
  shortcut_ids TEXT,
  when_expr TEXT,
  disabled INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'user',
  updated_at INTEGER NOT NULL
);
`

const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map((item) => stableStringify(item)).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export function createShortcutVersionHash(value) {
  const input = stableStringify(value)
  let hash = 5381
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(index)) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function buildShortcutCommandSnapshotRows(commands = COMMANDS, timestamp = Date.now()) {
  return (Array.isArray(commands) ? commands : []).map((command) => {
    const row = {
      commandId: command.id,
      title: command.title || command.id,
      category: command.category || 'unknown',
      description: command.description || '',
      risk: command.risk || 'normal',
      source: command.source || 'system',
      defaultWhen: command.defaultWhen || ''
    }
    return {
      ...row,
      versionHash: createShortcutVersionHash(row),
      updatedAt: timestamp
    }
  })
}

export function buildShortcutKeybindingSnapshotRows(bindings = HOTKEY_BINDINGS, timestamp = Date.now()) {
  return getCommandAwareBindings(bindings).flatMap((binding, bindingIndex) => {
    const commands = Array.isArray(binding.commands) ? binding.commands : []
    const features = Array.isArray(binding.features) ? binding.features : []
    const overrideKey = binding.overrideKey || bindingKey(binding)
    return commands.map((commandId, commandIndex) => {
      const row = {
        overrideKey,
        commandId,
        featureId: features[commandIndex] || features[0] || '',
        layer: binding.layer || '',
        state: binding.state || '',
        defaultShortcutId: binding.defaultShortcutId || binding.shortcutId || '',
        defaultWhen: binding.defaultWhen || binding.when || '',
        weight: Number.isFinite(binding.weight) ? binding.weight : 100,
        declarationOrder: bindingIndex * 100 + commandIndex
      }
      return {
        ...row,
        versionHash: createShortcutVersionHash(row),
        updatedAt: timestamp
      }
    })
  })
}

export function buildShortcutOverrideRows(overrides, bindingRows = buildShortcutKeybindingSnapshotRows(), timestamp = Date.now()) {
  const normalized = normalizeShortcutOverrides(overrides)
  const bindingByOverrideKey = new Map((Array.isArray(bindingRows) ? bindingRows : []).map((row) => [row.overrideKey, row]))
  return Object.entries(normalized).flatMap(([overrideKey, overrideValue]) => {
    if (isCommandOverrideKey(overrideKey)) {
      const commandId = parseCommandOverrideKey(overrideKey)
      const shape = normalizeOverrideValueShape(overrideValue)
      return [{
        overrideKey,
        commandId,
        shortcutId: shape.shortcutIds[0] || null,
        shortcutIds: JSON.stringify(shape.shortcutIds || []),
        whenExpr: shape.when || null,
        disabled: shape.enabled === false ? 1 : 0,
        enabled: shape.enabled === false ? 0 : 1,
        source: 'user',
        updatedAt: timestamp
      }]
    }
    const bindingRow = bindingByOverrideKey.get(overrideKey)
    if (!bindingRow) return []
    if (overrideValue === null) {
      return [{
        overrideKey,
        commandId: bindingRow.commandId,
        shortcutId: null,
        shortcutIds: JSON.stringify([]),
        whenExpr: null,
        disabled: 1,
        enabled: 0,
        source: 'user',
        updatedAt: timestamp
      }]
    }
    const value = typeof overrideValue === 'string' ? { shortcutId: overrideValue } : overrideValue
    const shape = normalizeOverrideValueShape(value)
    return [{
      overrideKey,
      commandId: bindingRow.commandId,
      shortcutId: shape.shortcutIds[0] || null,
      shortcutIds: JSON.stringify(shape.shortcutIds || []),
      whenExpr: shape.when || null,
      disabled: shape.enabled === false ? 1 : 0,
      enabled: shape.enabled === false ? 0 : 1,
      source: 'user',
      updatedAt: timestamp
    }]
  })
}

export function shortcutOverrideRowsToMap(rows = []) {
  return (Array.isArray(rows) ? rows : []).reduce((acc, row) => {
    if (!row?.overrideKey) return acc
    const enabled = row.enabled === undefined ? Number(row.disabled) !== 1 : Number(row.enabled) === 1
    let shortcutIds = []
    if (row.shortcutIds) {
      try {
        const parsed = JSON.parse(row.shortcutIds)
        if (Array.isArray(parsed)) shortcutIds = parsed
      } catch (_) {}
    }
    if (!shortcutIds.length && typeof row.shortcutId === 'string' && row.shortcutId) {
      shortcutIds = [row.shortcutId]
    }
    const value = { shortcutIds, enabled }
    if (typeof row.whenExpr === 'string' && row.whenExpr) value.when = row.whenExpr
    if (!enabled || shortcutIds.length || value.when) {
      acc[row.overrideKey] = value
    }
    return acc
  }, {})
}

export function createShortcutOverrideMigrationHash(overrides) {
  return createShortcutVersionHash(normalizeShortcutOverrides(overrides))
}

export class ShortcutKeybindingRepository {
  constructor(db) {
    this.db = db
  }

  ensureSchema() {
    this.db?.run?.(SHORTCUT_KEYBINDING_SCHEMA_SQL)
    this.ensureOverrideColumns()
  }

  ensureOverrideColumns() {
    const columns = this.getOverrideTableColumns()
    if (!columns.has('shortcut_ids')) {
      try {
        this.db.run('ALTER TABLE shortcut_keybinding_overrides ADD COLUMN shortcut_ids TEXT')
      } catch (_) {}
    }
    if (!columns.has('enabled')) {
      try {
        this.db.run('ALTER TABLE shortcut_keybinding_overrides ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1')
      } catch (_) {}
    }
  }

  getOverrideTableColumns() {
    const columns = new Set()
    if (!this.db || typeof this.db.prepare !== 'function') return columns
    const stmt = this.db.prepare('PRAGMA table_info(shortcut_keybinding_overrides)')
    try {
      while (stmt.step()) {
        const row = stmt.getAsObject()
        if (row?.name) columns.add(row.name)
      }
    } finally {
      stmt.free()
    }
    return columns
  }

  seedDefaultSnapshots(options = {}) {
    const timestamp = options.timestamp || Date.now()
    const snapshots = {
      commands: buildShortcutCommandSnapshotRows(options.commands || COMMANDS, timestamp),
      keybindings: buildShortcutKeybindingSnapshotRows(options.bindings || HOTKEY_BINDINGS, timestamp)
    }
    if (options.write === true) {
      this.upsertCommandSnapshots(snapshots.commands)
      this.upsertKeybindingSnapshots(snapshots.keybindings)
    }
    return snapshots
  }

  migrateOverridesFromSetting(overrides, options = {}) {
    const timestamp = options.timestamp || Date.now()
    const bindingRows = options.bindingRows || buildShortcutKeybindingSnapshotRows(options.bindings || HOTKEY_BINDINGS, timestamp)
    const result = {
      migrationHash: createShortcutOverrideMigrationHash(overrides),
      rows: buildShortcutOverrideRows(overrides, bindingRows, timestamp)
    }
    if (options.write === true && this.getMeta(SHORTCUT_OVERRIDE_MIGRATION_META_KEY) !== result.migrationHash) {
      this.upsertOverrideRows(result.rows)
      this.setMeta(SHORTCUT_OVERRIDE_MIGRATION_META_KEY, result.migrationHash)
    }
    return result
  }

  upsertCommandSnapshots(rows = []) {
    rows.forEach((row) => {
      this.db.run(
        `INSERT OR REPLACE INTO shortcut_command_snapshot (
          command_id, title, category, description, risk, source, default_when, version_hash, updated_at
        ) VALUES (
          $command_id, $title, $category, $description, $risk, $source, $default_when, $version_hash, $updated_at
        )`,
        {
          $command_id: row.commandId,
          $title: row.title,
          $category: row.category,
          $description: row.description,
          $risk: row.risk,
          $source: row.source,
          $default_when: row.defaultWhen,
          $version_hash: row.versionHash,
          $updated_at: row.updatedAt
        }
      )
    })
  }

  upsertKeybindingSnapshots(rows = []) {
    rows.forEach((row) => {
      this.db.run(
        `INSERT OR REPLACE INTO shortcut_keybinding_snapshot (
          override_key, command_id, feature_id, layer, state, default_shortcut_id,
          default_when, weight, declaration_order, version_hash, updated_at
        ) VALUES (
          $override_key, $command_id, $feature_id, $layer, $state, $default_shortcut_id,
          $default_when, $weight, $declaration_order, $version_hash, $updated_at
        )`,
        {
          $override_key: row.overrideKey,
          $command_id: row.commandId,
          $feature_id: row.featureId,
          $layer: row.layer,
          $state: row.state,
          $default_shortcut_id: row.defaultShortcutId,
          $default_when: row.defaultWhen,
          $weight: row.weight,
          $declaration_order: row.declarationOrder,
          $version_hash: row.versionHash,
          $updated_at: row.updatedAt
        }
      )
    })
  }

  upsertOverrideRows(rows = []) {
    rows.forEach((row) => {
      this.db.run(
        `INSERT OR REPLACE INTO shortcut_keybinding_overrides (
          override_key, command_id, shortcut_id, shortcut_ids, when_expr, disabled, enabled, source, updated_at
        ) VALUES (
          $override_key, $command_id, $shortcut_id, $shortcut_ids, $when_expr, $disabled, $enabled, $source, $updated_at
        )`,
        {
          $override_key: row.overrideKey,
          $command_id: row.commandId,
          $shortcut_id: row.shortcutId,
          $shortcut_ids: row.shortcutIds || null,
          $when_expr: row.whenExpr,
          $disabled: row.disabled,
          $enabled: row.enabled === undefined ? (row.disabled ? 0 : 1) : row.enabled,
          $source: row.source,
          $updated_at: row.updatedAt
        }
      )
    })
  }

  replaceOverrideRows(rows = []) {
    this.db.run('BEGIN IMMEDIATE')
    try {
      this.db.run('DELETE FROM shortcut_keybinding_overrides')
      this.upsertOverrideRows(rows)
      this.db.run('COMMIT')
      return true
    } catch (err) {
      try {
        this.db.run('ROLLBACK')
      } catch (_) {}
      throw err
    }
  }

  deleteOverride(overrideKey) {
    if (!overrideKey) return false
    this.db.run('DELETE FROM shortcut_keybinding_overrides WHERE override_key = $override_key', {
      $override_key: overrideKey
    })
    return true
  }

  getCommandSnapshotRows() {
    const stmt = this.db.prepare(
      `SELECT command_id, title, category, description, risk, source, default_when, version_hash, updated_at
       FROM shortcut_command_snapshot
       ORDER BY command_id`
    )
    try {
      const rows = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        rows.push({
          commandId: row.command_id,
          title: row.title,
          category: row.category,
          description: row.description,
          risk: row.risk,
          source: row.source,
          defaultWhen: row.default_when,
          versionHash: row.version_hash,
          updatedAt: Number(row.updated_at) || 0
        })
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  getKeybindingSnapshotRows() {
    const stmt = this.db.prepare(
      `SELECT override_key, command_id, feature_id, layer, state, default_shortcut_id,
              default_when, weight, declaration_order, version_hash, updated_at
       FROM shortcut_keybinding_snapshot
       ORDER BY declaration_order, override_key`
    )
    try {
      const rows = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        rows.push({
          overrideKey: row.override_key,
          commandId: row.command_id,
          featureId: row.feature_id,
          layer: row.layer,
          state: row.state,
          defaultShortcutId: row.default_shortcut_id,
          defaultWhen: row.default_when,
          weight: Number(row.weight) || 0,
          declarationOrder: Number(row.declaration_order) || 0,
          versionHash: row.version_hash,
          updatedAt: Number(row.updated_at) || 0
        })
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  getOverrideRows() {
    const stmt = this.db.prepare(
      `SELECT override_key, command_id, shortcut_id, shortcut_ids, when_expr, disabled, enabled, source, updated_at
       FROM shortcut_keybinding_overrides
       ORDER BY override_key`
    )
    try {
      const rows = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        rows.push({
          overrideKey: row.override_key,
          commandId: row.command_id,
          shortcutId: row.shortcut_id,
          shortcutIds: row.shortcut_ids,
          whenExpr: row.when_expr,
          disabled: Number(row.disabled) || 0,
          enabled: row.enabled === undefined ? (Number(row.disabled) ? 0 : 1) : Number(row.enabled),
          source: row.source || 'user',
          updatedAt: Number(row.updated_at) || 0
        })
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  getOverridesMap() {
    return shortcutOverrideRowsToMap(this.getOverrideRows())
  }

  getMeta(key) {
    if (!key) return ''
    const stmt = this.db.prepare('SELECT value FROM meta WHERE key = $key')
    try {
      stmt.bind({ $key: key })
      if (!stmt.step()) return ''
      return String(stmt.getAsObject().value || '')
    } finally {
      stmt.free()
    }
  }

  setMeta(key, value) {
    if (!key) return false
    this.db.run('INSERT OR REPLACE INTO meta(key, value) VALUES ($key, $value)', {
      $key: key,
      $value: String(value)
    })
    return true
  }
}
