const handlers = new Set()
let installed = false
const pendingActions = []
const PENDING_ACTION_LIMIT = 5

const isQuickPasteAction = (action) =>
  action?.code === 'quick-paste-top' || action?.code === 'quick-paste-pin-group'

function getUToolsRuntime() {
  if (typeof utools !== 'undefined') return utools
  if (typeof window !== 'undefined' && window.utools) return window.utools
  return null
}

export function installPluginEnterMultiplexer() {
  return installPluginEnterMultiplexerInternal()
}

function installPluginEnterMultiplexerInternal() {
  if (installed) return true
  const runtime = getUToolsRuntime()
  if (!runtime || typeof runtime.onPluginEnter !== 'function') return false
  installed = true
  runtime.onPluginEnter((action) => {
    if (isQuickPasteAction(action)) {
      pendingActions.push({ action, timestamp: Date.now() })
      if (pendingActions.length > PENDING_ACTION_LIMIT) pendingActions.shift()
    }
    handlers.forEach((handler) => {
      try {
        handler(action)
      } catch (err) {
        console.warn('[pluginEnterHandlers] onPluginEnter handler failed:', err)
      }
    })
  })
  return true
}

export function registerPluginEnterHandler(handler) {
  if (typeof handler !== 'function') return () => {}
  handlers.add(handler)
  installPluginEnterMultiplexerInternal()
  return () => {
    handlers.delete(handler)
  }
}

export function consumePendingPluginEnterAction(predicate, options = {}) {
  const match = typeof predicate === 'function' ? predicate : () => true
  const maxAgeMs = Math.max(0, Number(options.maxAgeMs) || 2000)
  const now = Date.now()
  for (let index = 0; index < pendingActions.length; index += 1) {
    const entry = pendingActions[index]
    if (!entry || now - entry.timestamp > maxAgeMs) {
      pendingActions.splice(index, 1)
      index -= 1
      continue
    }
    if (match(entry.action)) {
      pendingActions.splice(index, 1)
      return entry.action
    }
  }
  return null
}
