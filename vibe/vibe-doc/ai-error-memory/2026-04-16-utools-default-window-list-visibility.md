# Error Memory: EM-2026-04-16-utools-default-window-list-visibility

## 1. 背景与症状

- **任务背景**：EzClipboard 主列表在 **uTools 默认窗口（macOS）** 下使用；独立拉大窗口或浏览器全屏 **不是**默认验收环境。
- **直接症状**：不是单纯「底部半条裁切」，而是 **连续向下键盘导航多步后**，当前高亮项 **仍不在列表滚动可视区内**；修完下移后又暴露 **向上移动时顶部会“漏一个”**。
- **用户真实目标**：**无必要不要滚动**，但目标项一旦不完整可见，就必须滚到**完整可见**；**不是**恒定居中。
- **用户可观察现象**：默认窗矮、**图片类条目**约 **2×** 单行文字条目的行高；按 **条目数** 一屏约 **6 条**量级时，按 **等效行/栅格** 约 **12 行**量级，**勿混用「6」与「12」**。

## 2. 错误归类

- `environment-assumption`（用大视口或错误参照系判断「可见」）
- `invalid-verification`（未在 uTools 默认窗复现即下结论）
- `runtime-path-mismatch`（滚动祖先、`scrollIntoView` 与列表容器不一致）
- `repeated-trial`（同一 action 多次 rAF 重复滚仍不收敛）

## 3. 误判链路

- 把问题窄化成「底部半条裁切」，忽略 **长距离导航不跟滚**。
- 命中 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md) 后，仍继续把主精力放在手写 `scrollTop` / 容器推断 / inset 阈值上，而没有坚持 **原生 `scrollIntoView()` 先打通真实祖先链**。
- 把旧版“自动居中能滚起来”误读成“center 策略正确”，实际关键线索是：**旧版命中了原生 DOM 滚动通路**，不是“居中”本身。
- 把上移与下移都收敛成同一套 `nearest` 语义，导致 **下移已正常时，上移仍会漏一条**；上移需要单独保留“需要滚动时用 `end` 对齐”的 reveal 语义。

## 4. 已证伪方案

- 仅增加 `runNavigationScroll` 重试次数而不收敛到 **单一滚动实现**。
- 散点调用多处 `scrollToIndex` / 直接改 `scrollTop`，不经 **`submitNavigationAction`** 中枢与优先级。
- 以浏览器全屏或独立窗为唯一验证环境，推断默认窗行为。
- 把所有单步导航都压成 `nearest`：下移可能够用，但**上移 near-top 会漏一条**。
- 把“无必要不滚”误写成“先靠手写容器补偿判断要不要滚，再决定是否调 `scrollIntoView`”，这会再次偏离 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md) 的主通路。

## 5. 已确认通路

- **列表程序滚动主通路**：[`src/hooks/useVirtualListScroll.js`](../../src/hooks/useVirtualListScroll.js) 中 **`applyScrollToItemIndex`**（`scrollToIndex` 为其别名）为 **唯一 DOM 滚动入口**；只要目标节点存在，**优先直接调用原生 `scrollIntoView()`**，让浏览器沿真实可滚动祖先链决定是否滚动。这一条必须先对齐 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md)。
- **首项特例**：`index === 0 && align === 'start'` 仍优先 **`container.scrollTop = 0`**，避免 `scrollIntoView(start)` 在嵌套 WebView 中误滚祖先（对齐 [EM-2026-04-08-clipboard-nav-scroll-search-layout](2026-04-08-clipboard-nav-scroll-search-layout.md)）。
- **补滚方式**：`scrollIntoView()` 后允许少量 `requestAnimationFrame` 内 `ensure-visible` 兜底，但这只是补充，**不是主路径**。
- **业务中枢**：[`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue) **`submitNavigationAction`** → **`runNavigationScroll`** 是键盘导航唯一主入口；`Main.vue` 等直接改 `activeIndex` 的旁路，必须额外调用可见性同步。
- **单步语义**：
  - **下移**：目标项完整可见则不滚；不完整可见时由原生 DOM 通路补滚到完整可见。
  - **上移**：目标项完整可见则不滚；一旦需要滚动，**用 `edge-align + end`** 给上方留出一条，避免“上移漏一个”。

## 6. 适用触发条件

| 维度 | 说明 |
|------|------|
| 路径 / 模块 | `ClipItemList.vue`, `useVirtualListScroll.js` |
| 症状关键词 | 下移多步、高亮不在视口、上移漏一个、`activeIndex` 变但列表不滚、图片 tab、`scrollIntoView` |
| 关键 API | `applyScrollToItemIndex`, `submitNavigationAction`, `runNavigationScroll`, `list-nav-up`, `scrollIntoView`, `scrollTop` |
| 运行环境 | **uTools 插件默认窗口**，优先 macOS |

## 7. 禁止再试的做法

- 不经 **`submitNavigationAction`** 增加新的列表跟滚入口。
- 在未验证 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md) 主通路前，再次把 `scrollTop` / 容器探测 / inset 判断放在 `scrollIntoView()` 前面。
- 把上移和下移强行压成同一套 `nearest` 策略。
- 在 **未对齐真实滚动祖先** 的坐标系上继续调「可见区」阈值。

## 8. 推荐优先策略

- 先读 [EM-2026-04-06-scroll-path](2026-04-06-scroll-path.md) 再读本条：**先用原生 `scrollIntoView()` 打通真实滚动链，再谈“无必要不滚”的细化语义**。
- 单步导航目标固定为：**完整可见则不滚；不完整可见才滚到完整可见**，不要退回恒定居中。
- 上移问题优先检查 [`list-nav-up`](../../src/cpns/ClipItemList.vue) 是否保留 **`edge-align + end`** reveal 语义；下移问题优先检查是否误把 `scrollIntoView()` 主通路短路掉。
- 验收固定在 **uTools 默认窗 + 图片 Tab + 长距离下移/上移**，不要只在浏览器大窗口判断。

## 9. 关联文件 / 模块

- [`src/hooks/useVirtualListScroll.js`](../../src/hooks/useVirtualListScroll.js)
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue)
- [`vibe/vibe-doc/glossary.md`](../glossary.md)（`uTools default window`）

## 10. 后续观察点

- 极长单项（高于视口）时键盘导航是否需 **显式**「顶/底」用户预期切换。
- `hold-scroll` 长按连滚与 **单次滚动** 契约是否需进一步统一计时与清除 `currentNavigationAction`。
- 若未来再次出现“下移正常、上移漏一条”，优先检查 `list-nav-up` 的对齐策略是否又被收回 `nearest`。
