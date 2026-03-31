<template>
  <div class="clip-search">
    <input
      class="clip-search-input"
      @focusout="handleFocusOut"
      @keydown="handleKeyDown"
      v-model="filterText"
      type="text"
      :placeholder="placeholderOverride || (itemCount ? `在 ${itemCount} 条历史中检索` : '检索剪贴板历史')"
    />
    <span v-show="filterText" @click="clear" class="clip-search-suffix" title="清空搜索">×</span>
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
  placeholderOverride: {
    type: String,
    default: ''
  }
})

const filterText = ref('')
const emit = defineEmits(['update:modelValue', 'onPanelHide', 'onEmpty'])
// filterText变了 通知父组件修改 modelValue的值
watch(filterText, (val, prev) => {
  emit('update:modelValue', val)
  if (prev && !val) {
    // 删除到空字符串时，通知父组件退出搜索
    emit('onEmpty')
  }
})

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

const handleKeyDown = (e) => {
  // keep minimal work in keydown to avoid UI stalls
  // 当光标在末尾且没有选中文本时，Delete 键应该删除条目而不是删除文本
  if (e.key === 'Delete') {
    const input = e.target
    const isAtEnd = input.selectionStart === input.selectionEnd &&
                    input.selectionStart === input.value.length
    if (isAtEnd) {
      // 阻止默认的删除文本行为，但让事件继续冒泡以便父组件处理删除条目
      e.preventDefault()
      // 在事件对象上添加标记，表示应该删除条目
      e.shouldDeleteItem = true
      // 不阻止冒泡，让事件继续传播到 document 级别的事件处理器
    }
  }
  // Backspace 保持默认行为，用于删除搜索框中的文本
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
