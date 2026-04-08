import { computed } from 'vue'

/**
 * TanStack Virtual 列表滚动封装：
 * 统一处理“可见不滚”“尽量居中”“边缘对齐”三类滚动策略。
 */
export function useVirtualListScroll(options) {
  const {
    listRootRef,
    scrollParentRef,
    virtualizer,
    getEstimateSize,
    getCount
  } = options

  const getVirtualizer = () => virtualizer?.value ?? virtualizer
  const getItemCount = () => {
    const instance = getVirtualizer()
    if (instance?.options?.count != null) return instance.options.count
    return typeof getCount === 'function' ? getCount() : 0
  }

  const getActiveNode = (index) =>
    listRootRef.value?.querySelector(`.clip-item[data-index="${index}"]`) || null

  const getScrollContainer = () => scrollParentRef.value || null

  const getNodeMetrics = (node, container) => {
    if (!node || !container) return null
    const nodeRect = node.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const top = nodeRect.top - containerRect.top
    const bottom = nodeRect.bottom - containerRect.top
    const height = nodeRect.height
    const containerHeight = containerRect.height
    const center = top + height / 2
    return {
      top,
      bottom,
      height,
      center,
      containerHeight
    }
  }

  const isNodeFullyVisible = (node, container) => {
    const metrics = getNodeMetrics(node, container)
    if (!metrics) return false
    return metrics.top >= 0 && metrics.bottom <= metrics.containerHeight
  }

  const normalizeAlign = (block = 'nearest') => {
    if (block === 'start') return 'start'
    if (block === 'end') return 'end'
    if (block === 'center') return 'center'
    return 'auto'
  }

  const resolveScrollInstruction = (index, options = {}) => {
    const node = getActiveNode(index)
    const container = getScrollContainer()
    const mode = options.scrollMode ||
      (options.block === 'center'
        ? 'center-preferred'
        : options.block === 'start' || options.block === 'end'
          ? 'edge-align'
          : 'nearest')

    if (!container) {
      return {
        shouldScroll: true,
        align: normalizeAlign(options.edge || options.block)
      }
    }

    if (!node) {
      if (mode === 'center-preferred') {
        return { shouldScroll: true, align: 'center' }
      }
      return {
        shouldScroll: true,
        align: normalizeAlign(options.edge || options.block)
      }
    }

    const fullyVisible = isNodeFullyVisible(node, container)
    const metrics = getNodeMetrics(node, container)

    if (mode === 'edge-align') {
      const edge = options.edge || options.block || 'nearest'
      if (!options.forceScroll && fullyVisible) {
        return { shouldScroll: false, align: normalizeAlign(edge) }
      }
      return { shouldScroll: true, align: normalizeAlign(edge) }
    }

    if (mode === 'center-preferred') {
      const count = getItemCount()
      if (count > 0 && index === 0) {
        if (!fullyVisible || options.forceScroll) {
          return { shouldScroll: true, align: 'start' }
        }
        return { shouldScroll: false, align: 'start' }
      }
      if (count > 1 && index === count - 1) {
        if (!fullyVisible || options.forceScroll) {
          return { shouldScroll: true, align: 'end' }
        }
        return { shouldScroll: false, align: 'end' }
      }
      const centerStartIndex =
        Number.isInteger(options.centerStartIndex) ? options.centerStartIndex : null
      const shouldCenter =
        !fullyVisible ||
        Boolean(options.forceScroll) ||
        (centerStartIndex != null
          ? index > centerStartIndex
          : (metrics && metrics.center > metrics.containerHeight / 2))
      return {
        shouldScroll: shouldCenter,
        align: 'center'
      }
    }

    if (!options.forceScroll && fullyVisible) {
      return { shouldScroll: false, align: normalizeAlign(options.block) }
    }

    return {
      shouldScroll: true,
      align: normalizeAlign(options.block)
    }
  }

  const scrollToIndex = (index, options = {}) => {
    const node = getActiveNode(index)
    const container = getScrollContainer()
    const instruction = resolveScrollInstruction(index, options)
    if (!instruction.shouldScroll) return

    // 首项顶对齐：避免 scrollIntoView(block:start) 在嵌套 WebView 中误滚祖先链，把第 0 条滚出视野
    if (container && index === 0 && instruction.align === 'start') {
      container.scrollTop = 0
      return
    }

    if (node && typeof node.scrollIntoView === 'function') {
      const block =
        instruction.align === 'center'
          ? 'center'
          : instruction.align === 'start'
            ? 'start'
            : instruction.align === 'end'
              ? 'end'
              : 'nearest'
      node.scrollIntoView({
        block,
        inline: 'nearest',
        behavior: 'auto'
      })
      return
    }

    const instance = getVirtualizer()

    if (instance && typeof instance.getOffsetForIndex === 'function') {
      const offsetInfo = instance.getOffsetForIndex(index, instruction.align)
      if (offsetInfo && typeof instance.scrollToOffset === 'function') {
        instance.scrollToOffset(offsetInfo[0], { align: 'start' })
        return
      }
    }

    if (node && container) {
      const metrics = getNodeMetrics(node, container)
      if (metrics) {
        const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
        let nextScrollTop = container.scrollTop

        if (instruction.align === 'center') {
          nextScrollTop =
            container.scrollTop + metrics.center - metrics.containerHeight / 2
        } else if (instruction.align === 'start') {
          nextScrollTop = container.scrollTop + metrics.top
        } else if (instruction.align === 'end') {
          nextScrollTop =
            container.scrollTop + metrics.bottom - metrics.containerHeight
        } else if (metrics.top < 0) {
          nextScrollTop = container.scrollTop + metrics.top
        } else if (metrics.bottom > metrics.containerHeight) {
          nextScrollTop =
            container.scrollTop + metrics.bottom - metrics.containerHeight
        }

        const clampedScrollTop = Math.min(
          Math.max(0, nextScrollTop),
          maxScrollTop
        )

        if (Math.abs(clampedScrollTop - container.scrollTop) > 1) {
          container.scrollTop = clampedScrollTop
          return
        }
      }
    }

    if (instance?.scrollToIndex) {
      instance.scrollToIndex(index, {
        align: instruction.align
      })
    }
  }

  const scrollToEdge = (edge) => {
    const instance = getVirtualizer()
    const count = getItemCount()
    if (!count) return false
    scrollToIndex(edge === 'top' ? 0 : count - 1, {
      scrollMode: 'edge-align',
      edge: edge === 'top' ? 'start' : 'end',
      forceScroll: true
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
    const count = getItemCount()
    if (!count) return 0
    const pageStep = getPageStep.value
    return direction === 'up'
      ? Math.max(0, currentIndex - pageStep)
      : Math.min(count - 1, currentIndex + pageStep)
  }

  const scrollByPage = (direction, currentIndex) =>
    getPageTargetIndex(direction, currentIndex)

  const getHalfPageTargetIndex = (direction, currentIndex) => {
    const count = getItemCount()
    if (!count) return 0
    const halfStep = Math.max(1, Math.floor(getPageStep.value / 2))
    return direction === 'up'
      ? Math.max(0, currentIndex - halfStep)
      : Math.min(count - 1, currentIndex + halfStep)
  }

  const scrollHalfPage = (direction, currentIndex) =>
    getHalfPageTargetIndex(direction, currentIndex)

  return {
    getActiveNode,
    getScrollContainer,
    getNodeMetrics,
    isNodeFullyVisible,
    resolveScrollInstruction,
    scrollToIndex,
    scrollToEdge,
    getPageStep,
    getPageTargetIndex,
    getHalfPageTargetIndex,
    scrollByPage,
    scrollHalfPage
  }
}
