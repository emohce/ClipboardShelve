// 窗口管理器 - 处理插件窗口大小和位置
const { utools } = window.exports

// 默认窗口配置
const DEFAULT_WINDOW_CONFIG = {
  width: 800,
  height: 600,
  minWidth: 600,
  minHeight: 400,
  resizable: true
}

// 配置存储键名
const WINDOW_CONFIG_KEY = 'clipboard_manager_window_config'

/**
 * 获取uTools主窗口大小信息
 */
function getUToolsMainWindowSize() {
  try {
    // 尝试获取uTools主窗口信息
    const mainWindow = utools.getCurrentWindow()
    if (mainWindow) {
      return {
        width: mainWindow.getBounds().width || DEFAULT_WINDOW_CONFIG.width,
        height: mainWindow.getBounds().height || DEFAULT_WINDOW_CONFIG.height
      }
    }
  } catch (error) {
    console.log('[WindowManager] 无法获取uTools主窗口信息，使用默认值:', error)
  }
  
  // 如果无法获取，使用默认值
  return {
    width: DEFAULT_WINDOW_CONFIG.width,
    height: DEFAULT_WINDOW_CONFIG.height
  }
}

/**
 * 读取保存的窗口配置
 */
function loadWindowConfig() {
  try {
    const config = utools.db.get(WINDOW_CONFIG_KEY)
    if (config && config.data) {
      console.log('[WindowManager] 加载保存的窗口配置:', config.data)
      return config.data
    }
  } catch (error) {
    console.log('[WindowManager] 读取窗口配置失败:', error)
  }
  return null
}

/**
 * 保存窗口配置
 */
function saveWindowConfig(config) {
  try {
    utools.db.put({
      _id: WINDOW_CONFIG_KEY,
      data: config,
      _rev: utools.db.get(WINDOW_CONFIG_KEY)?._rev || undefined
    })
    console.log('[WindowManager] 窗口配置已保存:', config)
  } catch (error) {
    console.log('[WindowManager] 保存窗口配置失败:', error)
  }
}

/**
 * 获取最优窗口大小
 */
function getOptimalWindowSize() {
  // 优先使用保存的配置
  const savedConfig = loadWindowConfig()
  if (savedConfig) {
    return {
      width: Math.max(savedConfig.width, DEFAULT_WINDOW_CONFIG.minWidth),
      height: Math.max(savedConfig.height, DEFAULT_WINDOW_CONFIG.minHeight)
    }
  }
  
  // 否则使用uTools主窗口大小
  const utoolsSize = getUToolsMainWindowSize()
  return {
    width: Math.max(utoolsSize.width, DEFAULT_WINDOW_CONFIG.minWidth),
    height: Math.max(utoolsSize.height, DEFAULT_WINDOW_CONFIG.minHeight)
  }
}

/**
 * 设置插件窗口大小
 */
function setPluginWindowSize() {
  try {
    const currentWindow = utools.getCurrentWindow()
    if (!currentWindow) {
      console.log('[WindowManager] 无法获取当前插件窗口')
      return
    }
    
    const optimalSize = getOptimalWindowSize()
    console.log('[WindowManager] 设置插件窗口大小:', optimalSize)
    
    // 设置窗口大小
    currentWindow.setSize(optimalSize.width, optimalSize.height)
    
    // 设置最小尺寸
    currentWindow.setMinimumSize(DEFAULT_WINDOW_CONFIG.minWidth, DEFAULT_WINDOW_CONFIG.minHeight)
    
    // 设置可调整大小
    currentWindow.setResizable(true)
    
    console.log('[WindowManager] 窗口大小设置完成')
  } catch (error) {
    console.log('[WindowManager] 设置窗口大小失败:', error)
  }
}

/**
 * 监听窗口大小变化并保存
 */
function watchWindowSizeChanges() {
  try {
    const currentWindow = utools.getCurrentWindow()
    if (!currentWindow) {
      console.log('[WindowManager] 无法获取当前插件窗口，跳过监听')
      return
    }
    
    // 防抖保存
    let saveTimer = null
    const debouncedSave = (width, height) => {
      if (saveTimer) clearTimeout(saveTimer)
      saveTimer = setTimeout(() => {
        const config = { width, height }
        saveWindowConfig(config)
        saveTimer = null
      }, 500) // 500ms防抖
    }
    
    // 监听窗口大小变化
    currentWindow.on('resize', () => {
      const bounds = currentWindow.getBounds()
      console.log('[WindowManager] 窗口大小变化:', bounds)
      debouncedSave(bounds.width, bounds.height)
    })
    
    console.log('[WindowManager] 窗口大小变化监听已启动')
  } catch (error) {
    console.log('[WindowManager] 启动窗口监听失败:', error)
  }
}

/**
 * 初始化窗口管理器
 */
function initWindowManager() {
  console.log('[WindowManager] 初始化窗口管理器')
  
  // 设置初始窗口大小
  setPluginWindowSize()
  
  // 启动窗口大小变化监听
  watchWindowSizeChanges()
  
  console.log('[WindowManager] 窗口管理器初始化完成')
}

export {
  initWindowManager,
  setPluginWindowSize,
  getOptimalWindowSize,
  saveWindowConfig,
  loadWindowConfig,
  DEFAULT_WINDOW_CONFIG
}
