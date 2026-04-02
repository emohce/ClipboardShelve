<template>
  <div class="layer-node">
    <div class="layer-header" :class="{ expanded: isExpanded }" @click="handleToggle">
      <div class="layer-header-main">
        <span class="expand-icon">{{ isExpanded ? '−' : '+' }}</span>
        <span class="layer-label">{{ getLayerLabel(node.layer, node.state) }}</span>
        <span v-if="node.state" class="layer-state">{{ getStateLabel(node.state) }}</span>
      </div>
      <span class="layer-count">{{ shortcutCount }} 项</span>
    </div>
    <div v-if="isExpanded" class="layer-content">
      <div v-for="(shortcut, idx) in node.shortcuts" :key="`${node.layer}-${(shortcut.shortcutIds || []).join('-')}-${idx}`" class="shortcut-node">
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
const shortcutCount = computed(() => props.node.shortcuts?.length || 0)

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
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  border-radius: 14px;
  border: 1px solid var(--border-color, var(--text-bg-color-lighter));
  background: var(--bg-soft-color, var(--text-bg-color));
  transition: all 0.2s;
}

.layer-header:hover {
  background-color: var(--nav-hover-bg-color, var(--text-bg-color));
}

.layer-header.expanded {
  border-color: var(--primary-color);
  background: var(--bg-elevated-color, #fff);
  box-shadow: 0 14px 28px rgba(37, 99, 235, 0.08);
}

.layer-header-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.expand-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  line-height: 20px;
  text-align: center;
  font-weight: bold;
  font-size: 14px;
  color: var(--primary-color);
  border-radius: 999px;
  background: var(--bg-elevated-color, #fff);
}

.layer-label {
  font-weight: 600;
  font-size: 14px;
  color: var(--text-color);
}

.layer-state {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--primary-color);
  background: var(--bg-elevated-color, #fff);
}

.layer-count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-color-lighter);
}

.layer-content {
  margin-left: 14px;
  margin-top: 10px;
  padding-left: 12px;
  border-left: 2px solid var(--border-color, var(--text-bg-color-lighter));
}
</style>
