# ADR-2026-04-06-scroll-path-choice

## 背景
- 列表键盘导航的自动滚动在 `uTools` 默认窗口下多次修复无效。
- 问题表象是“居中策略不对”，但真实问题是程序滚动没有命中有效通路。

## 决策
- 列表导航滚动优先采用目标节点原生 `scrollIntoView()`。
- 在没有明确性能证据前，优先使用普通列表的稳定 DOM 通路，不优先回到复杂虚拟滚动方案。

## 备选方案
- 方案 A：继续围绕虚拟列表 `scrollToIndex(center)` 和手动 `scrollTop` 调优。
- 方案 B：普通列表 + 原生 DOM 滚动通路。

## 影响
- 正向影响：滚动行为更贴近真实用户滚轮路径，更容易验证和维护。
- 负向影响：若未来数据量很大，可能需要重新评估性能与渲染成本。

## 后续约束
- 后续涉及列表程序性滚动时，先验证 `scrollIntoView()` 是否已足够。
- 若要重新引入虚拟列表，必须先补性能证据，并重新验证真实滚动祖先与焦点通路。

## 关联文件
- [src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue)
- [src/hooks/useVirtualListScroll.js](../../src/hooks/useVirtualListScroll.js)
