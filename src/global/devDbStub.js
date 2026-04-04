/**
 * 浏览器 dev / initPlugin 未就绪时挂到 window，避免 Main 等访问 window.db 报错。
 * 不与真实 db 冲突：仅当 !window.db 时使用。
 */
export function ensureDevDbStub() {
  if (typeof window === 'undefined' || window.db) {
    return
  }
  const empty = {
    data: [],
    collects: [],
    collectData: [],
    tags: [],
    tagUsage: {},
    createTime: Date.now(),
    updateTime: Date.now()
  }
  window.db = {
    dataBase: empty,
    getCollects: () => [],
    getCollectsByTag: () => [],
    isCollected: () => false,
    addCollect: () => {},
    removeCollect: () => false,
    getTags: () => [],
    getTagUsage: () => ({}),
    getTagSuggestions: () => [],
    addItem: () => {},
    removeItemViaId: () => false,
    updateItemViaId: () => false,
    updateDataBaseLocal: () => {},
    queuePersist: () => {},
    emptyDataBase: () => {}
  }
  if (!window.remove) {
    window.remove = () => false
  }
  if (!window.listener) {
    window.listener = {
      on: () => {},
      emit: () => {},
      listening: false,
      startListening: () => {}
    }
  }
  if (!window.toTop) {
    window.toTop = () => {
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0
      }
    }
  }
}
