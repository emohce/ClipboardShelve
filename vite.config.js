import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { prepareUToolsRuntimeAssets } from './scripts/utools-runtime-assets.mjs'

function emitUToolsRuntimeAssets() {
  return {
    name: 'emit-utools-runtime-assets',
    apply: 'build',
    closeBundle() {
      prepareUToolsRuntimeAssets()
    }
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [vue(), emitUToolsRuntimeAssets()],
  server: {
    port: 8081,
    strictPort: false,
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false
  }
})
