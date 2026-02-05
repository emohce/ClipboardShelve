<template>
  <div class="shortcut-node">
    <div class="shortcut-header" @click="handleToggle">
      <span v-if="hasChildren" class="expand-icon">{{ isExpanded ? '−' : '+' }}</span>
      <span v-else class="expand-placeholder"></span>
      <span class="shortcut-key">{{ shortcut.shortcutId }}</span>
      <span class="shortcut-features">{{ featureDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getFeatureLabel, getLayerLabel } from '../global/hotkeyLabels'

const props = defineProps({
  shortcut: {
    type: Object,
    required: true
  },
  layer: {
    type: String,
    required: true
  },
  state: {
    type: String,
    default: null
  },
  expandedKeys: {
    type: Set,
    required: true
  },
  depth: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['toggle-expand'])

const nodeKey = computed(() => `shortcut-${props.layer}-${props.state || ''}-${props.shortcut.shortcutId}`)
const hasChildren = computed(() => false)
const isExpanded = computed(() => false)

const featureDisplay = computed(() => {
  const layerLabel = getLayerLabel(props.layer, props.state)
  const featureLabels = props.shortcut.features.map(getFeatureLabel)
  return featureLabels.map((label) => `[${layerLabel}-${label}]`).join(' ')
})

function handleToggle() {
  // No children, no toggle needed
}
</script>

<style lang="less" scoped>
.shortcut-node {
  margin-bottom: 2px;
}

.shortcut-header {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-height: 28px;
}

.shortcut-header:hover {
  background-color: var(--text-bg-color);
}

.expand-icon {
  display: inline-block;
  width: 18px;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
  color: var(--primary-color);
  margin-right: 4px;
}

.expand-placeholder {
  display: inline-block;
  width: 18px;
  margin-right: 4px;
}

.shortcut-key {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 6px;
  background: var(--text-bg-color);
  border: 1px solid var(--text-bg-color-lighter);
  border-radius: 3px;
  color: var(--primary-color);
  margin-right: 8px;
  min-width: 80px;
  text-align: center;
}

.shortcut-features {
  flex: 1;
  font-size: 12px;
  color: var(--text-color-lighter);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-children {
  margin-left: 22px;
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--text-bg-color-lighter);
}

.child-layer-wrapper {
  margin-bottom: 4px;
}
</style>
