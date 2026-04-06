import { copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

function copyUToolsPublicAssets() {
  const assetNames = [
    'plugin.json',
    'preload.js',
    'listener.js',
    'logo.png',
    'time.js',
    'time.worker.js'
  ]

  return {
    name: 'copy-utools-public-assets',
    apply: 'build',
    closeBundle() {
      const rootDir = process.cwd()
      const distDir = path.resolve(rootDir, 'dist')
      const publicDir = path.resolve(rootDir, 'public')
      mkdirSync(distDir, { recursive: true })
      assetNames.forEach((name) => {
        copyFileSync(path.resolve(publicDir, name), path.resolve(distDir, name))
      })
    }
  }
}

export default defineConfig({
  base: './',
  publicDir: false,
  plugins: [vue(), copyUToolsPublicAssets()],
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
