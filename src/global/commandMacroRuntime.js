export const COMMAND_MACRO_RUNTIME_EVENT = 'ezclipboard:command-macro-runtime'

const runtimeState = new Map()

function emitRuntimeChanged(target = typeof window !== 'undefined' ? window : null) {
  if (!target || typeof target.dispatchEvent !== 'function') return false
  target.dispatchEvent(new CustomEvent(COMMAND_MACRO_RUNTIME_EVENT, {
    detail: getCommandMacroRuntimeSnapshot()
  }))
  return true
}

export function getCommandMacroRuntimeSnapshot() {
  return Array.from(runtimeState.values()).map((item) => ({ ...item }))
}

export function getCommandMacroRuntimeState(macroId) {
  const state = macroId ? runtimeState.get(macroId) : null
  return state ? { ...state } : null
}

export function setCommandMacroRuntimeState(macroId, patch = {}) {
  if (!macroId) return null
  const previous = runtimeState.get(macroId) || {
    macroId,
    runId: '',
    title: '',
    status: 'idle',
    currentStep: -1,
    totalSteps: 0,
    cancelRequested: false,
    error: '',
    updatedAt: 0
  }
  const next = {
    ...previous,
    ...patch,
    macroId,
    updatedAt: Date.now()
  }
  runtimeState.set(macroId, next)
  emitRuntimeChanged()
  return { ...next }
}

export function requestCancelCommandMacroRun(macroId) {
  const state = runtimeState.get(macroId)
  if (!state || state.status !== 'running') return false
  setCommandMacroRuntimeState(macroId, {
    cancelRequested: true,
    status: 'cancelling'
  })
  return true
}

export function isCommandMacroCancelRequested(macroId, runId = '') {
  const state = runtimeState.get(macroId)
  if (!state) return false
  if (runId && state.runId !== runId) return true
  return state.cancelRequested === true || state.status === 'cancelling'
}
