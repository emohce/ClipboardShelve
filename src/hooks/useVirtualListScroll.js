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

    virtualizer.scrollToIndex(index, {
      align: normalizeAlign(options.block)
    })
  }

  const scrollToEdge = (edge) => {
    const count = virtualizer.options.count ?? 0
    if (!count) return false
    virtualizer.scrollToIndex(edge === 'top' ? 0 : count - 1, {
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

  const scrollByPage = (direction, currentIndex) => {
    const pageStep = getPageStep.value
    const targetIndex = direction === 'up'
      ? Math.max(0, currentIndex - pageStep)
      : Math.min(virtualizer.options.count - 1, currentIndex + pageStep)

    scrollToIndex(targetIndex, { block: direction === 'up' ? 'end' : 'start' })
    return targetIndex
  }

  const scrollHalfPage = (direction, currentIndex) => {
    const halfStep = Math.max(1, Math.floor(getPageStep.value / 2))
    const targetIndex = direction === 'up'
      ? Math.max(0, currentIndex - halfStep)
      : Math.min(virtualizer.options.count - 1, currentIndex + halfStep)

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
    scrollByPage,
    scrollHalfPage
  }
}
