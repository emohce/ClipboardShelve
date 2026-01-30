// 桌面预览管理器 - 处理超出插件窗口限制的预览功能

/**
 * 获取桌面屏幕信息
 */
function getDesktopScreenInfo() {
  return {
    width: window.screen?.availWidth || window.screen?.width || 1920,
    height: window.screen?.availHeight || window.screen?.height || 1080,
    availWidth: window.screen?.availWidth || 1920,
    availHeight: window.screen?.availHeight || 1080,
    colorDepth: window.screen?.colorDepth || 24,
    pixelDepth: window.screen?.pixelDepth || 24
  }
}

/**
 * 计算最优预览窗口大小和位置
 */
function calculateOptimalPreviewSize(imageWidth, imageHeight, ratio = 0.67) {
  const screen = getDesktopScreenInfo()
  
  // 计算屏幕可用区域的指定比例（默认2/3）
  const maxPreviewWidth = Math.floor(screen.availWidth * ratio)
  const maxPreviewHeight = Math.floor(screen.availHeight * ratio)
  
  // 计算图片缩放后的尺寸
  let finalWidth = imageWidth
  let finalHeight = imageHeight
  
  // 如果图片超出最大尺寸，按比例缩放
  if (imageWidth > maxPreviewWidth || imageHeight > maxPreviewHeight) {
    const widthRatio = maxPreviewWidth / imageWidth
    const heightRatio = maxPreviewHeight / imageHeight
    const scaleRatio = Math.min(widthRatio, heightRatio)
    
    finalWidth = Math.floor(imageWidth * scaleRatio)
    finalHeight = Math.floor(imageHeight * scaleRatio)
  }
  
  // 计算窗口居中位置
  const windowWidth = finalWidth + 100 // 加上边距
  const windowHeight = finalHeight + 150 // 加上边距和底部信息
  const left = Math.max(0, Math.floor((screen.availWidth - windowWidth) / 2))
  const top = Math.max(0, Math.floor((screen.availHeight - windowHeight) / 2))
  
  return {
    windowWidth: Math.min(windowWidth, screen.availWidth * ratio),
    windowHeight: Math.min(windowHeight, screen.availHeight * ratio),
    imageWidth: finalWidth,
    imageHeight: finalHeight,
    left,
    top
  }
}

/**
 * 创建桌面预览窗口
 */
