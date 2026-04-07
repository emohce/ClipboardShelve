# Error Memory: EM-2026-04-06-hideMainWindow-showMainWindow-api-race

## 1. 背景与症状
- 背景：列表项 Enter/左键触发 `copyAndPasteAndExit`，期望复制后 `hideMainWindow` 再对外部应用模拟 Ctrl+V。
- 症状：操作后主窗口再次弹出，或粘贴落到 uTools 自身而非原外部编辑框。

## 2. 错误归类
- `runtime-path-mismatch`
- `environment-assumption`（uTools 窗口隐藏触发的 `blur` 与预览清理链）

## 3. 误判链路
- 优先怀疑 `paste()` 时机、`simulateKeyboardTap`、或 `resetPluginUiState` 的 focus 竞态，在未确认 `showMainWindow` 调用栈前反复微调。

## 4. 已证伪方案
- 在未消除误调用 `utools.showMainWindow()` 前，仅增加 `hideMainWindow` 与 `paste` 之间的延迟（可能掩盖但不可靠）。

## 5. 已确认通路
- `utools.hideMainWindow()` 触发 `window` `blur` → `handleWindowBlur` → `resetTransientPreviewState` → `stopImagePreview(true)` → `closeExternalPreview`。
- **根因**：`closeExternalPreview` 在**无外部预览窗口**时仍调用 `focusUtoolsMainWindow()`（即 `utools.showMainWindow()`），与刚执行的 `hideMainWindow` 冲突，焦点回到插件导致粘贴目标错误。

## 6. 适用触发条件
- 路径：`src/cpns/ClipItemList.vue` 中 `closeExternalPreview`、`focusUtoolsMainWindow`、`handleWindowBlur`、`resetTransientPreviewState`、`stopImagePreview`。
- 症状关键词：`hideMainWindow` 后立即 `showMainWindow`、自动粘贴失败、主窗口自动弹出。
- 关键 API：`utools.hideMainWindow`、`utools.showMainWindow`、`utools.simulateKeyboardTap`。

## 7. 禁止再试的做法
- 在 `closeExternalPreview` 中无条件调用 `focusUtoolsMainWindow` / `showMainWindow`（无外部预览关闭需求时）。

## 8. 推荐优先策略
- 仅在**确实存在且被关闭**的外部预览窗口后，再调用 `focusUtoolsMainWindow`；否则只清空 `externalPreviewWindow` 引用。
- 排查时用文档 [`docs/troubleshoot-paste-and-popup.md`](../../docs/troubleshoot-paste-and-popup.md) §6 的 trace 确认 `hide`/`show`/`tap` 顺序。

## 9. 关联文件 / 模块
- [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue)：`closeExternalPreview`、`handleWindowBlur`
- [`src/utils/index.js`](../../src/utils/index.js)：`copyAndPasteAndExit`、`copy`、`paste`
- [`docs/troubleshoot-paste-and-popup.md`](../../docs/troubleshoot-paste-and-popup.md)

## 10. 后续观察点
- 用户长期打开独立外部预览窗口的场景：关闭预览后仍需聚焦主窗口的行为是否与预期一致。
- `handleWindowBlur` 中 `keyboardTriggeredPreview` 分支的不可达代码是否值得删减以避免误读。
