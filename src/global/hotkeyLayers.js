import { reactive } from 'vue'

const layerStack = reactive([])
const hotkeyState = reactive({
  currentLayer: null,
  action: null,
  sourceLayer: null
})

const LAYER_PRIORITY = {
  main: 10,
  setting: 20,
  'clip-drawer': 30,
  'clear-dialog': 35,
  'full-data-overlay': 35,
  'tag-search': 35,
  'tag-edit': 40,
  'pin-group-edit': 40,
  'setting-shortcut-record': 50,
  'setting-when-edit': 50,
}

export const getLayerPriority = (name) => LAYER_PRIORITY[name] ?? 0

export const getLayerPriorityStack = (layers) => {
  const source = layers != null ? layers : layerStack.map((l) => l.name)
  const indexed = [...new Set([...source, 'main'])].map((name, index) => ({ name, index }))
  return indexed
    .sort((a, b) => {
      const diff = getLayerPriority(b.name) - getLayerPriority(a.name)
      return diff !== 0 ? diff : b.index - a.index
    })
    .map((item) => item.name)
}

export const activateLayer = (name) => {
  if (!name) return
  const idx = layerStack.findIndex((layer) => layer.name === name)
  if (idx !== -1) {
    layerStack.splice(idx, 1)
  }
  layerStack.push({ name })
  hotkeyState.currentLayer = layerStack[layerStack.length - 1]?.name || null
}

export const deactivateLayer = (name) => {
  if (!name) return
  const idx = layerStack.findIndex((layer) => layer.name === name)
  if (idx !== -1) {
    layerStack.splice(idx, 1)
  }
  hotkeyState.currentLayer = layerStack[layerStack.length - 1]?.name || null
}

export const setHotkeyAction = (action, sourceLayer = null) => {
  hotkeyState.action = action
  hotkeyState.sourceLayer = sourceLayer || hotkeyState.currentLayer
}

export const clearHotkeyAction = () => {
  hotkeyState.action = null
  hotkeyState.sourceLayer = null
}

export const getHotkeyState = () => hotkeyState
export const getCurrentLayer = () => hotkeyState.currentLayer
export const getActiveLayers = () => layerStack.map((layer) => layer.name)

export const clearLayers = () => {
  layerStack.splice(0, layerStack.length)
}
