/**
 * 批量操作队列 - 异步分批处理，避免主线程阻塞
 */
export class BatchOperationQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
  }

  /**
   * 添加操作到队列
   * @param {Function} operation - 要执行的操作函数
   * @param {Object} context - 操作上下文
   */
  async add(operation, context = {}) {
    this.queue.push({ operation, context })
    if (!this.isProcessing) {
      return this.process()
    }
  }

  /**
   * 处理队列中的操作
   */
  async process() {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    const results = []

    for (let i = 0; i < this.queue.length; i++) {
      const { operation, context } = this.queue[i]
      try {
        const result = await operation(context)
        results.push({ success: true, result })
        
        // 触发进度事件
        this.emit('progress', {
          current: i + 1,
          total: this.queue.length,
          result
        })
      } catch (error) {
        results.push({ success: false, error })
        console.error('[BatchOperationQueue] 操作失败:', error)
      }

      // 让出主线程，保持 UI 响应
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    this.queue = []
    this.isProcessing = false

    // 触发完成事件
    this.emit('complete', results)

    return results
  }

  /**
   * 清空队列
   */
  clear() {
    this.queue = []
    this.isProcessing = false
  }

  /**
   * 事件监听器
   */
  listeners = {
    progress: [],
    complete: []
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback)
    }
  }

  off(event, callback) {
    if (this.listeners[event]) {
      const index = this.listeners[event].indexOf(callback)
      if (index > -1) {
        this.listeners[event].splice(index, 1)
      }
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data))
    }
  }
}

/**
 * 批量删除操作
 * @param {Array} items - 要删除的项目数组
 * @param {Function} deleteFn - 删除函数
 * @param {Object} options - 选项
 * @param {number} options.batchSize - 每批处理数量，默认 50
 * @param {Function} options.onProgress - 进度回调
 */
export async function batchDelete(items, deleteFn, options = {}) {
  const { batchSize = 50, onProgress } = options
  const total = items.length
  let processed = 0

  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    for (const item of batch) {
      try {
        const result = await deleteFn(item)
        results.push({ success: true, item, result })
      } catch (error) {
        results.push({ success: false, item, error })
        console.error('[batchDelete] 删除失败:', error)
      }
      processed++
    }

    // 触发进度回调
    if (onProgress) {
      onProgress({ current: processed, total })
    }

    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  return results
}

/**
 * 批量收藏操作
 * @param {Array} items - 要收藏的项目数组
 * @param {Function} collectFn - 收藏函数
 * @param {Object} options - 选项
 * @param {number} options.batchSize - 每批处理数量，默认 50
 * @param {Function} options.onProgress - 进度回调
 */
export async function batchCollect(items, collectFn, options = {}) {
  const { batchSize = 50, onProgress } = options
  const total = items.length
  let processed = 0

  const results = []

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    for (const item of batch) {
      try {
        const result = await collectFn(item)
        results.push({ success: true, item, result })
      } catch (error) {
        results.push({ success: false, item, error })
        console.error('[batchCollect] 收藏失败:', error)
      }
      processed++
    }

    // 触发进度回调
    if (onProgress) {
      onProgress({ current: processed, total })
    }

    // 让出主线程
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  return results
}
