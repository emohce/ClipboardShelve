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
  border: 1px solid rgba(22, 32, 51, 0.18);
  background: linear-gradient(180deg, #ffffff 0%, #eef4fb 100%);
  color: #355f9d;
  font-size: 12px;
  font-weight: 700;
}

.setting-inline-help {
  width: 20px;
  height: 20px;
  border: 1px solid rgba(22, 32, 51, 0.18);
  background: rgba(255, 255, 255, 0.96);
  color: #5e6b7d;
  font-size: 11px;
  font-weight: 700;
}

.setting-help-btn:hover,
.setting-inline-help:hover {
  border-color: rgba(53, 95, 157, 0.32);
  color: #355f9d;
  background: #fff;
}

:global(.setting-help-tooltip) {
  max-width: min(420px, calc(100vw - 32px));
  padding: 8px 10px;
  border: 1px solid rgba(22, 32, 51, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.16);
  color: #162033;
  font-size: 12px;
  line-height: 1.45;
  white-space: normal;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
</style>
