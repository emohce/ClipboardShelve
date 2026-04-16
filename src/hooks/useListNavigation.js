import { ref } from 'vue'

/**
 * 列表键盘导航状态：activeIndex、删除/懒加载后的 pending 与 deleteAnchor。
 * getItems: () => list，需返回当前展示的条目数组（与 ClipItemList 的 showList 一致）。
 */
export function useListNavigation(getItems) {
  const activeIndex = ref(0)
  const pendingNavAfterLoad = ref(null)
  const deleteAnchor = ref(null)

  const clampActiveIndex = (nextIndex) => {
    const items = Array.isArray(getItems?.()) ? getItems() : []
    if (items.length === 0) return 0
    return Math.min(Math.max(nextIndex, 0), items.length - 1)
  }

  const setActiveIndex = (nextIndex) => {
    activeIndex.value = clampActiveIndex(nextIndex)
  }

  const setPendingNavAfterLoad = (index) => {
    pendingNavAfterLoad.value = index
  }

  const setDeleteAnchor = (anchorInfo) => {
    deleteAnchor.value = anchorInfo
  }

  const clearPendingStates = () => {
    pendingNavAfterLoad.value = null
    deleteAnchor.value = null
  }

  return {
    activeIndex,
    pendingNavAfterLoad,
    deleteAnchor,
    clampActiveIndex,
    setActiveIndex,
    setPendingNavAfterLoad,
    setDeleteAnchor,
    clearPendingStates
  }
}
