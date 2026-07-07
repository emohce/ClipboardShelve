# 实施计划

Tool: codex
Date: 2026-07-07

## 修改点

- [../../../../src/global/quickPasteSelection.js#L10](../../../../src/global/quickPasteSelection.js#L10)
  - 增加 `dataPath + 空 data` 判定。
  - `resolvePinGroupItemsById`、`buildPinGroupRuntimeCache`、cursor 解析统一走完整 item 解析。
- [../../../../src/views/Main.vue#L753](../../../../src/views/Main.vue#L753)
  - `showList` / `collectBlockList` 写入前只 hydrate 可见页。
  - `getAllKnownItems` 优先使用当前展示的 hydrated item，再合并 repository 轻量缓存。
  - 收藏标签编辑入口优先读取完整行。
- [../../../../src/hooks/useClipOperate.js#L33](../../../../src/hooks/useClipOperate.js#L33)
  - 操作执行和可见性判断入口先做防御式 hydrate。
- [../../../../src/utils/index.js#L326](../../../../src/utils/index.js#L326)
  - 统一 data URL 解析、图片文件化、别名图片解析和 `file://` 路径归一化。

## 测试覆盖

- [../../../../test-shortcut-command-system.js#L544](../../../../test-shortcut-command-system.js#L544)
  - `quick-paste-top` 对 partial image hydrate 后再粘贴。
  - 置顶组合 id 解析和运行时 cache 对 partial image hydrate。
- [../../../../test-image-payload-path.js#L1](../../../../test-image-payload-path.js#L1)
  - `data:image/svg+xml;base64,...` 可生成 `.svg` 原始文件。
  - Mac `file:///Users/...` 保留绝对路径。
  - Windows `file:///C:/...` 归一化为 `C:\...`。
  - 操作入口保留 partial image hydrate 防御。

## 风险

- 可见页 hydrate 会增加少量 `getById` 读取，只发生在有 `dataPath` 且 `data` 为空的当前页 item。
- Windows 真实 uTools shell 未在本机执行；已用路径归一化单测覆盖字符串层行为，仍需 Windows 实机复测粘贴入口。
