import { normalizeCommandMacro, validateCommandMacro } from '../global/commandMacro.js'
import { createShortcutVersionHash } from './shortcutKeybindingRepository.js'

export const COMMAND_MACRO_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS command_macro_definitions (
  macro_id TEXT PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  shortcut_id TEXT NOT NULL DEFAULT '',
  when_expr TEXT NOT NULL DEFAULT 'mainFocus',
  mode TEXT NOT NULL DEFAULT 'sequence',
  enabled INTEGER NOT NULL DEFAULT 1,
  version_hash TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS command_macro_steps (
  macro_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  command_id TEXT NOT NULL,
  delay_ms INTEGER NOT NULL DEFAULT 0,
  args_json TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (macro_id, step_index)
);
`

function safeStringifyArgs(args = {}) {
  try {
    return JSON.stringify(args && typeof args === 'object' && !Array.isArray(args) ? args : {})
  } catch (_) {
    return '{}'
  }
}

function safeParseArgs(argsJson) {
  if (typeof argsJson !== 'string' || !argsJson.trim()) return {}
  try {
    const parsed = JSON.parse(argsJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch (_) {
    return {}
  }
}

export function createCommandMacroVersionHash(macro = {}) {
  return createShortcutVersionHash(normalizeCommandMacro(macro))
}

export function buildCommandMacroRows(macros = [], options = {}) {
  const {
    timestamp = Date.now(),
    getCommand,
    allowDataWrite = false
  } = options
  const definitions = []
  const steps = []
  const errors = []
  ;(Array.isArray(macros) ? macros : []).forEach((macro, macroIndex) => {
    const result = validateCommandMacro(macro, { getCommand, allowDataWrite })
    if (!result.ok) {
      errors.push({
        index: macroIndex,
        id: result.macro.id,
        errors: result.errors
      })
      return
    }
    const versionHash = createCommandMacroVersionHash(result.macro)
    definitions.push({
      macroId: result.macro.id,
      title: result.macro.title,
      shortcutId: result.macro.shortcutId,
      when: result.macro.when,
      mode: result.macro.mode,
      enabled: macro.enabled === false ? 0 : 1,
      versionHash,
      updatedAt: timestamp
    })
    result.macro.steps.forEach((step, stepIndex) => {
      steps.push({
        macroId: result.macro.id,
        stepIndex,
        commandId: step.command,
        delayMs: step.delayMs,
        argsJson: safeStringifyArgs(step.args)
      })
    })
  })
  return {
    ok: errors.length === 0,
    errors,
    rows: {
      definitions,
      steps
    }
  }
}

export function commandMacroRowsToDefinitions(definitionRows = [], stepRows = []) {
  const stepsByMacroId = new Map()
  ;(Array.isArray(stepRows) ? stepRows : []).forEach((row) => {
    const macroId = row?.macroId
    if (!macroId) return
    if (!stepsByMacroId.has(macroId)) stepsByMacroId.set(macroId, [])
    stepsByMacroId.get(macroId).push({
      command: row.commandId || '',
      delayMs: Number(row.delayMs) || 0,
      args: safeParseArgs(row.argsJson),
      stepIndex: Number(row.stepIndex) || 0
    })
  })
  return (Array.isArray(definitionRows) ? definitionRows : []).map((row) => {
    const macroSteps = (stepsByMacroId.get(row?.macroId) || [])
      .sort((a, b) => a.stepIndex - b.stepIndex)
      .map(({ stepIndex, ...step }) => step)
    return normalizeCommandMacro({
      id: row?.macroId || '',
      title: row?.title || '',
      shortcutId: row?.shortcutId || '',
      when: row?.when || 'mainFocus',
      mode: row?.mode || 'sequence',
      steps: macroSteps
    })
  })
}

export class CommandMacroRepository {
  constructor(db) {
    this.db = db
  }

  ensureSchema() {
    this.db?.run?.(COMMAND_MACRO_SCHEMA_SQL)
    this.ensureDefinitionColumn('shortcut_id', "TEXT NOT NULL DEFAULT ''")
    this.ensureDefinitionColumn('when_expr', "TEXT NOT NULL DEFAULT 'mainFocus'")
  }

  ensureDefinitionColumn(columnName, columnSql) {
    const stmt = this.db.prepare('PRAGMA table_info(command_macro_definitions)')
    try {
      let exists = false
      while (stmt.step()) {
        if (stmt.getAsObject().name === columnName) {
          exists = true
          break
        }
      }
      if (!exists) {
        this.db.run(`ALTER TABLE command_macro_definitions ADD COLUMN ${columnName} ${columnSql}`)
      }
    } finally {
      stmt.free()
    }
  }

  replaceMacroRows(rows = {}) {
    const definitions = Array.isArray(rows.definitions) ? rows.definitions : []
    const steps = Array.isArray(rows.steps) ? rows.steps : []
    this.db.run('BEGIN IMMEDIATE')
    try {
      this.db.run('DELETE FROM command_macro_steps')
      this.db.run('DELETE FROM command_macro_definitions')
      this.upsertMacroDefinitionRows(definitions)
      this.upsertMacroStepRows(steps)
      this.db.run('COMMIT')
      return true
    } catch (err) {
      try {
        this.db.run('ROLLBACK')
      } catch (_) {}
      throw err
    }
  }

  upsertMacroRows(rows = {}) {
    const definitions = Array.isArray(rows.definitions) ? rows.definitions : []
    const steps = Array.isArray(rows.steps) ? rows.steps : []
    definitions.forEach((definition) => {
      this.deleteMacroSteps(definition.macroId)
    })
    this.upsertMacroDefinitionRows(definitions)
    this.upsertMacroStepRows(steps)
    return true
  }

  upsertMacroDefinitionRows(rows = []) {
    rows.forEach((row) => {
      this.db.run(
        `INSERT OR REPLACE INTO command_macro_definitions (
          macro_id, title, shortcut_id, when_expr, mode, enabled, version_hash, updated_at
        ) VALUES (
          $macro_id, $title, $shortcut_id, $when_expr, $mode, $enabled, $version_hash, $updated_at
        )`,
        {
          $macro_id: row.macroId,
          $title: row.title,
          $shortcut_id: row.shortcutId || '',
          $when_expr: row.when || 'mainFocus',
          $mode: row.mode,
          $enabled: row.enabled,
          $version_hash: row.versionHash,
          $updated_at: row.updatedAt
        }
      )
    })
  }

  upsertMacroStepRows(rows = []) {
    rows.forEach((row) => {
      this.db.run(
        `INSERT OR REPLACE INTO command_macro_steps (
          macro_id, step_index, command_id, delay_ms, args_json
        ) VALUES (
          $macro_id, $step_index, $command_id, $delay_ms, $args_json
        )`,
        {
          $macro_id: row.macroId,
          $step_index: row.stepIndex,
          $command_id: row.commandId,
          $delay_ms: row.delayMs,
          $args_json: row.argsJson
        }
      )
    })
  }

  deleteMacro(macroId) {
    if (!macroId) return false
    this.db.run('DELETE FROM command_macro_steps WHERE macro_id = $macro_id', {
      $macro_id: macroId
    })
    this.db.run('DELETE FROM command_macro_definitions WHERE macro_id = $macro_id', {
      $macro_id: macroId
    })
    return true
  }

  deleteMacroSteps(macroId) {
    if (!macroId) return false
    this.db.run('DELETE FROM command_macro_steps WHERE macro_id = $macro_id', {
      $macro_id: macroId
    })
    return true
  }

  getMacroDefinitionRows() {
    const stmt = this.db.prepare(
      `SELECT macro_id, title, shortcut_id, when_expr, mode, enabled, version_hash, updated_at
       FROM command_macro_definitions
       ORDER BY macro_id`
    )
    try {
      const rows = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        rows.push({
          macroId: row.macro_id,
          title: row.title,
          shortcutId: row.shortcut_id || '',
          when: row.when_expr || 'mainFocus',
          mode: row.mode,
          enabled: Number(row.enabled) || 0,
          versionHash: row.version_hash,
          updatedAt: Number(row.updated_at) || 0
        })
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  getMacroStepRows() {
    const stmt = this.db.prepare(
      `SELECT macro_id, step_index, command_id, delay_ms, args_json
       FROM command_macro_steps
       ORDER BY macro_id, step_index`
    )
    try {
      const rows = []
      while (stmt.step()) {
        const row = stmt.getAsObject()
        rows.push({
          macroId: row.macro_id,
          stepIndex: Number(row.step_index) || 0,
          commandId: row.command_id,
          delayMs: Number(row.delay_ms) || 0,
          argsJson: row.args_json || '{}'
        })
      }
      return rows
    } finally {
      stmt.free()
    }
  }

  getMacroDefinitions() {
    return commandMacroRowsToDefinitions(this.getMacroDefinitionRows(), this.getMacroStepRows())
  }
}
