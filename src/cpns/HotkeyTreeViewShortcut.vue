<template>
  <div class="shortcut-node">
    <div class="shortcut-header">
      <span class="shortcut-key">{{ shortcut.shortcutId }}</span>
      <div class="shortcut-features">
        <span
          v-for="feature in featureLabels"
          :key="feature"
          class="shortcut-feature-chip"
        >
          {{ feature }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getFeatureLabel } from '../global/hotkeyLabels'

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
const featureLabels = computed(() => props.shortcut.features.map(getFeatureLabel))
</script>

<style lang="less" scoped>
.shortcut-node {
  margin-bottom: 8px;
}

.shortcut-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  user-select: none;
  border-radius: 12px;
  border: 1px solid var(--border-color, var(--text-bg-color-lighter));
  background: var(--bg-elevated-color, #fff);
  transition: all 0.18s ease;
  min-height: 28px;
}

.shortcut-header:hover {
  border-color: var(--primary-color);
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
}

.shortcut-key {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  padding: 4px 8px;
  background: var(--bg-soft-color, var(--text-bg-color));
  border: 1px solid var(--border-color, var(--text-bg-color-lighter));
  border-radius: 8px;
  color: var(--primary-color);
  min-width: 80px;
  text-align: center;
  flex-shrink: 0;
}

.shortcut-features {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 1px;
}

.shortcut-feature-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--text-color);
  background: var(--bg-soft-color, var(--text-bg-color));
  border: 1px solid var(--border-color, var(--text-bg-color-lighter));
}
</style>
