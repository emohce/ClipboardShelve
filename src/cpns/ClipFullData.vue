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
import { watch, onMounted, onUnmounted } from 'vue'
import { activateLayer, deactivateLayer } from '../global/hotkeyLayers'
import { registerFeature } from '../global/hotkeyRegistry'

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

const FULL_DATA_LAYER = 'full-data-overlay'

function registerFullDataFeatures() {
  registerFeature('full-data-close', () => {
    if (props.fullData.data) {
      emit('onOverlayClick')
      return true
    }
    return false
  })
  registerFeature('full-data-block', () => true)
}

onMounted(() => {
  registerFullDataFeatures()
})

watch(
  () => props.isShow,
  (visible) => {
    if (visible) {
      activateLayer(FULL_DATA_LAYER)
    } else {
      deactivateLayer(FULL_DATA_LAYER)
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  deactivateLayer(FULL_DATA_LAYER)
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
