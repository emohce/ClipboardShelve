import { computed } from 'vue'

  /**
   * 列表滚动封装：
   * 统一处理“可见不滚”“center-preferred=整行可见且最小位移(nearest)”“边缘对齐”三类滚动策略。
   * 实际 DOM 滚动仅经 applyScrollToItemIndex（对外 scrollToIndex 为其别名）。
   */
export function useVirtualListScroll(options) {
  const {
    listRootRef,
    scrollParentRef,
    virtualizer,
    getEstimateSize,
    getCount,
    getVisibleInsets
  } = options

  const getItemCount = () => {
    const instance = virtualizer?.value ?? virtualizer
    if (instance?.options?.count != null) return instance.options.count
    return typeof getCount === 'function' ? getCount() : 0
  }

  const getActiveNode = (index) =>
    listRootRef.value?.querySelector(`.clip-item[data-index="${index}"]`) || null

  const getFallbackRowNode = (index) =>
    listRootRef.value?.querySelector(`.clip-item-list-row[data-index="${index}"]`) || null

  const getTargetNode = (index) =>
    getActiveNode(index) || getFallbackRowNode(index)

  const isElementScrollable = (element) => {
    if (!element || typeof window === 'undefined') return false
    const style = window.getComputedStyle(element)
    const overflowY = style?.overflowY || style?.overflow
    const canScrollY =
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflowY === 'overlay'
    return canScrollY && element.scrollHeight > element.clientHeight + 1
  }

  const findScrollableAncestor = (node) => {
    if (!node || typeof window === 'undefined') return null
    let current = node.parentElement
    while (current) {
      if (isElementScrollable(current)) return current
      current = current.parentElement
    }
    const scrollingElement =
      document.scrollingElement || document.documentElement || document.body
    if (
      scrollingElement &&
      scrollingElement.scrollHeight > scrollingElement.clientHeight + 1
    ) {
      return scrollingElement
    }
    return null
  }

  const getScrollContainer = (node = null) => {
    if (isElementScrollable(scrollParentRef.value)) {
      return scrollParentRef.value
    }
    return findScrollableAncestor(node || listRootRef.value) || scrollParentRef.value || null
  }
  const MAX_ENSURE_VISIBLE_ATTEMPTS = 3
  const DEFAULT_VISIBLE_INSET = 8

  const normalizeVisibleInsets = (value) => {
    if (typeof value === 'number') {
      const inset = Math.max(0, value)
      return { top: inset, bottom: inset }
    }
    const top = Math.max(0, Number(value?.top) || 0)
    const bottom = Math.max(0, Number(value?.bottom) || 0)
    return { top, bottom }
  }

  const getVisibleViewportInsets = () => {
    if (typeof getVisibleInsets === 'function') {
      return normalizeVisibleInsets(getVisibleInsets())
    }
    return { top: DEFAULT_VISIBLE_INSET, bottom: DEFAULT_VISIBLE_INSET }
  }

  const getNodeMetrics = (node, container) => {
    if (!node || !container) return null
    const viewportInsets = getVisibleViewportInsets()
    const nodeRect = node.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const top = nodeRect.top - containerRect.top
    const bottom = nodeRect.bottom - containerRect.top
    const height = nodeRect.height
    const viewportTop = viewportInsets.top
    const viewportBottom = Math.max(
      viewportTop,
      containerRect.height - viewportInsets.bottom
    )
    const containerHeight = viewportBottom - viewportTop
    const center = top + height / 2
    return {
      top,
      bottom,
      height,
      center,
      containerHeight,
      viewportTop,
      viewportBottom
    }
  }

  const isNodeFullyVisible = (node, container) => {
    const metrics = getNodeMetrics(node, container)
    if (!metrics) return false
    if (metrics.height > metrics.containerHeight + 1) {
      return metrics.top >= metrics.viewportTop - 1 &&
        metrics.top <= metrics.viewportTop + 1
    }
    return metrics.top >= metrics.viewportTop - 1 &&
      metrics.bottom <= metrics.viewportBottom + 1
  }

  const normalizeAlign = (block = 'nearest') => {
    if (block === 'start') return 'start'
    if (block === 'end') return 'end'
    if (block === 'center') return 'center'
    return 'auto'
  }

  const resolveScrollInstruction = (index, options = {}) => {
    const node = getTargetNode(index)
    const container = getScrollContainer(node)
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
        return { shouldScroll: true, align: 'nearest' }
      }
      return {
        shouldScroll: true,
        align: normalizeAlign(options.edge || options.block)
      }
    }

    const fullyVisible = isNodeFullyVisible(node, container)

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
      const shouldScroll =
        !fullyVisible || Boolean(options.forceScroll)
      return {
        shouldScroll,
        align: 'nearest'
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

  const applyManualScrollInContainer = (node, container, instruction) => {
    const metrics = getNodeMetrics(node, container)
    if (!metrics) return false
    const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight)
    let nextScrollTop = container.scrollTop

    if (metrics.height > metrics.containerHeight + 1) {
      nextScrollTop = container.scrollTop + (metrics.top - metrics.viewportTop)
    } else if (instruction.align === 'center') {
      nextScrollTop =
        container.scrollTop +
        metrics.center -
        (metrics.viewportTop + metrics.containerHeight / 2)
    } else if (instruction.align === 'start') {
      nextScrollTop =
        container.scrollTop + (metrics.top - metrics.viewportTop)
    } else if (instruction.align === 'end') {
      nextScrollTop =
        container.scrollTop + (metrics.bottom - metrics.viewportBottom)
    } else if (metrics.top < metrics.viewportTop) {
      nextScrollTop =
        container.scrollTop + (metrics.top - metrics.viewportTop)
    } else if (metrics.bottom > metrics.viewportBottom) {
      nextScrollTop =
        container.scrollTop + (metrics.bottom - metrics.viewportBottom)
    } else {
      return false
    }

    const clampedScrollTop = Math.min(
      Math.max(0, nextScrollTop),
      maxScrollTop
    )

    if (Math.abs(clampedScrollTop - container.scrollTop) > 1) {
      container.scrollTop = clampedScrollTop
      return true
    }
    return false
  }

  /**
   * 列表项跟滚唯一入口：scrollIntoView(DOM 通路) + 有限次 rAF 内手动 scrollTop 补偿（ensure-visible）。
   */
  const applyScrollToItemIndex = (index, options = {}) => {
    const instruction = resolveScrollInstruction(index, options)
    const node = getTargetNode(index)
    const container = getScrollContainer(node)

    const ensureVisible = (attempt = 0) => {
      const n = getTargetNode(index)
      const c = getScrollContainer(n)
      if (!n || !c) return
      if (isNodeFullyVisible(n, c)) return
      const didScroll = applyManualScrollInContainer(n, c, instruction)
      if (
        didScroll &&
        attempt < MAX_ENSURE_VISIBLE_ATTEMPTS &&
        typeof window !== 'undefined' &&
        typeof window.requestAnimationFrame === 'function'
      ) {
        window.requestAnimationFrame(() => {
          ensureVisible(attempt + 1)
        })
      }
    }

    const scheduleEnsureVisible = () => {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          ensureVisible()
        })
      } else {
        ensureVisible()
      }
    }

    // 目标节点尚未挂载时，允许同一 action 在下一帧重试一次。
    if ((!node || !container) && !options.__retried) {
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          applyScrollToItemIndex(index, { ...options, __retried: true })
        })
      }
      return
    }

    if (container && index === 0 && instruction.align === 'start') {
      container.scrollTop = 0
      return
    }

    // 主通路优先使用目标节点原生 scrollIntoView，让浏览器沿真实可滚动祖先链决定是否滚动。
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
      scheduleEnsureVisible()
      return
    }

    // 节点不存在时才依赖 shouldScroll；普通 DOM 通路不再提前短路。
    if (!instruction.shouldScroll) {
      scheduleEnsureVisible()
      return
    }

    const instance = virtualizer?.value ?? virtualizer

    if (instance && typeof instance.getOffsetForIndex === 'function') {
      const offsetInfo = instance.getOffsetForIndex(index, instruction.align)
      if (offsetInfo && typeof instance.scrollToOffset === 'function') {
        instance.scrollToOffset(offsetInfo[0], { align: 'start' })
        return
      }
    }

    if (node && container) {
      if (applyManualScrollInContainer(node, container, instruction)) {
        return
      }
    }

    if (instance?.scrollToIndex) {
      instance.scrollToIndex(index, {
        align: instruction.align
      })
    }
  }

  const scrollToIndex = applyScrollToItemIndex

  const scrollToEdge = (edge) => {
    const count = getItemCount()
    if (!count) return false
    applyScrollToItemIndex(edge === 'top' ? 0 : count - 1, {
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
    applyScrollToItemIndex,
    scrollToIndex,
    scrollToEdge,
    getPageStep,
    getPageTargetIndex,
    getHalfPageTargetIndex,
    scrollByPage,
    scrollHalfPage
  }
}
