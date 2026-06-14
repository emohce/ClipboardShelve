import { getLayerPriority } from './hotkeyLayers.js'

const LAYER_CONTEXT_KEY_MAP = {
  'clear-dialog': 'clearDialogOpen',
  'clip-drawer': 'drawerOpen',
  'full-data-overlay': 'fullDataOpen',
  'tag-search': 'tagSearchOpen',
  'tag-edit': 'tagEditOpen',
  'pin-group-edit': 'pinGroupEditOpen'
}

const EDITABLE_TARGET_SELECTOR = [
  'input',
  'textarea',
  '[contenteditable="true"]',
  '.el-input',
  '.el-textarea',
  '.el-select',
  '.el-input-number'
].join(', ')

export function isEditableHotkeyTarget(target) {
  if (!target) return false
  if (target.isContentEditable) return true
  if (typeof target.closest !== 'function') return false
  return Boolean(target.closest(EDITABLE_TARGET_SELECTOR))
}

function toLayerSet(currentLayer, activeLayers) {
  const names = new Set(Array.isArray(activeLayers) ? activeLayers.filter(Boolean) : [])
  if (currentLayer) names.add(currentLayer)
  return names
}

export function buildHotkeyContextSnapshot(options = {}) {
  const {
    currentLayer = null,
    activeLayers = [],
    mainState = 'normal',
    target = null,
    searchInputFocus = false,
    extra = {}
  } = options

  const layers = toLayerSet(currentLayer, activeLayers)
  const settingFocus = currentLayer === 'setting' || layers.has('setting')
  const inputFocus = isEditableHotkeyTarget(target)
  const mainPriority = getLayerPriority('main')
  const hasHigherLayer = [...layers].some((l) => l !== 'main' && getLayerPriority(l) > mainPriority)

  const context = {
    appFocus: true,
    mainFocus: !settingFocus && !hasHigherLayer,
    settingFocus,
    searchActive: mainState === 'search',
    inputFocus,
    searchInputFocus: Boolean(searchInputFocus),
    clearDialogOpen: false,
    drawerOpen: false,
    fullDataOpen: false,
    tagSearchOpen: false,
    tagEditOpen: false,
    pinGroupEditOpen: false
  }

  for (const layer of layers) {
    const contextKey = LAYER_CONTEXT_KEY_MAP[layer]
    if (contextKey) context[contextKey] = true
  }

  return {
    ...context,
    ...extra
  }
}

export { LAYER_CONTEXT_KEY_MAP }
