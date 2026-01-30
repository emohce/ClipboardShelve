/**
 * Central hotkey registry: feature handlers + bindings (shortcut + layer/state -> features).
 * Single dispatch: normalize -> find binding by layer priority -> run features in order.
 */

import { eventToShortcutId } from './shortcutKey'
import { normalizeShortcutId } from './shortcutKey'
import { getCurrentLayer } from './hotkeyLayers'

const MAIN_LAYER = 'main'

/** Mac 上 Cmd 与 Ctrl 同根：匹配时把 meta 当作 ctrl，使现有 ctrl 绑定对 Cmd 生效 */
function isMac() {
  if (typeof window !== 'undefined' && window.exports?.utools?.isMacOs?.()) return true
  if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) return true
  return false
}

/** 用于查找的 shortcutId：Mac 上 meta 视为 ctrl，与 hotkeyBindings 中 ctrl 绑定统一 */
function shortcutIdForLookup(shortcutId) {
  if (!shortcutId || !isMac()) return shortcutId
  return shortcutId.split('+').map((p) => (p === 'meta' ? 'ctrl' : p)).join('+')
}

const features = new Map()
let bindings = []
const mainStateRef = { current: 'normal' }
let ignoreRepeat = true

/**
 * @param {string} featureId
 * @param {(e: KeyboardEvent, ctx: object) => boolean} handler - return true if handled (stops running more features)
 */
export function registerFeature(featureId, handler) {
  if (!featureId || typeof handler !== 'function') return
  features.set(featureId, { handler })
}

export function unregisterFeature(featureId) {
  features.delete(featureId)
}

/**
 * @param {Array<{ layer: string, shortcutId: string, state?: string, features: string[] }>} list
 */
export function setBindings(list) {
  bindings = (list || []).map((b) => ({
    layer: b.layer,
    shortcutId: normalizeShortcutId(b.shortcutId),
    state: b.state,
    features: Array.isArray(b.features) ? b.features : [b.features]
  }))
}

export function getBindings() {
  return bindings
}

export function setMainState(state) {
  mainStateRef.current = state || 'normal'
}

export function getMainState() {
  return mainStateRef.current
}

export function setIgnoreRepeat(value) {
  ignoreRepeat = Boolean(value)
}

/**
 * Resolve current layer for lookup: stack top or MAIN_LAYER when no overlay.
 */
function getEffectiveLayer() {
  const top = getCurrentLayer()
  return top || MAIN_LAYER
}

/**
 * Layers to check in priority order: current top layer first, then main.
 */
function getLayerPriorityOrder() {
  const top = getCurrentLayer()
  if (top && top !== MAIN_LAYER) return [top, MAIN_LAYER]
  return [MAIN_LAYER]
}

/**
 * @param {string} layer
 * @param {string} state
 * @param {string} shortcutId
 * @returns {{ layer: string, shortcutId: string, state?: string, features: string[] } | null}
 */
function findBinding(layer, state, shortcutId) {
  for (const b of bindings) {
    if (b.layer !== layer) continue
    if (b.shortcutId !== shortcutId) continue
    if (b.state != null && b.state !== state) continue
    return b
  }
  if (layer !== MAIN_LAYER) {
    for (const b of bindings) {
      if (b.layer !== layer || b.shortcutId !== '*') continue
      if (b.state != null && b.state !== state) continue
      return b
    }
  }
  return null
}

/**
 * @param {KeyboardEvent} e
 * @returns {boolean} true if a binding matched and at least one feature handled the event
 */
export function dispatch(e) {
  if (e.__hotkeyHandled) return true
  if (ignoreRepeat && e.repeat) return false

  const shortcutId = eventToShortcutId(e)
  const lookupId = shortcutIdForLookup(shortcutId)
  const layer = getEffectiveLayer()
  const state = mainStateRef.current

  const order = getLayerPriorityOrder()
  let binding = null
  let bindingLayer = null
  for (const L of order) {
    binding = findBinding(L, state, lookupId)
    if (binding) {
      bindingLayer = L
      break
    }
  }
  if (!binding) return false

  const ctx = { layer: bindingLayer, state }
  let handled = false
  for (const featureId of binding.features) {
    const entry = features.get(featureId)
    if (!entry || typeof entry.handler !== 'function') continue
    if (entry.handler(e, ctx)) {
      handled = true
      break
    }
  }
  if (handled) {
    e.preventDefault()
    e.stopPropagation()
    e.__hotkeyHandled = true
  }
  return handled
}

export function getRegistry() {
  return { features, bindings, setBindings, registerFeature, unregisterFeature, dispatch, setMainState, getMainState }
}
