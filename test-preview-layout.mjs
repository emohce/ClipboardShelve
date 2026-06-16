import assert from 'node:assert/strict'

import {
  TEXT_PREVIEW_WRAP_LINE_LIMIT,
  computeImagePreviewLayout,
  getTextPreviewMode
} from './src/utils/previewLayout.mjs'

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 0.001, `${message}: expected ${expected}, got ${actual}`)
}

function testTextPreviewWrapsUpToLineLimit() {
  assert.equal(getTextPreviewMode('single line long text').wrapText, true)
  assert.equal(getTextPreviewMode(Array(TEXT_PREVIEW_WRAP_LINE_LIMIT).fill('line').join('\n')).wrapText, true)
  assert.equal(getTextPreviewMode(Array(TEXT_PREVIEW_WRAP_LINE_LIMIT + 1).fill('line').join('\n')).wrapText, false)
}

function testImagePreviewShowsWholeImageWhenOriginalFits() {
  const layout = computeImagePreviewLayout({
    naturalWidth: 300,
    naturalHeight: 160,
    availableWidth: 800,
    availableHeight: 600
  })

  assert.equal(layout.layoutMode, 'centered')
  assert.equal(layout.canScrollX, false)
  assert.equal(layout.canScrollY, false)
  assertClose(layout.displayWidth, 300, 'display width')
  assertClose(layout.displayHeight, 160, 'display height')
}

function testImagePreviewShowsWholeImageWhenShrinkWithinTwoTimes() {
  const layout = computeImagePreviewLayout({
    naturalWidth: 1600,
    naturalHeight: 1200,
    availableWidth: 800,
    availableHeight: 600
  })

  assert.equal(layout.layoutMode, 'centered')
  assert.equal(layout.canScrollX, false)
  assert.equal(layout.canScrollY, false)
  assertClose(layout.displayWidth, 800, 'display width')
  assertClose(layout.displayHeight, 600, 'display height')
}

function testImagePreviewFitsUltraWideImageToNinetyPercentHeight() {
  const layout = computeImagePreviewLayout({
    naturalWidth: 4000,
    naturalHeight: 500,
    availableWidth: 1000,
    availableHeight: 600
  })

  assert.equal(layout.layoutMode, 'fit-height-scroll')
  assert.equal(layout.canScrollX, true)
  assert.equal(layout.canScrollY, false)
  assertClose(layout.displayWidth, 4320, 'display width')
  assertClose(layout.displayHeight, 540, 'display height')
}

function testImagePreviewFitsUltraTallImageToNinetyPercentWidth() {
  const layout = computeImagePreviewLayout({
    naturalWidth: 500,
    naturalHeight: 4000,
    availableWidth: 1000,
    availableHeight: 600
  })

  assert.equal(layout.layoutMode, 'fit-width-scroll')
  assert.equal(layout.canScrollX, false)
  assert.equal(layout.canScrollY, true)
  assertClose(layout.displayWidth, 900, 'display width')
  assertClose(layout.displayHeight, 7200, 'display height')
}

testTextPreviewWrapsUpToLineLimit()
testImagePreviewShowsWholeImageWhenOriginalFits()
testImagePreviewShowsWholeImageWhenShrinkWithinTwoTimes()
testImagePreviewFitsUltraWideImageToNinetyPercentHeight()
testImagePreviewFitsUltraTallImageToNinetyPercentWidth()

console.log('preview layout tests passed')
