import { reactive } from 'vue'

const layerStack = reactive([])
const hotkeyState = reactive({
  currentLayer: null,
  action: null,
  sourceLayer: null
})

export const activateLayer = (name, handler) => {
  if (!name) return
  const idx = layerStack.findIndex((layer) => layer.name === name)
  if (idx !== -1) {
    layerStack.splice(idx, 1)
  }
  layerStack.push({ name, handler })
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

export const handleLayerKeyDown = (event) => {
  clearHotkeyAction()
  hotkeyState.currentLayer = layerStack[layerStack.length - 1]?.name || null
  if (!hotkeyState.currentLayer) {
    return false
  }
  if (event && event.__layerHandled) {
    return true
  }
  const handler = layerStack[layerStack.length - 1]?.handler
  if (typeof handler !== 'function') {
    return false
  }
  const handled = handler(event)
  if (handled && event) {
    event.__layerHandled = true
  }
  return Boolean(handled)
}

export const getActiveLayers = () => layerStack.map((layer) => layer.name)

export const clearLayers = () => {
  layerStack.splice(0, layerStack.length)
}
