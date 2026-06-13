# EM-2026-04-06：粘贴退出后窗口误弹出

## 症状

列表 Enter/点击粘贴后，uTools 主窗口再次弹出，或内容粘到插件自身而非外部编辑框。

## 错误思路

- 未确认 `showMainWindow` 调用栈前，反复微调 `paste` 时机或 `simulateKeyboardTap`。
- 用 hide 与 paste 之间的延迟掩盖问题。

## 根因（概念）

`hideMainWindow` 触发 `blur` → 预览清理链；若在**没有外部预览窗口**时仍 `showMainWindow`，会与刚执行的 hide 冲突，焦点回到插件。

## 正确思路

- 仅在实际关闭外部预览窗口后再聚焦主窗口。
- 粘贴退出期间用 `__isExitingPlugin` 让 blur/focus 短路。

## 禁止再试

- 预览清理路径中无条件 `showMainWindow`。

## 详见

[docs/troubleshoot-paste-and-popup.md](../../../docs/troubleshoot-paste-and-popup.md)（列表内粘贴排查）
