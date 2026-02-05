/**
 * Layer and feature labels for hotkey binding display in settings.
 */

export const LAYER_LABELS = {
  main: '主界面',
  'main-search': '主界面（搜索中）',
  'clear-dialog': '清除对话框',
  'clip-drawer': '剪贴板抽屉',
  'full-data-overlay': '全文预览',
  'tag-search': '标签搜索',
  'tag-edit': '标签编辑'
}

export const FEATURE_LABELS = {
  'clear-dialog-close': '关闭清除对话框',
  'clear-dialog-confirm': '确认清除',
  'clear-dialog-range-1h': '清除 1 小时内',
  'clear-dialog-range-5h': '清除 5 小时内',
  'clear-dialog-range-8h': '清除 8 小时内',
  'clear-dialog-range-24h': '清除 24 小时内',
  'clear-dialog-range-all': '清除全部',
  'clear-dialog-tab': '切换清除范围选项',
  'clear-dialog-block': '拦截其他按键',

  'drawer-close': '关闭抽屉',
  'drawer-nav-down': '抽屉内向下选择',
  'drawer-nav-up': '抽屉内向上选择',
  'drawer-select': '抽屉内选中并复制',
  'drawer-select-1': '抽屉内选第 1 项',
  'drawer-select-2': '抽屉内选第 2 项',
  'drawer-select-3': '抽屉内选第 3 项',
  'drawer-select-4': '抽屉内选第 4 项',
  'drawer-select-5': '抽屉内选第 5 项',
  'drawer-select-6': '抽屉内选第 6 项',
  'drawer-select-7': '抽屉内选第 7 项',
  'drawer-select-8': '抽屉内选第 8 项',
  'drawer-select-9': '抽屉内选第 9 项',
  'drawer-block': '拦截其他按键',

  'full-data-close': '关闭全文预览',
  'full-data-scroll-up': '全文预览半页上滚',
  'full-data-scroll-down': '全文预览半页下滚',
  'full-data-block': '拦截其他按键',

  'search-delete-normal': '搜索中删除选中项',
  'search-delete-force': '搜索中强制删除选中项',

  'main-tab': '左右切换分页',
  'collect-sub-tab-next': '收藏子 tab 下一个 (Ctrl+Tab)',
  'collect-sub-tab-prev': '收藏子 tab 上一个 (Ctrl+Shift+Tab)',
  'main-focus-search': '聚焦搜索',
  'main-alt-tab-1': 'Ctrl+1 切换到第 1 个标签页',
  'main-alt-tab-2': 'Ctrl+2 切换到第 2 个标签页',
  'main-alt-tab-3': 'Ctrl+3 切换到第 3 个标签页',
  'main-alt-tab-4': 'Ctrl+4 切换到第 4 个标签页',
  'main-alt-tab-5': 'Ctrl+5 切换到第 5 个标签页',
  'main-alt-tab-6': 'Ctrl+6 切换到第 6 个标签页',
  'main-alt-tab-7': 'Ctrl+7 切换到第 7 个标签页',
  'main-alt-tab-8': 'Ctrl+8 切换到第 8 个标签页',
  'main-alt-tab-9': 'Ctrl+9 切换到第 9 个标签页',
  'main-escape': '退出设置页/关闭对话框',

  'list-nav-up': '上移选择',
  'list-nav-down': '下移选择',
  'list-nav-left': '左移/上一页',
  'list-drawer-open': '打开操作抽屉',
  'list-view-full': '查看全部',
  'list-tag-edit': '标签编辑',
  'list-enter': '复制选中的剪贴板内容',
  'list-ctrl-enter': '复制并锁定选中的内容',
  'list-copy': '复制选中项',
  'list-collect': '收藏/取消收藏选中项目',
  'list-lock': '锁定/解锁选中项目',
  'open-clear-dialog': '打开清除记录对话框',
  'list-delete': '删除选中项目',
  'list-force-delete': '强制删除（包括锁定项目）',
  'list-space': '向下多选项目',
  'list-shift': '预览图片内容',
  'list-quick-copy-1': 'Alt+1 快速复制第 1 项',
  'list-quick-copy-2': 'Alt+2 快速复制第 2 项',
  'list-quick-copy-3': 'Alt+3 快速复制第 3 项',
  'list-quick-copy-4': 'Alt+4 快速复制第 4 项',
  'list-quick-copy-5': 'Alt+5 快速复制第 5 项',
  'list-quick-copy-6': 'Alt+6 快速复制第 6 项',
  'list-quick-copy-7': 'Alt+7 快速复制第 7 项',
  'list-quick-copy-8': 'Alt+8 快速复制第 8 项',
  'list-quick-copy-9': 'Alt+9 快速复制第 9 项',
  'list-drawer-sub-1': '抽屉内执行第 1 个功能',
  'list-drawer-sub-2': '抽屉内执行第 2 个功能',
  'list-drawer-sub-3': '抽屉内执行第 3 个功能',
  'list-drawer-sub-4': '抽屉内执行第 4 个功能',
  'list-drawer-sub-5': '抽屉内执行第 5 个功能',
  'list-drawer-sub-6': '抽屉内执行第 6 个功能',
  'list-drawer-sub-7': '抽屉内执行第 7 个功能',
  'list-drawer-sub-8': '抽屉内执行第 8 个功能',
  'list-drawer-sub-9': '抽屉内执行第 9 个功能',
  'tag-search': '打开标签搜索'
}

/**
 * @param {string} layer
 * @param {string} [state]
 * @returns {string}
 */
export function getLayerLabel(layer, state) {
  if (state === 'search' && layer === 'main') return LAYER_LABELS['main-search'] || LAYER_LABELS.main
  return LAYER_LABELS[layer] || layer
}

/**
 * @param {string} featureId
 * @returns {string}
 */
export function getFeatureLabel(featureId) {
  return FEATURE_LABELS[featureId] || featureId
}
