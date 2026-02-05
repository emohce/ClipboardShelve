<template>
  <div class="tag-input-container">
    <!-- 标签显示区域 -->
    <div class="tag-list" ref="tagListRef">
      <div 
        v-for="(tag, index) in modelValue" 
        :key="tag"
        class="tag-item"
      >
        {{ tag }}
        <button 
          class="tag-remove"
          @click="removeTag(index)"
          @mousedown.prevent
        >
          ✕
        </button>
      </div>
      
      <!-- 输入框 -->
      <input
        ref="inputRef"
        v-model="inputValue"
        class="tag-input"
        :placeholder="placeholder"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="showSuggestions = true"
        @blur="handleBlur"
      />
    </div>
    
    <!-- 自动补全建议 -->
    <div 
      v-show="showSuggestions && filteredSuggestions.length > 0"
      class="tag-suggestions"
    >
      <div
        v-for="(suggestion, index) in filteredSuggestions"
        :key="suggestion"
        class="suggestion-item"
        :class="{ active: selectedIndex === index }"
        @click="selectSuggestion(suggestion)"
        @mouseenter="selectedIndex = index"
      >
        {{ suggestion }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  suggestions: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: '输入标签...'
  }
})

const emit = defineEmits(['update:modelValue', 'input', 'select'])

// 输入框相关
const inputRef = ref(null)
const tagListRef = ref(null)
const inputValue = ref('')
const showSuggestions = ref(false)
const selectedIndex = ref(-1)

// 过滤建议列表
const filteredSuggestions = computed(() => {
  if (!inputValue.value.trim()) return []
  
  const query = inputValue.value.toLowerCase().trim()
  return props.suggestions
    .filter(tag => 
      tag.toLowerCase().includes(query) && 
      !props.modelValue.includes(tag)
    )
    .slice(0, 8) // 限制显示数量
})

// 监听modelValue变化，更新输入框
watch(() => props.modelValue, () => {
  nextTick(() => {
    focusInput()
  })
})

// 聚焦输入框
const focusInput = () => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
}

// 移除标签
const removeTag = (index) => {
  const newTags = [...props.modelValue]
  newTags.splice(index, 1)
  emit('update:modelValue', newTags)
}

// 添加标签
const addTag = (tag) => {
  const trimmedTag = tag.trim()
  if (!trimmedTag || props.modelValue.includes(trimmedTag)) return
  
  const newTags = [...props.modelValue, trimmedTag]
  emit('update:modelValue', newTags)
  emit('select', trimmedTag)
}

// 处理输入
const handleInput = (e) => {
  const value = e.target.value
  inputValue.value = value
  selectedIndex.value = -1
  emit('input', value)
}

// 处理键盘事件
const handleKeydown = (e) => {
  const suggestions = filteredSuggestions.value
  
  switch (e.key) {
    case 'Enter':
    case 'Tab':
      e.preventDefault()
      
      if (selectedIndex.value >= 0 && suggestions[selectedIndex.value]) {
        // 选择建议项
        selectSuggestion(suggestions[selectedIndex.value])
      } else if (inputValue.value.trim()) {
        // 添加当前输入作为标签
        addTag(inputValue.value)
        inputValue.value = ''
        selectedIndex.value = -1
      }
      break
      
    case 'Backspace':
      if (!inputValue.value && props.modelValue.length > 0) {
        // 删除最后一个标签
        removeTag(props.modelValue.length - 1)
      }
      break
      
    case 'ArrowUp':
      e.preventDefault()
      if (suggestions.length > 0) {
        selectedIndex.value = selectedIndex.value <= 0 
          ? suggestions.length - 1 
          : selectedIndex.value - 1
      }
      break
      
    case 'ArrowDown':
      e.preventDefault()
      if (suggestions.length > 0) {
        selectedIndex.value = selectedIndex.value >= suggestions.length - 1 
          ? 0 
          : selectedIndex.value + 1
      }
      break
      
    case 'Escape':
      showSuggestions.value = false
      selectedIndex.value = -1
      break
  }
}

// 选择建议项
const selectSuggestion = (suggestion) => {
  addTag(suggestion)
  inputValue.value = ''
  showSuggestions.value = false
  selectedIndex.value = -1
}

// 处理失焦
const handleBlur = () => {
  // 延迟隐藏建议，以便点击建议项
  setTimeout(() => {
    showSuggestions.value = false
    selectedIndex.value = -1
  }, 150)
}

// 点击外部隐藏建议
const handleClickOutside = (e) => {
  if (tagListRef.value && !tagListRef.value.contains(e.target)) {
    showSuggestions.value = false
    selectedIndex.value = -1
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  focusInput()
})

// 组件卸载时清理事件监听
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style lang="less" scoped>
.tag-input-container {
  position: relative;
  width: 100%;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  min-height: 40px;
  cursor: text;
  
  &:focus-within {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
}

.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #eff6ff;
  color: #1d4ed8;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  animation: tagAppear 0.2s ease-out;
}

@keyframes tagAppear {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.tag-remove {
  background: none;
  border: none;
  color: #1d4ed8;
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;
  font-size: 12px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 1;
    background: rgba(30, 64, 175, 0.1);
  }
}

.tag-input {
  border: none;
  outline: none;
  background: transparent;
  padding: 4px;
  font-size: 14px;
  flex: 1;
  min-width: 120px;
  
  &::placeholder {
    color: #9ca3af;
  }
}

.tag-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #d1d5db;
  border-top: none;
  border-radius: 0 0 6px 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover,
  &.active {
    background: #f3f4f6;
    color: #1f2937;
  }
  
  &.active {
    background: #eff6ff;
    color: #1d4ed8;
  }
}
</style>
