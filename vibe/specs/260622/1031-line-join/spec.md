# 快捷行拼接功能

Tool: codex

## 目标

- 为多行文本剪贴板 item 增加“行拼接”能力，右键菜单和快捷键共享同一 command。
- 默认快捷键为 `c-s-,`，触发后按全局分隔符拼接非空行并执行复制粘贴。
- 不修改原历史 item，不新增剪贴板历史记录。

## 实施路径

- 新增纯文本拼接工具，供菜单和快捷键执行复用。
- 在命令系统中新增 `list.item.joinLines`，接入默认 keybinding、标签、设置页快捷键摘要和右键菜单模型。
- 在 [../../../../src/hooks/useClipOperate.js:1](../../../../src/hooks/useClipOperate.js:1) 处理 `line-join` 菜单操作，在 [../../../../src/cpns/ClipItemList.vue:1](../../../../src/cpns/ClipItemList.vue:1) 注册快捷键 handler。
- 在 [../../../../src/views/Setting.vue:1](../../../../src/views/Setting.vue:1) 的功能配置页加入全局分隔符输入，保存到 `userConfig.lineJoin.separator`。

## 风险与约束

- 不改主列表滚动、搜索、预览、删除恢复链路。
- 分隔符保存走现有 setting 路径，不涉及 SQLite schema 或剪贴板数据库迁移。
- 右键可见性只允许文本且至少两个非空行，避免单行 item 菜单噪声。

## 验证

- `node test-shortcut-command-system.js`
- `pnpm run build`
- 手动路径：多行文本 item 右键出现“行拼接”，单行/图片/文件不出现；设置分隔符保存后菜单与 `c-s-,` 使用新值。
- 结果记录：[verify.md](verify.md)。

## Knowledge Context

- required: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md), [../../260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md](../../260610-shortcuts-redesign/12YG2-zz-summary-快捷键重构全景文档.md), [../../260613-SettingUiModify/260614-shortcut-compact-semantics.md](../../260613-SettingUiModify/260614-shortcut-compact-semantics.md), [../../260612-right-click-unification/01-plan.md](../../260612-right-click-unification/01-plan.md)
- related: [../../../knowledge/MEMORY_INDEX.md](../../../knowledge/MEMORY_INDEX.md), [../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- memory routing: none unless implementation discovers reusable shortcut/menu rules beyond this feature.
