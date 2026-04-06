import { computed } from 'vue'

/**
 * TanStack Virtual 列表滚动封装：整项可见则不滚；`scrollToIndex` 的 align 与翻页步长。
 * options: listRootRef、scrollParentRef、virtualizer、getEstimateSize（估算行高，用于 page step）。
 */
export function useVirtualListScroll(options) {
  const {
    listRootRef,
    scrollParentRef,
    virtualizer,
    getEstimateSize
  } = options

  const getVirtualizer = () => virtualizer?.value ?? virtualizer

  const getActiveNode = (index) =>
    listRootRef.value?.querySelector(`.clip-item[data-index="${index}"]`) || null

  const getScrollContainer = () => scrollParentRef.value || null

  const isNodeFullyVisible = (node, container) => {
    if (!node || !container) return false
    const nodeRect = node.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    return (
      nodeRect.top >= containerRect.top &&
      nodeRect.bottom <= containerRect.bottom
    )
  }

  const normalizeAlign = (block = 'nearest') => {
    if (block === 'start') return 'start'
    if (block === 'end') return 'end'
    if (block === 'center') return 'center'
    return 'auto'
  }

  const scrollToIndex = (index, options = {}) => {
    const node = getActiveNode(index)
    const container = getScrollContainer()

    // 已完全可见且未 forceScroll 时不滚动，避免「可见仍跳」
    if (!options.forceScroll && node && isNodeFullyVisible(node, container)) {
      return
    }

    const instance = getVirtualizer()
    if (!instance) return

    instance.scrollToIndex(index, {
      align: normalizeAlign(options.block)
    })
  }

  const scrollToEdge = (edge) => {
    const instance = getVirtualizer()
    const count = instance?.options?.count ?? 0
    if (!count) return false
    instance.scrollToIndex(edge === 'top' ? 0 : count - 1, {
      align: edge === 'top' ? 'start' : 'end'
    })
    return true
  }

  const getPageStep = computed(() => {
    const height =
      scrollParentRef.value?.clientHeight ||
      listRootRef.value?.clientHeight ||
      window.innerHeight ||
      document.documentElement.clientHeight ||
      600
    return Math.max(1, Math.floor((height / getEstimateSize()) * 0.9))
  })

  const getPageTargetIndex = (direction, currentIndex) => {
    const instance = getVirtualizer()
    const count = instance?.options?.count ?? 0
    if (!count) return 0
    const pageStep = getPageStep.value
    return direction === 'up'
      ? Math.max(0, currentIndex - pageStep)
      : Math.min(count - 1, currentIndex + pageStep)
  }

  const scrollByPage = (direction, currentIndex) => {
    const targetIndex = getPageTargetIndex(direction, currentIndex)
    scrollToIndex(targetIndex, { block: direction === 'up' ? 'end' : 'start' })
    return targetIndex
  }

  const getHalfPageTargetIndex = (direction, currentIndex) => {
    const instance = getVirtualizer()
    const count = instance?.options?.count ?? 0
    if (!count) return 0
    const halfStep = Math.max(1, Math.floor(getPageStep.value / 2))
    return direction === 'up'
      ? Math.max(0, currentIndex - halfStep)
      : Math.min(count - 1, currentIndex + halfStep)
  }

  const scrollHalfPage = (direction, currentIndex) => {
    const targetIndex = getHalfPageTargetIndex(direction, currentIndex)
    scrollToIndex(targetIndex, { block: direction === 'up' ? 'end' : 'start' })
    return targetIndex
  }

  return {
    getActiveNode,
    getScrollContainer,
    isNodeFullyVisible,
    scrollToIndex,
    scrollToEdge,
    getPageStep,
    getPageTargetIndex,
    getHalfPageTargetIndex,
    scrollByPage,
    scrollHalfPage
  }
}
