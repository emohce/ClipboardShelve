import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const pluginManifest = {
  pluginName: '超级剪贴板',
  description: '强大的剪贴板管理工具',
  author: 'ZiuChen',
  homepage: 'https://github.com/ZiuChen',
  main: 'index.html',
  preload: 'preload.js',
  development: {
    main: 'http://localhost:8081/'
  },
  logo: 'logo.png',
  platform: ['win32', 'darwin', 'linux'],
  features: [
    {
      code: 'clipboard',
      explain: '剪切板历史、剪贴板快速粘贴',
      cmds: ['剪切板', '剪贴板', 'Clipboard']
    }
  ]
}

const runtimeTextAssets = {
  'plugin.json': `${JSON.stringify(pluginManifest, null, 2)}\n`,
  'preload.js': `const path = require('path')
const os = require('os')
const {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  watch,
  copyFileSync,
  rmSync,
  unlinkSync,
  rmdirSync
} = require('fs')
const crypto = require('crypto')
const listener = require('./listener')
const { clipboard, nativeImage } = require('electron')
const time = require('./time')

const sep = path.sep

window.exports = {
  utools,
  path,
  os,
  existsSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
  mkdirSync,
  watch,
  rmSync,
  unlinkSync,
  rmdirSync,
  sep,
  crypto,
  listener,
  clipboard,
  nativeImage,
  time,
  Buffer
}
`,
  'listener.js': `const { chmodSync, existsSync } = require('fs')
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
    }

    console.log('[listener.stopListening] 子进程不存在')
    this.listening = false
    return false
  }
}

module.exports = new ClipboardEventListener()
`,
  'time.js': `// time.js author: inu1255
const path=require("path");function newPromise(fn){let a,b;var tmp={resolve(x){if(this.pending){a(x);this.resolved=true;this.pending=false}},reject(e){if(this.pending){b(e);this.rejectd=true;this.pending=false}},pending:true,resolved:false,rejected:false};var pms=new Promise(function(resolve,reject){a=resolve;b=reject;if(fn)fn(tmp.resolve,tmp.reject)});return Object.assign(pms,tmp)}let cbIdx=1;const cbMap=new Map;function getWorker(){if(getWorker.worker)return getWorker.worker;const worker=new Worker(path.join(__dirname,"time.worker.js"));getWorker.worker=worker;worker.onmessage=e=>{if(e.data&&cbMap.has(e.data.cb)){cbMap.get(e.data.cb).apply(null,e.data.args)}};return worker}function call(method,args){const cb=cbIdx++;let pms=newPromise();cbMap.set(cb,function(err,data){if(err)pms.reject(err);else pms.resolve(data)});getWorker().postMessage({method:method,args:args,cb:cb});return pms}function sleep(ms){return call("sleep",[ms])}exports.sleep=sleep;
`,
  'time.worker.js': `// time.worker.js author: inu1255
const apis={sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}};onmessage=event=>{const data=event.data;if(!data)return;const{cb,method,args}=data;if(!apis[method]){postMessage({cb:cb,err:"no such method"});return}apis[method].apply(null,args).then(res=>postMessage({cb:cb,data:res}),err=>postMessage({cb:cb,err:err}))};
`
}

export function prepareUToolsRuntimeAssets(rootDir = process.cwd()) {
  const distDir = path.resolve(rootDir, 'dist')
  const logoSource = path.resolve(rootDir, 'docs/todo/26-oldDone/logo/logo.png')

  mkdirSync(distDir, { recursive: true })

  Object.entries(runtimeTextAssets).forEach(([name, content]) => {
    writeFileSync(path.resolve(distDir, name), content, 'utf8')
  })
  copyFileSync(logoSource, path.resolve(distDir, 'logo.png'))
}

