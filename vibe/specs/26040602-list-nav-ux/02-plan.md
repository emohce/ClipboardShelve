# 列表导航与多选视觉 — 方案

## 实现要点

- [`src/hooks/useVirtualListScroll.js`](../../src/hooks/useVirtualListScroll.js)：`center-preferred` 在 fully visible 且无 `forceScroll` 时 `shouldScroll: false`；需滚动时按 `centerStartIndex` 决定 `center` vs `nearest`。
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue)：`runNavigationScroll` 单次滚动；若 `getActiveNode` 仍为空则再试一帧；`hold-scroll` 行为与此前一致（不清理 `currentNavigationAction`）。
- [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue) + [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less)：多选已选显示 `clip-multi-check`；`.select` 中性底；`.active` / `.multi-active` 轻 `box-shadow`；状态切换不设 `background-color` transition。

## 风险

边缘 `forceScroll`、触底 `loadMore` 路径必须仍能对齐末项/首项。
