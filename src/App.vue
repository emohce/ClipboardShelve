<template>
  <div class="app">
    <HotkeyProvider>
      <Main @show-setting="settingShown = true" v-if="!settingShown"></Main>
      <transition name="el-fade-in-linear">
        <Setting v-if="settingShown" @back="settingShown = false"></Setting>
      </transition>
    </HotkeyProvider>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import Main from './views/Main.vue'
import Setting from './views/Setting.vue'
import HotkeyProvider from './cpns/HotkeyProvider.vue'
import { activateLayer, deactivateLayer } from './global/hotkeyLayers'

const settingShown = ref(false)
const SETTING_LAYER = 'setting'
watch(
  settingShown,
  (visible) => {
    if (visible) activateLayer(SETTING_LAYER)
    else deactivateLayer(SETTING_LAYER)
  },
  { immediate: true }
)
</script>
