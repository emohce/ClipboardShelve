<template>
  <slot></slot>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { dispatch, setBindings } from '../global/hotkeyRegistry'
import {
  getEffectiveBindings,
  HOTKEY_BINDINGS_UPDATED_EVENT,
  HOTKEY_BINDINGS_VERSION
} from '../global/hotkeyBindings'

function keydownHandler(e) {
  dispatch(e)
}

function refreshBindings() {
  setBindings(getEffectiveBindings(), HOTKEY_BINDINGS_VERSION)
}

onMounted(() => {
  refreshBindings()
  document.addEventListener('keydown', keydownHandler, true)
  window.addEventListener('focus', refreshBindings)
  window.addEventListener(HOTKEY_BINDINGS_UPDATED_EVENT, refreshBindings)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keydownHandler, true)
  window.removeEventListener('focus', refreshBindings)
  window.removeEventListener(HOTKEY_BINDINGS_UPDATED_EVENT, refreshBindings)
})

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    refreshBindings()
  })
}
</script>
