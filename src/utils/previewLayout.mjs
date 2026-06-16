export const TEXT_PREVIEW_WRAP_LINE_LIMIT = 100
export const IMAGE_PREVIEW_EXTREME_RATIO = 3
export const IMAGE_PREVIEW_MIN_FULL_FIT_SCALE = 0.5
export const IMAGE_PREVIEW_SCROLL_AXIS_FILL_RATIO = 0.9

export function getTextPreviewLineCount(text = '') {
  return String(text).split('\n').length
}

export function getTextPreviewMode(text = '') {
  const lineCount = getTextPreviewLineCount(text)
  return {
    lineCount,
    wrapText: lineCount <= TEXT_PREVIEW_WRAP_LINE_LIMIT
  }
}

export function computeImagePreviewLayout(options = {}) {
  const naturalWidth = Number(options.naturalWidth)
  const naturalHeight = Number(options.naturalHeight)
  const availableWidth = Math.max(0, Number(options.availableWidth) || 0)
  const availableHeight = Math.max(0, Number(options.availableHeight) || 0)

  if (!naturalWidth || !naturalHeight || !availableWidth || !availableHeight) {
    return null
  }

  const scaleByWidth = availableWidth / naturalWidth
  const scaleByHeight = availableHeight / naturalHeight
  const fullFitScale = Math.min(scaleByWidth, scaleByHeight, 1)
  const originalFits = naturalWidth <= availableWidth && naturalHeight <= availableHeight
  const canShowWholeImage =
    originalFits || Math.min(scaleByWidth, scaleByHeight) >= IMAGE_PREVIEW_MIN_FULL_FIT_SCALE

  const aspectRatio = naturalWidth / naturalHeight
  const isWideRatio = aspectRatio > IMAGE_PREVIEW_EXTREME_RATIO
  const isTallRatio = aspectRatio < 1 / IMAGE_PREVIEW_EXTREME_RATIO

  if (canShowWholeImage) {
    return {
      displayWidth: naturalWidth * fullFitScale,
      displayHeight: naturalHeight * fullFitScale,
      canScrollX: false,
      canScrollY: false,
      layoutMode: 'centered',
      isSmallImage: originalFits && naturalWidth < availableWidth * 0.6 && naturalHeight < availableHeight * 0.6
    }
  }

  if (isWideRatio) {
    const displayHeight = availableHeight * IMAGE_PREVIEW_SCROLL_AXIS_FILL_RATIO
    const displayWidth = naturalWidth * (displayHeight / naturalHeight)
    return {
      displayWidth,
      displayHeight,
      canScrollX: displayWidth > availableWidth,
      canScrollY: false,
      layoutMode: displayWidth > availableWidth ? 'fit-height-scroll' : 'centered',
      isSmallImage: false
    }
  }

  if (isTallRatio) {
    const displayWidth = availableWidth * IMAGE_PREVIEW_SCROLL_AXIS_FILL_RATIO
    const displayHeight = naturalHeight * (displayWidth / naturalWidth)
    return {
      displayWidth,
      displayHeight,
      canScrollX: false,
      canScrollY: displayHeight > availableHeight,
      layoutMode: displayHeight > availableHeight ? 'fit-width-scroll' : 'centered',
      isSmallImage: false
    }
  }

  return {
    displayWidth: naturalWidth * fullFitScale,
    displayHeight: naturalHeight * fullFitScale,
    canScrollX: false,
    canScrollY: false,
    layoutMode: 'centered',
    isSmallImage: false
  }
}
