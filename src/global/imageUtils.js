/**
 * 图片处理工具 - 缩略图生成与懒加载
 */

const THUMBNAIL_MAX_WIDTH = 200
const THUMBNAIL_MAX_HEIGHT = 200
const THUMBNAIL_QUALITY = 0.7

/**
 * 生成图片缩略图
 * @param {string} dataUrl - 原始图片的 Data URL
 * @param {Object} options - 选项
 * @param {number} options.maxWidth - 最大宽度，默认 200
 * @param {number} options.maxHeight - 最大高度，默认 200
 * @param {number} options.quality - 质量 0-1，默认 0.7
 * @returns {Promise<string>} 缩略图的 Data URL
 */
export function generateThumbnail(dataUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const { maxWidth = THUMBNAIL_MAX_WIDTH, maxHeight = THUMBNAIL_MAX_HEIGHT, quality = THUMBNAIL_QUALITY } = options
    
    const img = new Image()
    img.onload = () => {
      // 如果图片本身已经很小，直接返回原图
      if (img.width <= maxWidth && img.height <= maxHeight) {
        resolve(dataUrl)
        return
      }

      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // 计算缩放比例
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height)
      const width = Math.floor(img.width * scale)
      const height = Math.floor(img.height * scale)

      canvas.width = width
      canvas.height = height

      // 绘制缩略图
      ctx.drawImage(img, 0, 0, width, height)

      // 导出为 JPEG（更小的体积）
      const thumbnail = canvas.toDataURL('image/jpeg', quality)
      resolve(thumbnail)
    }

    img.onerror = (error) => {
      console.error('[generateThumbnail] 图片加载失败:', error)
      reject(error)
    }

    img.src = dataUrl
  })
}

/**
 * 判断是否需要生成缩略图
 * @param {string} dataUrl - 图片 Data URL
 * @returns {boolean}
 */
export function shouldGenerateThumbnail(dataUrl) {
  // 简单判断：如果数据长度超过 50KB，则生成缩略图
  const THRESHOLD = 50 * 1024 // 50KB
  return dataUrl && dataUrl.length > THRESHOLD
}

/**
 * 图片懒加载观察器管理器
 */
export class LazyLoadManager {
  constructor() {
    this.observer = null
    this.loadingImages = new Set()
  }

  /**
   * 初始化 IntersectionObserver
   */
  init() {
    if (typeof IntersectionObserver !== 'undefined' && !this.observer) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = entry.target
              const src = img.dataset.src
              if (src) {
                this.loadImage(img, src)
              }
              this.observer.unobserve(img)
            }
          })
        },
        {
          rootMargin: '100px', // 提前 100px 开始加载
        }
      )
    }
  }

  /**
   * 加载图片
   * @param {HTMLImageElement} img - 图片元素
   * @param {string} src - 图片源
   */
  loadImage(img, src) {
    if (this.loadingImages.has(src)) {
      return
    }
    
    this.loadingImages.add(src)
    
    const tempImg = new Image()
    tempImg.onload = () => {
      img.src = src
      img.classList.add('loaded')
      this.loadingImages.delete(src)
    }
    
    tempImg.onerror = () => {
      img.classList.add('error')
      this.loadingImages.delete(src)
    }
    
    tempImg.src = src
  }

  /**
   * 观察图片元素
   * @param {HTMLImageElement} img - 图片元素
   */
  observe(img) {
    if (this.observer) {
      this.observer.observe(img)
    }
  }

  /**
   * 停止观察
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    this.loadingImages.clear()
  }
}

// 单例实例
let lazyLoadManagerInstance = null

/**
 * 获取懒加载管理器单例
 * @returns {LazyLoadManager}
 */
export function getLazyLoadManager() {
  if (!lazyLoadManagerInstance) {
    lazyLoadManagerInstance = new LazyLoadManager()
    lazyLoadManagerInstance.init()
  }
  return lazyLoadManagerInstance
}
