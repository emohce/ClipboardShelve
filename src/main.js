import initPlugin from './global/initPlugin'
import { ensureDevDbStub } from './global/devDbStub'
import { createApp } from 'vue'
import App from './App.vue'
import less from 'less'
import registerElement from './global/registerElement'

;(async () => {
  try {
    await initPlugin()
  } catch (err) {
    console.warn('[main] initPlugin 未完成:', err)
  }
  ensureDevDbStub()
  const app = createApp(App)
  app.use(less).use(registerElement)
  app.mount('#app')
})()
