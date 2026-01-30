<template>
  <Transition :name="placement === 'right' ? 'drawer-right' : 'fade'">
    <div
      v-if="show"
      class="clip-drawer-menu"
      :class="{ 'clip-drawer-menu--right': placement === 'right' }"
      :style="drawerStyle"
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
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { activateLayer, deactivateLayer } from '../global/hotkeyLayers'
import { registerFeature } from '../global/hotkeyRegistry'

const props = defineProps({
  show: { type: Boolean, required: true },
  items: { type: Array, required: true },
  position: { type: Object, required: true },
  defaultActive: { type: Number, default: 0 },
  /** 'popup' 浮层定位 | 'right' 右侧抽屉，保留主列表可见 */
  placement: { type: String, default: 'right' }
})

const emit = defineEmits(['select', 'close', 'reorder'])

const drawerStyle = computed(() => {
  if (props.placement === 'right') {
    return { right: 0, top: 0, bottom: 0, width: '260px', left: 'auto' }
  }
  return { top: props.position.top + 'px', left: props.position.left + 'px' }
})

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

const layerName = 'clip-drawer'

function registerDrawerFeatures() {
  registerFeature('drawer-close', () => {
    emit('close')
    return true
  })
  registerFeature('drawer-nav-down', () => {
    activeIndex.value = (activeIndex.value + 1) % localItems.value.length
    return true
  })
  registerFeature('drawer-nav-up', () => {
    activeIndex.value = (activeIndex.value - 1 + localItems.value.length) % localItems.value.length
    return true
  })
  registerFeature('drawer-select', () => {
    const target = localItems.value[activeIndex.value]
    if (target) { handleSelect(target, { sub: false }); return true }
    return false
  })
  for (let n = 1; n <= 9; n++) {
    const num = n
    registerFeature(`drawer-select-${num}`, (e) => {
      if (num >= 1 && num <= localItems.value.length) {
        const target = localItems.value[num - 1]
        handleSelect(target, { sub: e.shiftKey })
        return true
      }
      return false
    })
  }
  registerFeature('drawer-block', () => true)
}

onMounted(() => {
  registerDrawerFeatures()
})

watch(
  () => props.show,
  (visible) => {
    if (visible) {
      activateLayer(layerName)
    } else {
      deactivateLayer(layerName)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  deactivateLayer(layerName)
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
.clip-drawer-menu--right {
  border-radius: 8px 0 0 8px;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.2);
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
.drawer-right-enter-active,
.drawer-right-leave-active {
  transition: transform 0.2s ease;
}
.drawer-right-enter-from,
.drawer-right-leave-to {
  transform: translateX(100%);
}
</style>
