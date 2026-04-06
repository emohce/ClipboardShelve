# src/global Boundary

## 负责内容
- 插件运行时初始化、热键分发、窗口行为、持久化桥接、运行期公共能力。

## 不负责内容
- 具体页面 UI 呈现。
- 单个组件内部的局部样式和纯展示逻辑。

## 常见误改点
- 把 UI 层问题直接改到全局热键链。
- 未确认事件链就同时改 `hotkeyRegistry`、`windowManager`、`shortcutKey`。
- 在没有评估影响范围时修改持久化或窗口生命周期。

## 修改前必须确认
- 影响的是哪条事件链、哪类窗口行为、哪段持久化路径。
- 是否命中历史错误记录。
- 是否需要新增 `ADR`。

## 相关历史记录
- [`docs/ai-error-memory/2026-04-06-scroll-path.md`](../../docs/ai-error-memory/2026-04-06-scroll-path.md)
