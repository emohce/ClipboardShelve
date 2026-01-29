<template>
  <div class="clip-float-btn" @click="handleBtnClick" title="清除记录">
    <div>{{ props.icon }}</div>
  </div>
</template>

<script setup>
const emit = defineEmits(['onBtnClick'])
const handleBtnClick = () => emit('onBtnClick')
const props = defineProps({
  icon: {
    type: String,
    default: '🌎'
  }
})
</script>
