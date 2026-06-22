<template>
  <el-tooltip
    :content="content"
    placement="bottom-start"
    :show-after="150"
    effect="light"
    popper-class="setting-help-tooltip"
  >
    <button
      type="button"
      :class="buttonClass"
      :aria-label="ariaLabel"
    >
      {{ marker }}
    </button>
  </el-tooltip>
</template>

<script setup>
defineProps({
  content: {
    type: String,
    required: true
  },
  marker: {
    type: String,
    default: '?'
  },
  ariaLabel: {
    type: String,
    default: '查看说明'
  },
  buttonClass: {
    type: String,
    default: 'setting-inline-help'
  }
})
</script>

<style scoped>
.setting-help-btn,
.setting-inline-help {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.setting-help-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--border-color-strong);
  background: var(--button-surface-gradient);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 700;
}

.setting-inline-help {
  width: 20px;
  height: 20px;
  border: 1px solid var(--border-color-strong);
  background: var(--surface-glass-strong);
  color: var(--text-color-lighter);
  font-size: 11px;
  font-weight: 700;
}

.setting-help-btn:hover,
.setting-inline-help:hover {
  border-color: color-mix(in srgb, var(--primary-color) 32%, transparent);
  color: var(--primary-color);
  background: var(--bg-elevated-color);
}

:global(.setting-help-tooltip) {
  max-width: min(420px, calc(100vw - 32px));
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-elevated-color);
  box-shadow: 0 14px 28px var(--shadow-color);
  color: var(--text-color);
  font-size: 12px;
  line-height: 1.45;
  white-space: normal;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
</style>