function createDesktopPreviewWindow(src, footer = '', options = {}) {
  const {
    ratio = 0.67, // 默认使用桌面2/3比例
    title = '图片预览 - 超级剪贴板',
    resizable = true,
    scrollbars = true,
    autoFit = true
  } = options
  
  if (!src) return null
  
  // 获取屏幕信息
  const screen = getDesktopScreenInfo()
  
  // 创建窗口（初始使用屏幕比例）
  const initialWidth = Math.floor(screen.availWidth * ratio)
  const initialHeight = Math.floor(screen.availHeight * ratio)
  const left = Math.max(0, Math.floor((screen.availWidth - initialWidth) / 2))
  const top = Math.max(0, Math.floor((screen.availHeight - initialHeight) / 2))
  
  // 构建窗口特性
  const windowFeatures = [
    `width=${initialWidth}`,
    `height=${initialHeight}`,
    `left=${left}`,
    `top=${top}`,
    `resizable=${resizable ? 'yes' : 'no'}`,
    `scrollbars=${scrollbars ? 'yes' : 'no'}`,
    'status=yes',
    'toolbar=no',
    'menubar=no',
    'location=no'
  ].join(',')
  
  // 创建或复用窗口
  let previewWindow = window.open('', 'desktop-preview-' + Date.now(), windowFeatures)
  
  if (!previewWindow) {
    console.error('[DesktopPreview] 无法创建预览窗口')
    return null
  }
  
  // 生成HTML内容
  const footerHtml = footer
    ? `<div class="footer">${escapeHtml(footer).replace(/\n/g, '<br>')}</div>`
    : ''
  
  const html = `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { 
        width: 100%; 
        height: 100%; 
        background: #0f1115; 
        color: #e5e7eb; 
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      body { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
      }
      .preview-container { 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        width: 100%; 
        height: 100%; 
        padding: 20px; 
        position: relative;
      }
      .image-wrapper {
        position: relative;
        max-width: 100%;
        max-height: calc(100% - 60px);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      img { 
        width: auto; 
        height: auto; 
        max-width: 100%; 
        max-height: 100%; 
        object-fit: contain; 
        border-radius: 8px; 
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
        transition: transform 0.2s ease;
      }
      img:hover {
        transform: scale(1.02);
      }
      .footer { 
        margin-top: 15px; 
        font-size: 13px; 
        color: #9ca3af; 
        text-align: center; 
        white-space: pre-wrap; 
        word-break: break-all; 
        max-width: 100%;
        opacity: 0.8;
        line-height: 1.4;
      }
      .controls {
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 8px;
        z-index: 10;
      }
      .control-btn {
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #e5e7eb;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s ease;
        backdrop-filter: blur(10px);
      }
      .control-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.3);
      }
      .shortcuts {
        position: absolute;
        bottom: 10px;
        left: 10px;
        font-size: 11px;
        color: #6b7280;
        opacity: 0.6;
      }
      .loading {
        color: #9ca3af;
        font-size: 14px;
      }
    </style>
  </head>
  <body>
    <div class="preview-container">
      <div class="controls">
        <button class="control-btn" onclick="window.close()">关闭 (ESC)</button>
      </div>
      <div class="image-wrapper">
        <div class="loading">加载中...</div>
        <img src="${src}" alt="preview" style="display: none;" />
      </div>
      ${footerHtml}
      <div class="shortcuts">ESC: 关闭 | 双击图片: 适应窗口</div>
    </div>
    <script>
      let img = document.querySelector('img');
      let loading = document.querySelector('.loading');
      
      // 图片加载处理（延迟一帧再调整窗口，确保 naturalWidth/Height 就绪）
      function handleImageLoad() {
        loading.style.display = 'none';
        img.style.display = 'block';
        
        if (${autoFit}) {
          setTimeout(function() { adjustWindowSize(); }, 0);
        }
      }
      
      // 图片加载错误处理
      function handleImageError() {
        loading.textContent = '图片加载失败';
        loading.style.color = '#ef4444';
      }
      
      var adjustWindowSizeRetried = false;
      // 自动调整窗口大小（仅当尺寸有效时调整；file:// 等可能延迟解码则短延迟重试一次）
      function adjustWindowSize() {
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const screenWidth = screen.availWidth;
        const screenHeight = screen.availHeight;
        
        if (imgWidth <= 0 || imgHeight <= 0) {
          if (!adjustWindowSizeRetried) {
            adjustWindowSizeRetried = true;
            setTimeout(adjustWindowSize, 50);
          }
          return;
        }
        
        // 如果图片比屏幕小很多，调整窗口大小以适应图片并居中
        if (imgWidth < screenWidth * 0.8 && imgHeight < screenHeight * 0.8) {
          const newWidth = Math.min(imgWidth + 120, screenWidth * 0.8);
          const newHeight = Math.min(imgHeight + 180, screenHeight * 0.8);
          const left = Math.floor((screenWidth - newWidth) / 2);
          const top = Math.floor((screenHeight - newHeight) / 2);
          
          try {
            window.resizeTo(newWidth, newHeight);
            window.moveTo(left, top);
          } catch(e) {
            console.log('窗口调整失败:', e);
          }
        }
      }
      
      // 双击图片适应窗口
      img.addEventListener('dblclick', function() {
        adjustWindowSize();
      });
      
      // ESC键关闭窗口
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          window.close();
        }
      });
      
      // 窗口失焦处理
      window.addEventListener('blur', function() {
        setTimeout(() => {
          try {
            window.focus();
          } catch(e) {}
        }, 100);
      });
      
      // 图片加载事件
      if (img.complete) {
        handleImageLoad();
      } else {
        img.onload = handleImageLoad;
        img.onerror = handleImageError;
      }
    </script>
  </body>
  </html>`
  
  // 写入内容
  previewWindow.document.open()
  previewWindow.document.write(html)
  previewWindow.document.close()
  
  // 聚焦窗口
  try {
    previewWindow.focus()
  } catch(e) {}
  
  return previewWindow
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * 桌面预览管理器主类
 */
class DesktopPreviewManager {
  constructor() {
    this.previewWindows = new Map()
    this.maxWindows = 3 // 最多同时打开3个预览窗口
  }
  
  /**
   * 创建预览窗口
   */
  createPreview(src, footer = '', options = {}) {
    if (!src) return null
    
    // 清理已关闭的窗口
    this.cleanupClosedWindows()
    
    // 如果窗口数量超过限制，关闭最旧的窗口
    if (this.previewWindows.size >= this.maxWindows) {
      const oldestWindow = this.previewWindows.keys().next().value
      this.closePreview(oldestWindow)
    }
    
    // 创建新窗口
    const windowId = 'preview-' + Date.now()
    const previewWindow = createDesktopPreviewWindow(src, footer, options)
    
    if (previewWindow) {
      this.previewWindows.set(windowId, previewWindow)
      
      // 监听窗口关闭
      const checkClosed = setInterval(() => {
        if (previewWindow.closed) {
          this.previewWindows.delete(windowId)
          clearInterval(checkClosed)
        }
      }, 1000)
    }
    
    return previewWindow
  }
  
  /**
   * 关闭指定预览窗口
   */
  closePreview(windowId) {
    const window = this.previewWindows.get(windowId)
    if (window && !window.closed) {
      try {
        window.close()
      } catch(e) {}
    }
    this.previewWindows.delete(windowId)
  }
  
  /**
   * 关闭所有预览窗口
   */
  closeAllPreviews() {
    for (const [windowId, window] of this.previewWindows) {
      if (!window.closed) {
        try {
          window.close()
        } catch(e) {}
      }
    }
    this.previewWindows.clear()
  }
  
  /**
   * 清理已关闭的窗口
   */
  cleanupClosedWindows() {
    for (const [windowId, window] of this.previewWindows) {
      if (window.closed) {
        this.previewWindows.delete(windowId)
      }
    }
  }
  
  /**
   * 获取当前预览窗口数量
   */
  getActivePreviewCount() {
    this.cleanupClosedWindows()
    return this.previewWindows.size
  }
}

// 创建全局实例
const desktopPreviewManager = new DesktopPreviewManager()

export {
  getDesktopScreenInfo,
  calculateOptimalPreviewSize,
  createDesktopPreviewWindow,
  DesktopPreviewManager,
  desktopPreviewManager
}
