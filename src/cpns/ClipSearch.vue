<template>
  <div class="clip-search">
    <input
      class="clip-search-input"
      @focusout="handleFocusOut"
      v-model="filterText"
      type="text"
      :placeholder="itemCount ? `🔍 在${itemCount}条历史中检索...` : '🔍 检索剪贴板历史...'"
    />
    <span v-show="filterText" @click="clear" class="clip-search-suffix">✖</span>
    <span v-if="prioritizeCollect" class="clip-search-indicator" title="已开启收藏优先">⭐</span>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
const props = defineProps({
  modelValue: {
    type: String,
    required: true
  },
  itemCount: {
    type: Number
  },
  prioritizeCollect: {
    type: Boolean,
    default: false
  }
})

const filterText = ref('')
const emit = defineEmits(['update:modelValue', 'onPanelHide'])
// filterText变了 通知父组件修改 modelValue的值
watch(filterText, (val) => emit('update:modelValue', val))

const handleFocusOut = () => {
  // 失去焦点时 如果没有输入内容 则隐藏输入框
  if (!filterText.value) {
    emit('onPanelHide')
  }
}

// modelValue变了 更新 filterText的值
watch(
  () => props.modelValue,
  (val) => (filterText.value = val)
)

const clear = () => {
  emit('update:modelValue', '')
  nextTick(() => window.focus())
}

utools.onPluginEnter(() => {
  // 如果输入框有内容 则清空 并且移除焦点
  if (filterText.value) {
    clear()
    nextTick(() => document.activeElement.blur())
  }
})
</script>

<style lang="less" scoped>
@import '../style';
</style>
