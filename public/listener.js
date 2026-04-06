const { chmodSync, existsSync } = require('fs')
const { EventEmitter } = require('events')
const path = require('path')
const { execFile } = require('child_process')

class ClipboardEventListener extends EventEmitter {
  constructor() {
    super()
    this.child = null
    this.listening = false
  }
  startListening(dbPath) {
    console.log('[listener.startListening] 开始启动监听, dbPath:', dbPath)
    const targetMap = {
      win32: 'clipboard-event-handler-win32.exe',
      linux: 'clipboard-event-handler-linux',
      darwin: 'clipboard-event-handler-mac'
    }
    const { platform } = process
    console.log('[listener.startListening] 平台:', platform)
    const target = path.resolve(
      dbPath.split('_utools_clipboard_manager_storage')[0],
      targetMap[platform]
    )
    console.log('[listener.startListening] 监听程序路径:', target)
    if (!existsSync(target)) {
      console.error('[listener.startListening] 监听程序文件不存在')
      this.emit('error', '剪贴板监听程序不存在')
      return
    }
    console.log('[listener.startListening] 监听程序文件存在, 准备启动')
    try {
      if (platform === 'win32') {
        console.log('[listener.startListening] Windows平台, 启动exe')
        this.child = execFile(target)
      } else if (platform === 'linux' || platform === 'darwin') {
        console.log('[listener.startListening] Linux/macOS平台, 设置权限并启动')
        chmodSync(target, 0o755)
        this.child = execFile(target)
      } else {
        throw 'Not yet supported'
      }
      console.log('[listener.startListening] 子进程已启动, PID:', this.child.pid)
      
      this.child.stdout.on('data', (data) => {
        const dataStr = data.toString().trim()
        if (dataStr === 'CLIPBOARD_CHANGE') {
          this.emit('change')
        }
      })
      
      this.child.stderr.on('data', (data) => {
        console.error('[listener.stderr] 错误输出:', data.toString())
      })
      
      this.child.stdout.on('close', () => {
        console.log('[listener.stdout] 子进程stdout关闭')
        this.emit('close')
        this.listening = false
      })
      
      this.child.on('exit', (code, signal) => {
        console.log('[listener] 子进程退出, code:', code, 'signal:', signal)
        this.emit('exit')
        this.listening = false
      })
      
      this.child.on('error', (error) => {
        console.error('[listener] 子进程错误:', error)
        this.emit('error', error)
        this.listening = false
      })
      
      this.listening = true
      console.log('[listener.startListening] 监听器启动成功, listening:', this.listening)
    } catch (error) {
      console.error('[listener.startListening] 启动失败:', error)
      this.emit('error', error)
      this.listening = false
    }
  }
  stopListening() {
    console.log('[listener.stopListening] 停止监听')
    if (this.child) {
      const res = this.child.kill()
      console.log('[listener.stopListening] 子进程已终止, 结果:', res)
      this.listening = false
      return res
    } else {
      console.log('[listener.stopListening] 子进程不存在')
      this.listening = false
      return false
    }
  }
}

module.exports = new ClipboardEventListener()
