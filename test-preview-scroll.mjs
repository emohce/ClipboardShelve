import assert from 'node:assert/strict'

import {
  PREVIEW_SCROLL_ACCELERATION_INTERVAL_MS,
  computePreviewScrollStep,
  getPreviewScrollAxis,
  getPreviewScrollDelta
} from './src/utils/previewScroll.mjs'

function testUsesBaseStepBeforeAcceleration() {
  assert.equal(computePreviewScrollStep({ heldMs: 0, axisSize: 1000, baseRatio: 0.55 }), 550)
  assert.equal(
    computePreviewScrollStep({
      heldMs: PREVIEW_SCROLL_ACCELERATION_INTERVAL_MS - 1,
      axisSize: 1000,
      baseRatio: 0.55
    }),
    550
  )
}

function testAcceleratesEveryFiveHundredMs() {
  assert.equal(computePreviewScrollStep({ heldMs: 500, axisSize: 1000, baseRatio: 0.45 }), 540)
  assert.equal(computePreviewScrollStep({ heldMs: 1000, axisSize: 1000, baseRatio: 0.45 }), 630)
}

function testCapsAtMaxRatio() {
  assert.equal(computePreviewScrollStep({ heldMs: 8000, axisSize: 1000, baseRatio: 0.55, maxRatio: 0.9 }), 900)
}

function testReturnsAxisForDirections() {
  assert.equal(getPreviewScrollAxis('up'), 'y')
  assert.equal(getPreviewScrollAxis('down'), 'y')
  assert.equal(getPreviewScrollAxis('left'), 'x')
  assert.equal(getPreviewScrollAxis('right'), 'x')
}

function testComputesDirectionalDelta() {
  assert.equal(getPreviewScrollDelta({ direction: 'down', axisSize: 1000, heldMs: 0 }), 550)
  assert.equal(getPreviewScrollDelta({ direction: 'up', axisSize: 1000, heldMs: 0 }), -550)
  assert.equal(getPreviewScrollDelta({ direction: 'right', axisSize: 1000, heldMs: 0 }), 450)
  assert.equal(getPreviewScrollDelta({ direction: 'left', axisSize: 1000, heldMs: 0 }), -450)
}

testUsesBaseStepBeforeAcceleration()
testAcceleratesEveryFiveHundredMs()
testCapsAtMaxRatio()
testReturnsAxisForDirections()
testComputesDirectionalDelta()

console.log('preview scroll tests passed')
