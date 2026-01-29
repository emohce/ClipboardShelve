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
  
  // 模块级变量：防止重复启动轮询模式
  let hasFallbackToPolling = false
  let pollingStarted = false
  
  // 防抖写磁盘定时器
  let dbWriteTimer = null
  const debouncedWriteLocal = () => {
    if (dbWriteTimer) clearTimeout(dbWriteTimer)
    dbWriteTimer = setTimeout(() => {
      if (db) {
        db.updateDataBaseLocal()
        dbWriteTimer = null
      }
    }, 300)
  }
  
  class DB {
    constructor(path) {
      const d = new Date()
      this.path = path
      this.dataBase = {}
      this.createTime = d.getTime()
      this.updateTime = d.getTime()
      this.defaultDB = {
        data: [], // 普通历史记录
        collects: [], // 收藏的项目ID数组
        collectData: [], // 收藏的完整项目数据（单独存储，不可删除）
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
          
          // 数据迁移：如果collects字段不存在，从旧的item.collect迁移
          if (!this.dataBase.collects) {
            this.dataBase.collects = []
            // 从旧数据中提取收藏的ID
            if (this.dataBase.data) {
              this.dataBase.data.forEach((item) => {
                if (item.collect === true) {
                  this.dataBase.collects.push(item.id)
                  // 清除旧的collect标记
                  delete item.collect
                }
              })
            }
            console.log('[DB.init] 数据迁移完成, 收藏数:', this.dataBase.collects.length)
          }
          
          // 确保collects和collectData字段存在
          if (!Array.isArray(this.dataBase.collects)) {
            this.dataBase.collects = []
          }
          if (!Array.isArray(this.dataBase.collectData)) {
            this.dataBase.collectData = []
          }
          
          // 数据迁移：如果collectData为空但collects不为空，从data中复制收藏数据
          if (this.dataBase.collectData.length === 0 && this.dataBase.collects.length > 0 && this.dataBase.data) {
            const collectIds = new Set(this.dataBase.collects)
            this.dataBase.collectData = this.dataBase.data
              .filter((item) => collectIds.has(item.id))
              .map((item) => {
                const copied = { ...item } // 深拷贝
                // 为已有收藏数据添加collectTime（如果没有的话，使用updateTime）
                if (!copied.collectTime) {
                  copied.collectTime = copied.updateTime || copied.createTime || new Date().getTime()
                }
                return copied
              })
            console.log('[DB.init] 数据迁移：从data复制收藏数据到collectData, 数量:', this.dataBase.collectData.length)
          }
          
          // 为已有收藏数据补充collectTime字段（如果没有）
          if (this.dataBase.collectData && this.dataBase.collectData.length > 0) {
            let addedCount = 0
            this.dataBase.collectData.forEach((item) => {
              if (!item.collectTime) {
                item.collectTime = item.updateTime || item.createTime || new Date().getTime()
                addedCount++
              }
            })
            if (addedCount > 0) {
              console.log('[DB.init] 为已有收藏数据补充collectTime字段, 数量:', addedCount)
              this.updateDataBaseLocal()
            }
          }
          
          // 为现有数据补充 locked 字段，默认 false
          const normalizeLockedField = (items = []) =>
            items.forEach((item) => {
              if (typeof item.locked !== 'boolean') item.locked = false
            })
          normalizeLockedField(this.dataBase.data)
          normalizeLockedField(this.dataBase.collectData)

          // 为 file 类型补充 originPaths（原始文件路径）
          const normalizeOriginPaths = (items = []) =>
            items.forEach((item) => {
              if (item?.type !== 'file') return
              if (!Array.isArray(item.originPaths)) {
                try {
                  const fl = JSON.parse(item.data)
                  item.originPaths = Array.isArray(fl) ? fl.map((f) => f.path).filter(Boolean) : []
                } catch (e) {
                  item.originPaths = []
                }
              }
            })
          normalizeOriginPaths(this.dataBase.data)
          normalizeOriginPaths(this.dataBase.collectData)

          // 将超过14天的普通数据删除（收藏数据不受影响）
          const now = new Date().getTime()
          const deleteTime = now - setting.database.maxage * 24 * 60 * 60 * 1000
          const collectIds = new Set(this.dataBase.collects) // 收藏的ID集合
          this.dataBase.data = this.dataBase.data?.filter(
            (item) => item.updateTime > deleteTime && !collectIds.has(item.id)
          )
          
          // 清理collects和collectData中已不存在的项目ID
          const collectDataIds = new Set(this.dataBase.collectData.map((item) => item.id))
          this.dataBase.collects = this.dataBase.collects.filter((id) => collectDataIds.has(id))
          // 清理collectData中不在collects中的项目
          this.dataBase.collectData = this.dataBase.collectData.filter((item) => 
            this.dataBase.collects.includes(item.id)
          )
          
          this.updateDataBaseLocal()
          this.watchDataBaseUpdate()
          console.log('[DB.init] 数据库加载成功, 记录数:', this.dataBase.data?.length || 0, '收藏数:', this.dataBase.collects.length)
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
      
      // 对文本类型进行空内容检查（仅判断，不修改原数据）
      if (cItem.type === 'text' && (!cItem.data || cItem.data.trim() === '')) {
        console.log('[DB.addItem] 跳过空文本内容')
        return
      }
      
      this.dataBase.data.unshift({ ...cItem, locked: false })
      this.updateDataBase()
      // 只有在设置了最大条数限制时才进行清理
      if (setting.database.maxsize !== null) {
        const exceedCount = this.dataBase.data.length - setting.database.maxsize
        if (exceedCount > 0) {
          // 达到条数限制 在收藏条数限制内遍历非收藏历史并删除
          // 所有被移除的 item都存入tempList
          const collectIds = new Set(this.dataBase.collects || [])
          const tmpList = []
          for (let i = 0; i < exceedCount; i++) {
            const item = this.dataBase.data.pop()
            tmpList.push(item)
          }
          // 收藏内容 重新入栈
          tmpList.forEach((item) => {
            if (collectIds.has(item.id)) {
              this.dataBase.data.push(item)
            }
          })
        }
      }
      this.updateDataBaseLocal()
    }
    emptyDataBase() {
      this.dataBase.data = []
      this.dataBase.collects = []
      this.dataBase.collectData = []
      window.db.dataBase.data = []
      window.db.dataBase.collects = []
      window.db.dataBase.collectData = []
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
    removeItemViaId(id, options = {}) {
      const { force = false } = options
      console.log('[DB.removeItemViaId] 开始删除项目, ID:', id, 'force:', force)
      const isCollected = this.isCollected(id)
      
      // 如果项目已收藏，不允许删除（收藏数据单独存储，不可删除）
      if (isCollected && !force) {
        console.log('[DB.removeItemViaId] 项目已收藏，不允许删除。请先取消收藏后再删除')
        return false
      }
      
      // 只删除普通历史记录
      for (const item of this.dataBase.data) {
        if (item.id === id) {
          if (item.locked && !force) {
            console.log('[DB.removeItemViaId] 项目已锁定，跳过删除')
            return false
          }
          const index = this.dataBase.data.indexOf(item)
          this.dataBase.data.splice(index, 1)
          console.log('[DB.removeItemViaId] 已从data数组删除，索引:', index)
          this.updateDataBaseLocal()
          console.log('[DB.removeItemViaId] 删除完成，数据总数:', this.dataBase.data.length, '收藏数:', this.dataBase.collects?.length || 0)
          return true
        }
      }
      console.log('[DB.removeItemViaId] 未找到项目, ID:', id)
      return false
    }
    setLock(itemId, locked = true, skipFileWrite = false) {
      const target =
        this.dataBase.data.find((item) => item.id === itemId) ||
        this.dataBase.collectData.find((item) => item.id === itemId)
      if (!target) return false
      target.locked = locked
      this.updateDataBase()
      if (!skipFileWrite) {
        debouncedWriteLocal()
      }
      return true
    }
    isLocked(itemId) {
      const target =
        this.dataBase.data.find((item) => item.id === itemId) ||
        this.dataBase.collectData.find((item) => item.id === itemId)
      return target?.locked === true
    }
    // 添加收藏
    addCollect(itemId, log = true) {
      if (log) {
        console.log('[DB.addCollect] 开始添加收藏, ID:', itemId)
      }
      if (!this.dataBase.collects) {
        this.dataBase.collects = []
      }
      if (!this.dataBase.collectData) {
        this.dataBase.collectData = []
      }
      
      // 如果已经收藏，直接返回
      if (this.dataBase.collects.includes(itemId)) {
        if (log) {
          console.log('[DB.addCollect] 项目已在收藏列表中, ID:', itemId)
        }
        return false
      }
      
      // 从普通历史记录中查找项目
      let itemToCollect = null
      for (const item of this.dataBase.data) {
        if (item.id === itemId) {
          itemToCollect = { ...item } // 深拷贝
          // 从普通历史记录中移除（收藏数据单独存储）
          const index = this.dataBase.data.indexOf(item)
          this.dataBase.data.splice(index, 1)
          console.log('[DB.addCollect] 已从普通历史记录移除, 索引:', index)
          break
        }
      }
      
      // 如果普通历史记录中没有，尝试从收藏数据中查找（可能已经收藏过）
      if (!itemToCollect) {
        for (const item of this.dataBase.collectData) {
          if (item.id === itemId) {
            itemToCollect = { ...item } // 深拷贝
            break
          }
        }
      }
      
      // 如果找到了项目，添加到收藏数据
      if (itemToCollect) {
        // 添加收藏时间
        itemToCollect.collectTime = new Date().getTime()
        this.dataBase.collects.push(itemId)
        // 保持最新收藏在最前（避免 getCollects 每次排序）
        this.dataBase.collectData.unshift(itemToCollect)
        if (log) {
          console.log('[DB.addCollect] 已添加到收藏列表, 当前收藏数:', this.dataBase.collects.length)
        }
        this.updateDataBaseLocal()
        return true
      } else {
        if (log) {
          console.log('[DB.addCollect] 未找到要收藏的项目, ID:', itemId)
        }
        return false
      }
    }
    // 移除收藏（取消收藏时，将收藏数据还原为普通历史记录）
    removeCollect(itemId, log = true) {
      if (log) {
        console.log('[DB.removeCollect] 开始移除收藏, ID:', itemId)
      }
      if (!this.dataBase.collects) {
        this.dataBase.collects = []
      }
      if (!this.dataBase.collectData) {
        this.dataBase.collectData = []
      }
      
      const collectIndex = this.dataBase.collects.indexOf(itemId)
      if (collectIndex === -1) {
        if (log) {
          console.log('[DB.removeCollect] 收藏列表中未找到该项目, ID:', itemId)
        }
        return false
      }
      
      // 从收藏列表中移除ID
      this.dataBase.collects.splice(collectIndex, 1)
      
      // 从收藏数据中查找并移除，同时还原到普通历史记录
      let itemToRestore = null
      for (let i = 0; i < this.dataBase.collectData.length; i++) {
        if (this.dataBase.collectData[i].id === itemId) {
          itemToRestore = { ...this.dataBase.collectData[i] } // 深拷贝
          // 更新时间为当前时间（相当于重新复制）
          itemToRestore.updateTime = new Date().getTime()
          this.dataBase.collectData.splice(i, 1)
          break
        }
      }
      
      // 将收藏数据还原为普通历史记录（添加到最前面，相当于重新复制）
      if (itemToRestore) {
        this.dataBase.data.unshift(itemToRestore)
        if (log) {
          console.log('[DB.removeCollect] 已从收藏列表移除并还原为普通历史记录, 剩余收藏数:', this.dataBase.collects.length)
        }
      } else {
        if (log) {
          console.log('[DB.removeCollect] 已从收藏列表移除，但未找到收藏数据, 剩余收藏数:', this.dataBase.collects.length)
        }
      }
      
      this.updateDataBaseLocal()
      return true
    }
    // 检查是否已收藏
    isCollected(itemId) {
      if (!this.dataBase.collects) {
        return false
      }
      return this.dataBase.collects.includes(itemId)
    }
    // 获取所有收藏的项目（从collectData中获取，按收藏时间倒序）
    getCollects() {
      if (!this.dataBase.collectData) {
        return []
      }
      return [...this.dataBase.collectData]
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
        data: JSON.stringify(files),
        originPaths: files.map((f) => f.path).filter(Boolean)
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

  const remove = (item, options = {}) => db.removeItemViaId(item.id, options)

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
    item.locked = false
    db.addItem(item)
    console.log('[handleClipboardChange] 处理完成')
  }

  const addCommonListener = () => {
    if (pollingStarted) {
      console.log('[addCommonListener] 轮询模式已在运行，跳过重复启动')
      return
    }
    pollingStarted = true
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
      if (!hasFallbackToPolling) {
        hasFallbackToPolling = true
        console.log('[registerClipEvent] 监听器退出，降级到轮询模式')
        utools.showNotification('剪贴板监听程序不可用，已切换到轮询模式')
        addCommonListener()
      } else {
        console.log('[registerClipEvent] 轮询模式已在运行，忽略退出事件')
      }
    }
    const errorHandler = (error) => {
      console.error('[registerClipEvent] 监听器错误:', error)
      if (!hasFallbackToPolling) {
        hasFallbackToPolling = true
        // const info = '请到设置页检查剪贴板监听程序状态'
        // utools.showNotification('启动剪贴板监听程序启动出错: ' + error + info)
        console.log('[registerClipEvent] 降级到轮询模式')
        addCommonListener()
      } else {
        console.log('[registerClipEvent] 轮询模式已在运行，忽略错误事件')
      }
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
  // 先注册事件监听器，再启动监听程序，确保事件能被捕获
  registerClipEvent(listener)
  console.log('[initPlugin] 调用 listener.startListening, 路径:', setting.database.path[nativeId])
  // 延迟启动，确保事件监听器已完全注册
  setTimeout(() => {
    listener.startListening(setting.database.path[nativeId])
    console.log('[initPlugin] 监听器启动完成, 状态:', listener.listening)
    // 如果监听器启动失败（listening仍为false），延迟检查并降级
    if (!listener.listening && !hasFallbackToPolling) {
      setTimeout(() => {
        if (!listener.listening && !hasFallbackToPolling) {
          console.log('[initPlugin] 监听器启动失败，延迟降级到轮询模式')
          hasFallbackToPolling = true
          addCommonListener()
        }
      }, 500)
    }
  }, 100)

  utools.onPluginEnter(() => {
    console.log('[onPluginEnter] 插件进入事件触发')
    // 如果轮询模式已启动，不再尝试启动原生监听器
    if (pollingStarted) {
      console.log('[onPluginEnter] 轮询模式已运行，跳过监听器启动')
    } else if (!listener.listening) {
      // 进入插件后 如果监听已关闭 则重新开启监听
      console.log('[onPluginEnter] 监听器未运行, 重新启动')
      registerClipEvent(listener)
      setTimeout(() => {
        listener.startListening(setting.database.path[nativeId])
        console.log('[onPluginEnter] 监听器重新启动, 状态:', listener.listening)
        // 如果启动失败，延迟检查并降级
        if (!listener.listening && !hasFallbackToPolling) {
          setTimeout(() => {
            if (!listener.listening && !hasFallbackToPolling) {
              console.log('[onPluginEnter] 监听器重新启动失败，延迟降级到轮询模式')
              hasFallbackToPolling = true
              addCommonListener()
            }
          }, 500)
        }
      }, 100)
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
  window.setLock = (id, locked, skipFileWrite) => db.setLock(id, locked, skipFileWrite)
  window.isLocked = (id) => db.isLocked(id)
  window.createFile = createFile
  window.focus = focus
  window.toTop = toTop
  window.listener = listener
}
