import { ensureDevDbStub } from './global/devDbStub'
import initPlugin from './global/initPlugin'
import { installPluginEnterMultiplexer } from './global/pluginEnterHandlers'
import { flushPendingQuickPasteActions } from './global/quickPasteRuntime'
import { createApp } from 'vue'
import App from './App.vue'
import registerElement from './global/registerElement'
import { STORAGE_STATUS_EVENT, getStorageRuntimeStatus } from './storage/storageRuntimeStatus'

let isBootstrapping = true

const renderStorageBootstrapStatus = (status = getStorageRuntimeStatus()) => {
  if (!isBootstrapping) return
  const root = document.getElementById('app')
  if (!root) return
  const isActive = ['checking', 'migrating'].includes(status.migrationStatus)
  if (!isActive) return
  const progress = Math.max(0, Math.min(100, Number(status.progress) || 0))
  const errorText = status.errorMessage
    ? `<div style="margin-top:8px;font-size:12px;line-height:1.6;color:#b42318;word-break:break-word;">${status.errorMessage}</div>`
    : ''
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f7fafe;color:#24324a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="width:min(420px,calc(100vw - 48px));padding:22px 24px;border:1px solid rgba(53,95,157,.16);border-radius:14px;background:#fff;box-shadow:0 18px 42px rgba(15,23,42,.08);">
        <div style="font-weight:650;font-size:15px;">正在准备数据存储</div>
        <div style="margin-top:10px;font-size:13px;line-height:1.7;color:#5f6b7a;">${status.stepText || '检查 SQLite 迁移状态'}</div>
        ${errorText}
        <div style="height:8px;margin-top:16px;border-radius:999px;background:#e8eef5;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:#355f9d;"></div>
        </div>
      </div>
    </div>
  `
}

const handleBootstrapStorageStatus = (event) => renderStorageBootstrapStatus(event.detail)
window.addEventListener(STORAGE_STATUS_EVENT, handleBootstrapStorageStatus)

;(async () => {
  try {
    renderStorageBootstrapStatus()
    installPluginEnterMultiplexer()
    await initPlugin()
  } catch (err) {
    console.warn('[main] initPlugin 未完成:', err)
  }
  isBootstrapping = false
  window.removeEventListener(STORAGE_STATUS_EVENT, handleBootstrapStorageStatus)
  ensureDevDbStub()
  const app = createApp(App)
  app.use(registerElement)
  app.mount('#app')
  flushPendingQuickPasteActions()
})()
