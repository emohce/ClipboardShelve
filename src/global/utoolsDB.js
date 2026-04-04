/**
 * 基于 uTools DB API 的数据库实现
 * 用于替代 JSON 文件存储
 */

const DB_PREFIX = 'clipboard:'
const DB_ID_INDEX = `${DB_PREFIX}index`
const DB_ID_DATA = (id) => `${DB_PREFIX}data:${id}`
const DB_ID_COLLECTS = `${DB_PREFIX}collects`
const DB_ID_TAGS = `${DB_PREFIX}tags`

export class UToolsDB {
  constructor() {
    this.dataCache = {
      data: [],
      collects: [],
      collectData: [],
      tags: [],
      tagUsage: {},
      createTime: 0,
      updateTime: 0
    }
    this.isLoaded = false
  }

  /**
   * 初始化数据库
   */
  async init() {
    console.log('[UToolsDB.init] 开始初始化 uTools DB')
    
    try {
      // 加载索引文档
      const indexDoc = utools.db.get(DB_ID_INDEX)
      if (indexDoc) {
        this.dataCache.createTime = indexDoc.createTime
        this.dataCache.updateTime = indexDoc.updateTime
      } else {
        // 创建索引文档
        const now = Date.now()
        this.dataCache.createTime = now
        this.dataCache.updateTime = now
        await this._putIndex()
      }

      // 加载收藏列表
      const collectsDoc = utools.db.get(DB_ID_COLLECTS)
      if (collectsDoc) {
        this.dataCache.collects = collectsDoc.collects || []
        this.dataCache.collectData = collectsDoc.collectData || []
      }

      // 加载标签数据
      const tagsDoc = utools.db.get(DB_ID_TAGS)
      if (tagsDoc) {
        this.dataCache.tags = tagsDoc.tags || []
        this.dataCache.tagUsage = tagsDoc.tagUsage || {}
      }

      // 加载所有数据项
      await this._loadAllDataItems()

      this.isLoaded = true
      console.log('[UToolsDB.init] 初始化完成, 数据项数:', this.dataCache.data.length, '收藏数:', this.dataCache.collects.length)
    } catch (err) {
      console.error('[UToolsDB.init] 初始化失败:', err)
      throw err
    }
  }

  /**
   * 删除本插件命名空间下所有文档（迁移前清空，避免重复与旧数据）
   * 分块 remove 并 yield，减轻主线程长时间卡死
   */
  async wipeAllClipboardDocs() {
    const all = utools.db.allDocs().filter((row) => row._id && String(row._id).startsWith(DB_PREFIX))
    const CHUNK = 80
    for (let i = 0; i < all.length; i += CHUNK) {
      const part = all.slice(i, i + CHUNK)
      for (const row of part) {
        try {
          utools.db.remove(row)
        } catch (e) {
          console.warn('[UToolsDB.wipeAllClipboardDocs] remove failed', row._id, e)
        }
      }
      await new Promise((r) => setTimeout(r, 0))
    }
    this.dataCache.data = []
    this.dataCache.collects = []
    this.dataCache.collectData = []
    this.dataCache.tags = []
    this.dataCache.tagUsage = {}
    const now = Date.now()
    this.dataCache.createTime = now
    this.dataCache.updateTime = now
  }

  /**
   * 批量写入历史项（仅 put 数据文档，最后统一 _putIndex；分块 yield 避免界面假死）
   */
  async bulkPutHistoryItems(items) {
    const list = Array.isArray(items) ? items.filter((it) => it && it.id) : []
    const CHUNK = 40
    for (let i = 0; i < list.length; i += CHUNK) {
      const slice = list.slice(i, i + CHUNK)
      for (const item of slice) {
        const doc = {
          _id: DB_ID_DATA(item.id),
          data: { ...item }
        }
        const existing = utools.db.get(doc._id)
        if (existing) {
          doc._rev = existing._rev
        }
        utools.db.put(doc)
      }
      await new Promise((r) => setTimeout(r, 0))
    }
    this.dataCache.data = list.map((it) => ({ ...it }))
    this._updateTime()
    await this._putIndex()
  }

  /**
   * 加载所有数据项
   */
  async _loadAllDataItems() {
    console.log('[UToolsDB._loadAllDataItems] 开始加载数据项')
    
    try {
      const allDocs = utools.db.allDocs()
      const dataItems = allDocs
        .filter(doc => doc._id && doc._id.startsWith(DB_PREFIX + 'data:'))
        .map(doc => doc.data)
        .sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0))
      
