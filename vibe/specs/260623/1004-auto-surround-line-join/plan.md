# 自动包围再拼接与只包围实施计划

Tool: codex

## 修改点

- 文本工具：扩展 [../../../../src/utils/lineJoin.mjs](../../../../src/utils/lineJoin.mjs#L1)，新增包围默认值、包围归一化、成对解析、只包围和包围再拼接输出。
- 配置读取与 UI：扩展 [../../../../src/global/readSetting.js](../../../../src/global/readSetting.js#L1)、[../../../../src/data/setting.json](../../../../src/data/setting.json#L1)、[../../../../src/views/Setting.vue](../../../../src/views/Setting.vue#L795)，在行拼接配置中加入包围输入和匹配预览。
- 命令与快捷键：扩展 [../../../../src/global/commandDefaults.js](../../../../src/global/commandDefaults.js#L94)、[../../../../src/global/hotkeyBindings.js](../../../../src/global/hotkeyBindings.js#L346)、[../../../../src/global/hotkeyLabels.js](../../../../src/global/hotkeyLabels.js#L109)、[../../../../src/global/contextMenuActions.js](../../../../src/global/contextMenuActions.js#L18)、[../../../../src/global/shortcutCommandRows.js](../../../../src/global/shortcutCommandRows.js#L29)。
- 执行链：扩展 [../../../../src/hooks/useClipOperate.js](../../../../src/hooks/useClipOperate.js#L68) 和 [../../../../src/cpns/ClipItemList.vue](../../../../src/cpns/ClipItemList.vue#L2436)，菜单和快捷键共享同一 handler 路径。

## 风险控制

- `只包围` 使用默认快捷键 `c-s-a-.`，并在设置页生成可配置 command 行。
- 新操作沿用 `canJoinTextLines()`，单行、图片、文件不展示或不可执行。
- 不改剪贴板数据库、SQLite 表、全局 uTools 配置、主列表滚动容器或搜索焦点判断。

## 验证计划

- `node test-shortcut-command-system.js`
- `pnpm run build`
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_code_links.py --root /Users/gdkmjd/work/czz/EzClipboard vibe/specs/260623/1004-auto-surround-line-join vibe/specs/PROJECT_STATUS.md`
- 手动待验：uTools 真实窗口中多行文本菜单、`c-s-.` 包围再拼接、`c-s-a-.` 只包围、临时结果不新增历史。
