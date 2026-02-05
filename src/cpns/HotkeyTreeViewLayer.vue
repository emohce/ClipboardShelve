<template>
  <div class="layer-node">
    <div class="layer-header" @click="handleToggle">
      <span class="expand-icon">{{ isExpanded ? '−' : '+' }}</span>
      <span class="layer-label">{{ getLayerLabel(node.layer, node.state) }}</span>
      <span v-if="node.state" class="layer-state">（状态: {{ getStateLabel(node.state) }}）</span>
    </div>
    <div v-if="isExpanded" class="layer-content">
      <div v-for="(shortcut, idx) in node.shortcuts" :key="`${node.layer}-${shortcut.shortcutId}-${idx}`" class="shortcut-node">
        <ShortcutNode
          :shortcut="shortcut"
          :layer="node.layer"
          :state="node.state"
          :expanded-keys="expandedKeys"
          :depth="depth + 1"
          @toggle-expand="handleShortcutToggle"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getLayerLabel } from '../global/hotkeyLabels'
import ShortcutNode from './HotkeyTreeViewShortcut.vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
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

const nodeKey = computed(() => `layer-${props.node.layer}-${props.node.state || ''}`)
const isExpanded = computed(() => props.expandedKeys.has(nodeKey.value))

function getStateLabel(state) {
  const labels = {
    search: '搜索',
    'multi-select': '多选',
    normal: '正常'
  }
  return labels[state] || state
}

function handleToggle() {
  emit('toggle-expand', nodeKey.value)
}

function handleShortcutToggle(key) {
  emit('toggle-expand', key)
}
</script>

<style lang="less" scoped>
.layer-node {
  margin-bottom: 4px;
}

.layer-header {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.layer-header:hover {
  background-color: var(--text-bg-color);
}

.layer-header {
  font-weight: 600;
  font-size: 15px;
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

.layer-label {
  font-weight: 500;
  color: var(--text-color);
}

.layer-state {
  margin-left: 4px;
  font-size: 12px;
  color: var(--text-color-lighter);
}

.layer-content {
  margin-left: 22px;
  padding-left: 8px;
  border-left: 2px solid var(--text-bg-color-lighter);
}
</style>
