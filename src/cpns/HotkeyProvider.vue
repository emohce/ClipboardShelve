<template>
  <slot></slot>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { dispatch, setBindings } from '../global/hotkeyRegistry'
import { getEffectiveBindings } from '../global/hotkeyBindings'

function keydownHandler(e) {
  dispatch(e)
}

onMounted(() => {
  setBindings(getEffectiveBindings())
  document.addEventListener('keydown', keydownHandler, true)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keydownHandler, true)
})
</script>
