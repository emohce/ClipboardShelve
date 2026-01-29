import { reactive } from 'vue'

const layerStack = reactive([])

export const activateLayer = (name, handler) => {
  if (!name) return
  const idx = layerStack.findIndex((layer) => layer.name === name)
  if (idx !== -1) {
    layerStack.splice(idx, 1)
  }
  layerStack.push({ name, handler })
}

export const deactivateLayer = (name) => {
  if (!name) return
  const idx = layerStack.findIndex((layer) => layer.name === name)
  if (idx !== -1) {
    layerStack.splice(idx, 1)
  }
}

export const handleLayerKeyDown = (event) => {
  if (event && event.__layerHandled) {
    return true
  }
  for (let i = layerStack.length - 1; i >= 0; i -= 1) {
    const handler = layerStack[i].handler
    if (typeof handler === 'function') {
      const handled = handler(event)
      if (handled) {
        if (event) {
          event.__layerHandled = true
        }
        return true
      }
    }
  }
  return false
}

export const getActiveLayers = () => layerStack.map((layer) => layer.name)

export const clearLayers = () => {
  layerStack.splice(0, layerStack.length)
}
