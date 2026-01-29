<template>
  <div class="clip-full-data">
    <Transition name="fade">
      <div class="clip-full-wrapper" v-show="isShow">
        <div class="clip-full-operate-list">
          <ClipOperate
            :item="fullData"
            :isFullData="true"
            @onDataRemove="emit('onDataRemove')"
            @onOperateExecute="emit('onOverlayClick')"
          ></ClipOperate>
        </div>
        <template v-if="fullData.type === 'text'">
          <div class="clip-full-content" v-text="fullData.data"></div>
        </template>
        <div v-else-if="fullData.type === 'image'">
          <div class="clip-full-content">
            <img :src="fullData.data" />
          </div>
        </div>
        <div v-else-if="fullData.type === 'file'">
          <FileList class="clip-full-content" :data="JSON.parse(fullData.data)"></FileList>
        </div>
      </div>
    </Transition>
    <div class="clip-overlay" v-show="isShow" @click="onOverlayClick"></div>
  </div>
</template>

<script setup>
import FileList from './FileList.vue'
import ClipOperate from './ClipOperate.vue'
import { onMounted, onUnmounted } from 'vue'

const props = defineProps({
  isShow: {
    type: Boolean,
    required: true
  },
  fullData: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['onOverlayClick', 'onDataRemove'])

const onOverlayClick = () => {
  emit('onOverlayClick')
}

const keyDownCallBack = (e) => {
  if (!props.isShow) return
  const { key, ctrlKey, metaKey, shiftKey, altKey } = e
  const isCtrl = ctrlKey || metaKey
  
  if (key === 'Escape' && props.fullData.data) {
    // 有值时执行退出 Overlay
    emit('onOverlayClick')
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  // 阻止所有其他快捷键穿透到底层
  if (isCtrl || altKey) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
  
  // 阻止导航键穿透
  if (['Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(key)) {
    e.preventDefault()
    e.stopPropagation()
    return
  }
}

onMounted(() => {
  document.addEventListener('keydown', keyDownCallBack)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keyDownCallBack)
})
</script>

<style lang="less" scoped>
@import '../style';
.fade-enter-active,
.fade-leave-active {
  transition: all 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  width: 0px;
  opacity: 0;
}
</style>
