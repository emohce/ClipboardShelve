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
import { ref } from 'vue'
import Main from './views/Main.vue'
import Setting from './views/Setting.vue'
import HotkeyProvider from './cpns/HotkeyProvider.vue'

const settingShown = ref(false)
</script>