      this.dataCache.data = dataItems
      console.log('[UToolsDB._loadAllDataItems] 加载完成, 数量:', dataItems.length)
    } catch (err) {
      console.error('[UToolsDB._loadAllDataItems] 加载失败:', err)
      this.dataCache.data = []
    }
  }

  /**
   * 保存索引文档
   */
  async _putIndex() {
    const indexDoc = {
      _id: DB_ID_INDEX,
      createTime: this.dataCache.createTime,
      updateTime: this.dataCache.updateTime
    }
    
    const existing = utools.db.get(DB_ID_INDEX)
    if (existing) {
      indexDoc._rev = existing._rev
    }
    
    utools.db.put(indexDoc)
  }

  /**
   * 保存收藏列表
   */
  async _putCollects() {
    const collectsDoc = {
      _id: DB_ID_COLLECTS,
      collects: this.dataCache.collects,
      collectData: this.dataCache.collectData
    }
    
    const existing = utools.db.get(DB_ID_COLLECTS)
    if (existing) {
      collectsDoc._rev = existing._rev
    }
    
    utools.db.put(collectsDoc)
  }

  /**
   * 保存标签数据
   */
  async _putTags() {
    const tagsDoc = {
      _id: DB_ID_TAGS,
      tags: this.dataCache.tags,
      tagUsage: this.dataCache.tagUsage
    }
    
    const existing = utools.db.get(DB_ID_TAGS)
    if (existing) {
      tagsDoc._rev = existing._rev
    }
    
    utools.db.put(tagsDoc)
  }

  /**
   * 更新时间戳
   */
  _updateTime() {
    this.dataCache.updateTime = Date.now()
  }

  /**
   * 添加数据项
   */
  async addItem(item) {
    console.log('[UToolsDB.addItem] 添加数据项, 类型:', item.type, 'ID:', item.id)
    
    if (!item.id) {
      console.error('[UToolsDB.addItem] 缺少 ID')
      return
    }

    // 检查是否已存在
    const existingIndex = this.dataCache.data.findIndex(i => i.id === item.id)
    if (existingIndex !== -1) {
      console.log('[UToolsDB.addItem] 数据项已存在, 更新时间戳')
      this.dataCache.data[existingIndex].updateTime = Date.now()
      this._sortData()
      await this._putDataItem(this.dataCache.data[existingIndex])
      return
    }

    // 添加到缓存
    const newItem = {
      ...item,
      locked: item.locked || false,
      createTime: item.createTime || Date.now(),
      updateTime: item.updateTime || Date.now()
    }
    this.dataCache.data.unshift(newItem)
    
    // 保存到 uTools DB
    await this._putDataItem(newItem)
    
    this._updateTime()
    await this._putIndex()
    
    console.log('[UToolsDB.addItem] 添加完成')
  }

  /**
   * 保存数据项
   */
  async _putDataItem(item) {
    const doc = {
      _id: DB_ID_DATA(item.id),
      data: item
    }
    
    const existing = utools.db.get(doc._id)
    if (existing) {
      doc._rev = existing._rev
    }
    
    utools.db.put(doc)
  }

  /**
   * 删除数据项
   */
  async removeItem(id, force = false) {
    console.log('[UToolsDB.removeItem] 删除数据项, ID:', id, 'force:', force)
    
    // 检查是否已收藏
    if (this.isCollected(id) && !force) {
      console.log('[UToolsDB.removeItem] 项目已收藏，不允许删除')
      return false
    }

    const index = this.dataCache.data.findIndex(i => i.id === id)
    if (index === -1) {
      console.log('[UToolsDB.removeItem] 未找到项目')
      return false
    }

    const item = this.dataCache.data[index]
    if (item.locked && !force) {
      console.log('[UToolsDB.removeItem] 项目已锁定')
      return false
    }

    // 从缓存删除
    this.dataCache.data.splice(index, 1)
    
    // 从 uTools DB 删除
    const docId = DB_ID_DATA(id)
    const doc = utools.db.get(docId)
    if (doc) {
      utools.db.remove(doc)
    }

    this._updateTime()
    await this._putIndex()
    
    console.log('[UToolsDB.removeItem] 删除完成')
    return true
  }

  /**
   * 添加收藏
   */
  async addCollect(itemId, log = true) {
    if (log) {
      console.log('[UToolsDB.addCollect] 添加收藏, ID:', itemId)
    }

    if (this.dataCache.collects.includes(itemId)) {
      if (log) {
        console.log('[UToolsDB.addCollect] 已在收藏列表')
      }
      return false
    }

    // 从数据中查找项目
    let itemToCollect = this.dataCache.data.find(i => i.id === itemId)
    
    if (itemToCollect) {
      // 从普通数据中移除
      const index = this.dataCache.data.indexOf(itemToCollect)
      this.dataCache.data.splice(index, 1)
      
      // 从 uTools DB 删除
      const docId = DB_ID_DATA(itemId)
      const doc = utools.db.get(docId)
      if (doc) {
        utools.db.remove(doc)
      }
    } else {
      // 尝试从收藏数据中查找
      itemToCollect = this.dataCache.collectData.find(i => i.id === itemId)
    }

    if (!itemToCollect) {
      if (log) {
        console.log('[UToolsDB.addCollect] 未找到项目')
      }
      return false
    }

    // 添加收藏时间
    itemToCollect = {
      ...itemToCollect,
      collectTime: Date.now(),
      tags: itemToCollect.tags || [],
      remark: itemToCollect.remark || ''
    }

    this.dataCache.collects.push(itemId)
    this.dataCache.collectData.unshift(itemToCollect)
    
    await this._putCollects()
    this._updateTime()
    await this._putIndex()
    
    if (log) {
      console.log('[UToolsDB.addCollect] 添加完成')
    }
    return true
  }

  /**
   * 移除收藏
   */
  async removeCollect(itemId, log = true) {
    if (log) {
      console.log('[UToolsDB.removeCollect] 移除收藏, ID:', itemId)
    }

    const collectIndex = this.dataCache.collects.indexOf(itemId)
    if (collectIndex === -1) {
      if (log) {
        console.log('[UToolsDB.removeCollect] 不在收藏列表')
      }
      return false
    }

    // 从收藏列表移除
    this.dataCache.collects.splice(collectIndex, 1)
    
    // 从收藏数据中查找并还原
    const collectDataIndex = this.dataCache.collectData.findIndex(i => i.id === itemId)
    let itemToRestore = null
    
    if (collectDataIndex !== -1) {
      itemToRestore = { ...this.dataCache.collectData[collectDataIndex] }
      itemToRestore.updateTime = Date.now()
      this.dataCache.collectData.splice(collectDataIndex, 1)
    }

    // 还原为普通数据
    if (itemToRestore) {
      this.dataCache.data.unshift(itemToRestore)
      await this._putDataItem(itemToRestore)
    }

    await this._putCollects()
    this._updateTime()
    await this._putIndex()
    
    if (log) {
      console.log('[UToolsDB.removeCollect] 移除完成')
    }
    return true
  }

  /**
   * 检查是否已收藏
   */
  isCollected(itemId) {
    return this.dataCache.collects.includes(itemId)
  }

  /**
   * 获取收藏列表
   */
  getCollects() {
    return this.dataCache.collectData || []
  }

  /**
   * 按标签获取收藏
   */
  getCollectsByTag(tag) {
    if (!tag || tag === '*全部*') {
      return this.getCollects()
    }
    return this.dataCache.collectData.filter(item => 
      item.tags && item.tags.includes(tag)
    )
  }

  /**
   * 获取所有数据
   */
  getData() {
    return this.dataCache.data || []
  }

  /**
   * 按 ID 查找数据项
   */
  filterDataBaseViaId(id) {
    return this.dataCache.data.filter(item => item.id === id)
  }

  /**
   * 更新数据项时间
   */
  async updateItemViaId(id) {
    console.log('[UToolsDB.updateItemViaId] 更新项目时间, ID:', id)
    
    const item = this.dataBase.data.find(i => i.id === id)
    if (item) {
      item.updateTime = Date.now()
      this._sortData()
      await this._putDataItem(item)
      this._updateTime()
      await this._putIndex()
      return true
    }
    return false
  }

  /**
   * 按时间排序数据
   */
  _sortData() {
    this.dataCache.data.sort((a, b) => (b.updateTime || 0) - (a.updateTime || 0))
  }

  /**
   * 清空数据库
   */
  async emptyDataBase() {
    console.log('[UToolsDB.emptyDataBase] 清空数据库')
    
    // 删除所有数据项
    for (const item of this.dataCache.data) {
      const docId = DB_ID_DATA(item.id)
      const doc = utools.db.get(docId)
      if (doc) {
        utools.db.remove(doc)
      }
    }
    
    this.dataCache.data = []
    this.dataCache.collects = []
    this.dataCache.collectData = []
    
    await this._putCollects()
    this._updateTime()
    await this._putIndex()
    
    console.log('[UToolsDB.emptyDataBase] 清空完成')
  }

  /**
   * 获取标签
   */
  getTags() {
    return this.dataCache.tags || []
  }

  /**
   * 获取标签使用统计
   */
  getTagUsage() {
    return this.dataCache.tagUsage || {}
  }

  /**
   * 更新标签
   */
  async updateTags(tags, tagUsage) {
    this.dataCache.tags = tags || []
    this.dataCache.tagUsage = tagUsage || {}
    await this._putTags()
  }

  // 兼容旧接口
  get dataBase() {
    return this.dataCache
  }
}
