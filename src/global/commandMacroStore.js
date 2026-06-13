import { buildCommandMacroRows } from '../storage/commandMacroRepository.js'

export const COMMAND_MACRO_STORAGE_MODE_MEMORY = 'memory-command-macros'
export const COMMAND_MACRO_STORAGE_MODE_SQLITE = 'sqlite-command-macros'
export const COMMAND_MACROS_UPDATED_EVENT = 'ezclipboard:command-macros-updated'

let memoryCommandMacros = []

export function emitCommandMacrosUpdated(target = typeof window !== 'undefined' ? window : null) {
  if (!target || typeof target.dispatchEvent !== 'function') return false
  target.dispatchEvent(new CustomEvent(COMMAND_MACROS_UPDATED_EVENT))
  return true
}

export function getCommandMacroStorageBackend(source = typeof window !== 'undefined' ? window?.db : null) {
  const backend = source?.commandMacros
  if (
    backend &&
    typeof backend.getMacroDefinitions === 'function' &&
    typeof backend.replaceMacroRows === 'function' &&
    typeof backend.deleteMacro === 'function'
  ) {
    return backend
  }
  return null
}

export function normalizeCommandMacroDrafts(macros = []) {
  return (Array.isArray(macros) ? macros : []).filter((macro) => macro && typeof macro === 'object')
}

export function getEffectiveCommandMacros(options = {}) {
  const {
    fallbackMacros = memoryCommandMacros,
    backend = getCommandMacroStorageBackend(),
    warn = console.warn
  } = options
  if (backend) {
    try {
      return {
        macros: normalizeCommandMacroDrafts(backend.getMacroDefinitions()),
        storageMode: COMMAND_MACRO_STORAGE_MODE_SQLITE
      }
    } catch (err) {
      warn?.('[commandMacroStore] 读取 SQLite 组合命令失败，回退内存草稿:', err)
    }
  }
  return {
    macros: normalizeCommandMacroDrafts(fallbackMacros),
    storageMode: COMMAND_MACRO_STORAGE_MODE_MEMORY
  }
}

export function saveCommandMacros(macros = [], options = {}) {
  const {
    backend = getCommandMacroStorageBackend(),
    storageTarget = typeof window !== 'undefined' ? window?.db : null,
    warn = console.warn,
    allowDataWrite = false,
    getCommand
  } = options
  const normalizedMacros = normalizeCommandMacroDrafts(macros)
  const rowResult = buildCommandMacroRows(macros, { allowDataWrite, getCommand })
  if (!rowResult.ok) {
    return {
      ok: false,
      errors: rowResult.errors,
      macros: normalizedMacros,
      storageMode: COMMAND_MACRO_STORAGE_MODE_MEMORY,
      sqliteSaved: false
    }
  }
  if (backend) {
    try {
      backend.replaceMacroRows(rowResult.rows)
      storageTarget?.queuePersist?.()
      emitCommandMacrosUpdated()
      return {
        ok: true,
        errors: [],
        macros: normalizedMacros,
        storageMode: COMMAND_MACRO_STORAGE_MODE_SQLITE,
        sqliteSaved: true
      }
    } catch (err) {
      warn?.('[commandMacroStore] 写入 SQLite 组合命令失败，保留内存草稿:', err)
    }
  }
  memoryCommandMacros = normalizedMacros
  emitCommandMacrosUpdated()
  return {
    ok: true,
    errors: [],
    macros: normalizedMacros,
    storageMode: COMMAND_MACRO_STORAGE_MODE_MEMORY,
    sqliteSaved: false
  }
}
