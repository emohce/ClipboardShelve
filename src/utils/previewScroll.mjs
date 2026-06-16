export const PREVIEW_SCROLL_ACCELERATION_INTERVAL_MS = 500
export const PREVIEW_SCROLL_ACCELERATION_FACTOR = 0.2
export const PREVIEW_SCROLL_VERTICAL_BASE_RATIO = 0.55
export const PREVIEW_SCROLL_HORIZONTAL_BASE_RATIO = 0.45
export const PREVIEW_SCROLL_MAX_RATIO = 0.9

export function computePreviewScrollStep(options = {}) {
  const axisSize = Math.max(1, Number(options.axisSize) || 0)
  const heldMs = Math.max(0, Number(options.heldMs) || 0)
  const baseRatio = Math.max(0, Number(options.baseRatio) || PREVIEW_SCROLL_VERTICAL_BASE_RATIO)
  const maxRatio = Math.max(baseRatio, Number(options.maxRatio) || PREVIEW_SCROLL_MAX_RATIO)
  const level = Math.floor(heldMs / PREVIEW_SCROLL_ACCELERATION_INTERVAL_MS)
  const ratio = Math.min(maxRatio, baseRatio * (1 + level * PREVIEW_SCROLL_ACCELERATION_FACTOR))
  return Math.max(1, Math.round(axisSize * ratio))
}

export function getPreviewScrollAxis(direction) {
  if (direction === 'left' || direction === 'right') return 'x'
  if (direction === 'up' || direction === 'down') return 'y'
  return ''
}

export function getPreviewScrollDelta(options = {}) {
  const direction = options.direction
  const axis = getPreviewScrollAxis(direction)
  if (!axis) return 0
  const baseRatio =
    axis === 'x'
      ? PREVIEW_SCROLL_HORIZONTAL_BASE_RATIO
      : PREVIEW_SCROLL_VERTICAL_BASE_RATIO
  const step = computePreviewScrollStep({
    heldMs: options.heldMs,
    axisSize: options.axisSize,
    baseRatio,
    maxRatio: options.maxRatio
  })
  if (direction === 'up' || direction === 'left') return -step
  return step
}
