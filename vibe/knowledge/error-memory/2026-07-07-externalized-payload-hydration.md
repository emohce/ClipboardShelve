# EM-2026-07-07 外置 payload 轻量行误作完整 item

Tool: codex

## 症状

图片截图或大文本 item 在置顶、组合粘贴、收藏标签编辑、保存文件或自定义 redirect 时显示为无效图片、空数据，或粘贴失败。

## 错误思路

把 `window.db.dataBase.data`、`collectData` 或 runtime cache 里的 item 当作完整剪贴板 payload 使用，只检查 `id` / `type`，忽略 `dataPath` 已表示 payload 外置。

## 正确思路

`dataPath + 空 data` 是轻量索引行；进入展示、粘贴、文件化或操作执行前必须通过 `getById(id)` hydrate。置顶组合 cache 的 `clipboard-item.value` 必须存完整 item。

权威规则见 [../quick-paste-runtime.md](../quick-paste-runtime.md) 与 [../quick-paste-pin-group-cache.md](../quick-paste-pin-group-cache.md)。

## 禁止再试

- 不要用空 `data` 的外置 payload item 作为最终粘贴、预览或保存数据。
- 不要为了修复组合粘贴把 `clipboard-item.value` 改成数组。
- 不要在普通刷新时重建组合 cache 来掩盖 payload hydrate 问题。
