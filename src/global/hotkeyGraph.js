/**
 * Hotkey tree structure builder: converts flat bindings to grouped layers.
 * Groups layers by category: normal layers, dialog layers, etc.
 */

/**
 * Layer categories for grouping.
 */
const LAYER_CATEGORIES = {
  normal: ['main'],
  dialog: ['clear-dialog', 'clip-drawer', 'full-data-overlay', 'tag-search', 'tag-edit']
}

/**
 * Layer display order.
 */
const LAYER_ORDER = [
  'main',
  'clear-dialog',
  'clip-drawer',
  'full-data-overlay',
  'tag-search',
  'tag-edit'
]

/**
 * @typedef {Object} ShortcutNode
 * @property {string} shortcutId
 * @property {string[]} features
 */

/**
 * @typedef {Object} LayerNode
 * @property {string} layer
 * @property {string|null} state
 * @property {ShortcutNode[]} shortcuts
 */

/**
 * Build grouped tree structure from bindings.
 * Returns an array of layer nodes grouped by category.
 * @param {Array<{ layer: string, shortcutId: string, state?: string, features: string[] }>} bindings
 * @returns {LayerNode[]}
 */
export function buildHotkeyTree(bindings) {
  const layerMap = new Map()
  
  // Collect all unique layers and states
  for (const b of bindings) {
    if (b.shortcutId === '*') continue
    
    const state = b.state || null
    const key = `${b.layer}:${state || ''}`
    
    if (!layerMap.has(key)) {
      layerMap.set(key, {
        layer: b.layer,
        state: state,
        shortcuts: []
      })
    }
  }
  
  // Build shortcuts for each layer/state
  for (const [key, layerNode] of layerMap) {
    const layerBindings = bindings.filter((b) => {
      if (b.layer !== layerNode.layer) return false
      if (b.shortcutId === '*') return false
      if (b.state != null && b.state !== layerNode.state) return false
      if (b.state == null && layerNode.state != null) return false
      return true
    })
    
    const shortcutMap = new Map()
    for (const b of layerBindings) {
      const shortcutId = b.shortcutId
      if (!shortcutMap.has(shortcutId)) {
        shortcutMap.set(shortcutId, {
          shortcutId,
          features: []
        })
      }
      const node = shortcutMap.get(shortcutId)
      const features = Array.isArray(b.features) ? b.features : [b.features]
      node.features.push(...features)
    }
    
    layerNode.shortcuts = Array.from(shortcutMap.values()).sort((a, b) => {
      return a.shortcutId.localeCompare(b.shortcutId)
    })
  }
  
  // Sort layers by order, then by state
  const layerNodes = Array.from(layerMap.values()).sort((a, b) => {
    const orderA = LAYER_ORDER.indexOf(a.layer)
    const orderB = LAYER_ORDER.indexOf(b.layer)
    if (orderA !== orderB) {
      return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB)
    }
    // Same layer, sort by state: null first, then others
    if (a.state === null && b.state !== null) return -1
    if (a.state !== null && b.state === null) return 1
    if (a.state === b.state) return 0
    return (a.state || '').localeCompare(b.state || '')
  })
  
  return layerNodes
}


/**
 * Get all bindings for a specific layer/state.
 * @param {string} layer
 * @param {string|null} state
 * @param {Array<{ layer: string, shortcutId: string, state?: string, features: string[] }>} bindings
 * @returns {Array<{ layer: string, shortcutId: string, state?: string, features: string[] }>}
 */
export function getBindingsForLayer(layer, state, bindings) {
  return bindings.filter((b) => {
    if (b.layer !== layer) return false
    if (b.shortcutId === '*') return false
    if (b.state != null && b.state !== state) return false
    if (b.state == null && state != null) return false
    return true
  })
}
