<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="clip-drawer-menu"
      :style="{ top: position.top + 'px', left: position.left + 'px' }"
      @click.stop
    >
      <div
        v-for="(op, idx) in localItems"
        :key="op.id"
        class="drawer-item"
        :class="{ active: idx === activeIndex }"
        :title="op.title"
        draggable="true"
        @dragstart="onDragStart(idx)"
        @dragover.prevent
        @drop="onDrop(idx)"
        @click.stop="handleSelect(op, { sub: false })"
      >
        <span class="drawer-index">{{ idx + 1 }}</span>
        <span class="drawer-icon">{{ op.icon }}</span>
        <span class="drawer-title">{{ op.title }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  items: { type: Array, required: true },
  position: { type: Object, required: true },
  defaultActive: { type: Number, default: 0 }
})

const emit = defineEmits(['select', 'close', 'reorder'])

const localItems = ref([])
const activeIndex = ref(0)
const draggingIndex = ref(null)

watch(
  () => props.items,
  (val) => {
    localItems.value = [...val]
    activeIndex.value = Math.min(props.defaultActive, Math.max(val.length - 1, 0))
  },
  { immediate: true }
)

watch(
  () => props.show,
  (val) => {
    if (val) {
      activeIndex.value = Math.min(props.defaultActive, Math.max(localItems.value.length - 1, 0))
    }
  }
)

const handleSelect = (op, meta = {}) => {
  emit('select', op, meta)
}

const onDragStart = (idx) => {
  draggingIndex.value = idx
}

const onDrop = (idx) => {
  if (draggingIndex.value === null || draggingIndex.value === idx) return
  const list = [...localItems.value]
  const [moved] = list.splice(draggingIndex.value, 1)
  list.splice(idx, 0, moved)
  localItems.value = list
  draggingIndex.value = null
  emit('reorder', list)
}

const keydownHandler = (e) => {
  if (!props.show) return
  const { key, ctrlKey, metaKey, shiftKey, altKey } = e
  const isCtrl = ctrlKey || metaKey
  
  // 立即阻止所有Ctrl组合键，防止穿透
  if (isCtrl) {
    e.preventDefault()
    e.stopPropagation()
    
    // 处理抽屉内部的Ctrl+数字功能
    const num = parseInt(key, 10)
    if (!Number.isNaN(num) && num >= 1 && num <= localItems.value.length) {
      const target = localItems.value[num - 1]
      handleSelect(target, { sub: isCtrl && shiftKey })
      return
    }
    
    // 其他Ctrl组合键直接阻止
    return
  }
  
  // 阻止所有可能穿透的快捷键
  if (key === 'Escape' || key === 'ArrowLeft') {
    emit('close')
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  if (key === 'ArrowDown') {
    activeIndex.value = (activeIndex.value + 1) % localItems.value.length
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  if (key === 'ArrowUp') {
    activeIndex.value = (activeIndex.value - 1 + localItems.value.length) % localItems.value.length
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  if (key === 'Enter') {
    const target = localItems.value[activeIndex.value]
    if (target) {
      handleSelect(target, { sub: isCtrl && shiftKey })
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }
  
  // 阻止所有其他快捷键穿透，确保只在本层使用
  e.preventDefault()
  e.stopPropagation()
}

onMounted(() => {
  document.addEventListener('keydown', keydownHandler, true) // 使用捕获阶段
})

onUnmounted(() => {
  document.removeEventListener('keydown', keydownHandler, true) // 使用捕获阶段
})
</script>

<style lang="less" scoped>
.clip-drawer-menu {
  position: fixed;
  z-index: 20;
  background: rgba(30, 30, 30, 0.92);
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  min-width: 180px;
  padding: 6px 0;
  backdrop-filter: blur(8px);
}
.drawer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
}
.drawer-item.active,
.drawer-item:hover {
  background: rgba(255, 255, 255, 0.12);
}
.drawer-index {
  font-weight: 600;
  opacity: 0.7;
  width: 16px;
  text-align: right;
}
.drawer-icon {
  width: 20px;
  text-align: center;
}
.drawer-title {
  flex: 1;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
