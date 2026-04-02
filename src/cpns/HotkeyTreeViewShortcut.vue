<template>
  <div class="shortcut-node">
    <div class="shortcut-header">
      <div class="shortcut-key-list">
        <span
          v-for="shortcut in shortcutDisplays"
          :key="shortcut"
          class="shortcut-key"
        >
          {{ shortcut }}
        </span>
      </div>
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
import { formatShortcutDisplay } from '../global/shortcutKey'

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

function getFeatureSummaryLabels(featureIds) {
  const ids = [...new Set(featureIds || [])]
  if (!ids.length) return []
  if (ids.every((id) => /^clear-dialog-range-/.test(String(id)))) {
    return ['选择清除范围']
  }
  return ids.map(getFeatureLabel)
}

function compressNumericTextRanges(texts) {
  const normalized = [...new Set((texts || []).filter(Boolean))]
  const grouped = new Map()

  for (const text of normalized) {
    const match = String(text).match(/^(.*?)(\d+)(\D*)$/)
    if (!match) {
      grouped.set(`plain:${text}`, { plain: text })
      continue
    }
    const [, prefix, num, suffix] = match
    const key = `${prefix}::${suffix}`
    if (!grouped.has(key)) {
      grouped.set(key, { prefix, suffix, values: [] })
    }
    grouped.get(key).values.push(Number(num))
  }

  return Array.from(grouped.values()).map((entry) => {
    if (entry.plain) return entry.plain
    const values = [...new Set(entry.values)].sort((a, b) => a - b)
    if (!values.length) return `${entry.prefix}${entry.suffix}`
    const segments = []
    let start = values[0]
    let prev = values[0]

    for (let i = 1; i < values.length; i++) {
      const current = values[i]
      if (current === prev + 1) {
        prev = current
        continue
      }
      segments.push(
        start === prev
          ? `${entry.prefix}${start}${entry.suffix}`
          : `${entry.prefix}${start}~${prev}${entry.suffix}`
      )
      start = current
      prev = current
    }

    segments.push(
      start === prev
        ? `${entry.prefix}${start}${entry.suffix}`
        : `${entry.prefix}${start}~${prev}${entry.suffix}`
    )

    return segments.join(', ')
  })
}

const featureLabels = computed(() => {
  const labels = getFeatureSummaryLabels(props.shortcut.features || [])
  return compressNumericTextRanges(labels)
})
const shortcutDisplays = computed(() => {
  const labels = (props.shortcut.shortcutIds || [])
    .map((shortcutId) => formatShortcutDisplay(shortcutId))
    .filter(Boolean)
  return compressNumericTextRanges(labels)
})
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

.shortcut-key-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 110px;
  max-width: 220px;
  flex-shrink: 0;
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
  text-align: center;
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
