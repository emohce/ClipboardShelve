const {
  utools,
  existsSync,
  readFileSync,
  writeFileSync,
  watch,
  crypto,
  listener,
  clipboard,
  time
} = window.exports
import { copy, paste, createFile, getNativeId } from '../utils'
import setting from './readSetting'

export default function initPlugin() {
  console.log('[initPlugin] 开始初始化插件')
  class DB {
    constructor(path) {
      const d = new Date()
      this.path = path
      this.dataBase = {}
      this.createTime = d.getTime()
      this.updateTime = d.getTime()
      this.defaultDB = {
        data: [],
        createTime: this.createTime,
        updateTime: this.updateTime
      }
    }
    init() {
      console.log('[DB.init] 初始化数据库, 路径:', this.path)
      const isExist = existsSync(this.path)
      console.log('[DB.init] 数据库文件是否存在:', isExist)
      if (isExist) {
        const data = readFileSync(this.path, {
          encoding: 'utf8'
        })
        try {
          // 读取磁盘记录到内存
          const dataBase = JSON.parse(data)
          this.dataBase = dataBase
          // 将超过14天的数据删除 排除掉收藏
          const now = new Date().getTime()
          const deleteTime = now - setting.database.maxage * 24 * 60 * 60 * 1000 // unicode
          this.dataBase.data = this.dataBase.data?.filter(
            (item) => item.updateTime > deleteTime || item.collect
          )
          this.updateDataBaseLocal()
          this.watchDataBaseUpdate()
          console.log('[DB.init] 数据库加载成功, 记录数:', this.dataBase.data?.length || 0)
        } catch (err) {
          console.error('[DB.init] 读取数据库出错:', err)
          utools.showNotification('读取剪切板出错: ' + err)
          return
        }
        return
      }
      console.log('[DB.init] 数据库文件不存在, 创建新数据库')
      this.dataBase = this.defaultDB
      this.updateDataBaseLocal(this.defaultDB)
    }
    watchDataBaseUpdate() {
      watch(this.path, (eventType, filename) => {
        if (eventType === 'change') {
          // 更新内存中的数据
          const data = readFileSync(this.path, {
            encoding: 'utf8'
          })
          try {
            const dataBase = JSON.parse(data)
            this.dataBase = dataBase
            window.db.dataBase = dataBase // 更新内存中数据
            listener.emit('view-change') // 触发视图更新
          } catch (err) {
            utools.showNotification('读取剪切板出错: ' + err)
            return
          }
        }
      })
    }
    updateDataBase() {
      // 更新内存数据
      this.dataBase.updateTime = new Date().getTime()
    }
    updateDataBaseLocal(dataBase) {
      // 更新文件数据
      writeFileSync(this.path, JSON.stringify(dataBase || this.dataBase), (err) => {
        if (err) {
          utools.showNotification('写入剪切板出错: ' + err)
          return
        }
      })
    }
    addItem(cItem) {
      console.log('[DB.addItem] 添加新记录, 类型:', cItem.type, 'ID:', cItem.id, '数据长度:', cItem.data?.length || 0)
      this.dataBase.data.unshift(cItem)
      this.updateDataBase()
      const exceedCount = this.dataBase.data.length - setting.database.maxsize
      if (exceedCount > 0) {
        // 达到条数限制 在收藏条数限制内遍历非收藏历史并删除
        // 所有被移除的 item都存入tempList
        const tmpList = []
        for (let i = 0; i < exceedCount; i++) {
          const item = this.dataBase.data.pop()
          tmpList.push(item)
        }
        tmpList.forEach((item) => !item.collect || this.dataBase.data.push(item)) // 收藏内容 重新入栈
      }
      this.updateDataBaseLocal()
    }
    emptyDataBase() {
      this.dataBase.data = []
      window.db.dataBase.data = []
      this.updateDataBaseLocal(this.defaultDB)
      listener.emit('view-change')
    }
    filterDataBaseViaId(id) {
      return this.dataBase.data.filter((item) => item.id === id)
    }
    updateItemViaId(id) {
      console.log('[DB.updateItemViaId] 查找记录, ID:', id)
      for (const item of this.dataBase.data) {
        if (item.id === id) {
          console.log('[DB.updateItemViaId] 找到记录, 更新updateTime')
          item.updateTime = new Date().getTime()
          this.sortDataBaseViaTime()
          return true
        }
      }
      console.log('[DB.updateItemViaId] 记录不存在')
      return false
    }
    sortDataBaseViaTime() {
      this.dataBase.data = this.dataBase.data.sort((a, b) => {
        return b.updateTime - a.updateTime
      })
      this.updateDataBaseLocal()
    }
    removeItemViaId(id) {
      for (const item of this.dataBase.data) {
        if (item.id === id) {
          this.dataBase.data.splice(this.dataBase.data.indexOf(item), 1)
          this.updateDataBaseLocal()
          return true
        }
      }
      return false
    }
  }

  const pbpaste = () => {
    console.log('[pbpaste] 开始读取剪贴板内容')
    // file
    const files = utools.getCopyedFiles() // null | Array
    console.log('[pbpaste] 检查文件:', files ? `找到 ${files.length} 个文件` : '无文件')
    if (files) {
      const result = {
        type: 'file',
        data: JSON.stringify(files)
      }
      console.log('[pbpaste] 返回文件类型, 数据长度:', result.data.length)
      return result
    }
    // text
    const text = clipboard.readText()
    console.log('[pbpaste] 检查文本:', text ? `长度 ${text.length}` : '无文本')
    if (text && text.trim()) {
      const result = { type: 'text', data: text }
      console.log('[pbpaste] 返回文本类型, 内容:', text.substring(0, 50))
      return result
    }
    // image
    const image = clipboard.readImage() // 大图卡顿来源
    const isEmpty = image.isEmpty()
    console.log('[pbpaste] 检查图片:', isEmpty ? '无图片' : '有图片')
    if (!isEmpty) {
      const data = image.toDataURL()
      const result = {
        type: 'image',
        data: data
      }
      console.log('[pbpaste] 返回图片类型, 数据长度:', data.length)
      return result
    }
    console.log('[pbpaste] 剪贴板为空, 返回 undefined')
    return undefined
  }

  // 根据当前设备id读取不同路径 若为旧版本则迁移数据
  const nativeId = getNativeId()
  console.log('[initPlugin] nativeId:', nativeId)
  const dbPath = setting.database.path[nativeId] || setting.database.path
  console.log('[initPlugin] 数据库路径:', dbPath)
  const db = new DB(dbPath)
  db.init()

  const remove = (item) => db.removeItemViaId(item.id)

  const focus = (isBlur = false) => {
    return document.querySelector('.clip-search').style.display !== 'none'
      ? isBlur
        ? document.querySelector('.clip-search-input')?.blur()
        : document.querySelector('.clip-search-input')?.focus()
      : (document.querySelector('.clip-search-btn')?.click(),
        document.querySelector('.clip-search-input')?.focus())
  }
  const toTop = () => (document.scrollingElement.scrollTop = 0)
  const resetNav = () => document.querySelectorAll('.clip-switch-item')[0]?.click()

  const handleClipboardChange = (item = pbpaste()) => {
    console.log('[handleClipboardChange] 处理剪贴板变化, item:', item ? `类型: ${item.type}` : 'null')
    if (!item) {
      console.log('[handleClipboardChange] item 为空, 退出')
      return
    }
    item.id = crypto.createHash('md5').update(item.data).digest('hex')
    console.log('[handleClipboardChange] 计算ID:', item.id)
    if (db.updateItemViaId(item.id)) {
      // 在库中 由 updateItemViaId 更新 updateTime
      console.log('[handleClipboardChange] 记录已存在, 已更新')
      return
    }
    // 不在库中 由 addItem 添加
    console.log('[handleClipboardChange] 新记录, 准备添加')
    item.createTime = new Date().getTime()
    item.updateTime = new Date().getTime()
    db.addItem(item)
    console.log('[handleClipboardChange] 处理完成')
  }

  const addCommonListener = () => {
    console.log('[addCommonListener] 启动轮询模式监听')
    let prev = db.dataBase.data[0] || {}
    console.log('[addCommonListener] 初始prev ID:', prev.id || '无')
    let loopCount = 0
    function loop() {
      loopCount++
      if (loopCount % 10 === 0) {
        console.log('[addCommonListener] 轮询循环中, 次数:', loopCount)
      }
      time.sleep(300).then(loop)
      const item = pbpaste()
      if (!item) {
        if (loopCount % 10 === 0) {
          console.log('[addCommonListener] 本次轮询: 剪贴板为空')
        }
        return
      }
      item.id = crypto.createHash('md5').update(item.data).digest('hex')
      if (item && prev.id != item.id) {
        // 剪切板元素 与最近一次复制内容不同
        console.log('[addCommonListener] 检测到变化! prev ID:', prev.id || '无', 'new ID:', item.id)
        prev = item
        handleClipboardChange(item)
      } else {
        // 剪切板元素 与上次复制内容相同
        if (loopCount % 10 === 0) {
          console.log('[addCommonListener] 本次轮询: 内容未变化')
        }
      }
    }
    loop()
  }

  const registerClipEvent = (listener) => {
    console.log('[registerClipEvent] 注册剪贴板事件监听器')
    const exitHandler = () => {
      console.error('[registerClipEvent] 监听器异常退出')
      utools.showNotification('剪贴板监听异常退出 请重启插件以开启监听')
      utools.outPlugin()
    }
    const errorHandler = (error) => {
      console.error('[registerClipEvent] 监听器错误:', error)
      // const info = '请到设置页检查剪贴板监听程序状态'
      // utools.showNotification('启动剪贴板监听程序启动出错: ' + error + info)
      console.log('[registerClipEvent] 降级到轮询模式')
      addCommonListener()
    }
    listener
      .on('change', () => {
        console.log('[registerClipEvent] 收到 change 事件')
        handleClipboardChange()
      })
      .on('close', () => {
        console.log('[registerClipEvent] 收到 close 事件')
        exitHandler()
      })
      .on('exit', () => {
        console.log('[registerClipEvent] 收到 exit 事件')
        exitHandler()
      })
      .on('error', (error) => {
        console.error('[registerClipEvent] 收到 error 事件:', error)
        errorHandler(error)
      })
    console.log('[registerClipEvent] 事件监听器注册完成')
  }

  // 首次启动插件 即开启监听
  // 如果监听程序异常退出 则会在errorHandler中开启常规监听
  console.log('[initPlugin] 准备启动监听器')
  registerClipEvent(listener)
  console.log('[initPlugin] 调用 listener.startListening, 路径:', setting.database.path[nativeId])
  listener.startListening(setting.database.path[nativeId])
  console.log('[initPlugin] 监听器启动完成, 状态:', listener.listening)

  utools.onPluginEnter(() => {
    console.log('[onPluginEnter] 插件进入事件触发')
    if (!listener.listening) {
      // 进入插件后 如果监听已关闭 则重新开启监听
      console.log('[onPluginEnter] 监听器未运行, 重新启动')
      registerClipEvent(listener)
      listener.startListening(setting.database.path[nativeId])
      console.log('[onPluginEnter] 监听器重新启动, 状态:', listener.listening)
    } else {
      console.log('[onPluginEnter] 监听器正在运行')
    }
    toTop()
    resetNav()
  })
  
  console.log('[initPlugin] 插件初始化完成')

  window.db = db
  window.copy = copy
  window.paste = paste
  window.remove = remove
  window.createFile = createFile
  window.focus = focus
  window.toTop = toTop
  window.listener = listener
}
