# 自动包围再拼接与只包围需求

Tool: codex

## 目标

- 在现有行拼接基础上新增两个文本行处理能力：`包围再拼接` 与 `只包围`。
- 两个能力都只处理文本 item，且至少需要两条非空行；处理前沿用行拼接规则过滤空行并 trim 每行。
- `包围再拼接` 默认快捷键为 `c-s-.`；`只包围` 默认快捷键为 `c-s-a-.`，且必须在快捷键设置中可配置。

## 行为规则

- 包围配置保存到 `userConfig.lineJoin.surround`，默认 `"`。
- 成对匹配规则：`{ -> }`、`[ -> ]`、`( -> )`、`< -> >`；输入右侧符号时反向匹配左侧；其他单字符按前后相同处理。
- `"`、`'`、`` ` `` 等对称符号只显示一个输入值，但运行时作为一对包围符使用。
- `包围再拼接` 输出示例：输入 `{` 时 `a\nb` 输出 `{a},{b}`。
- `只包围` 输出示例：输入 `{` 时 `a\nb` 输出 `{a}\n{b}`。

## 实施边界

- 不改变既有 `line-join` 行为；现有 `c-s-,` 继续只做拼接。
- 不新增依赖，不改 SQLite schema，不改主列表滚动、搜索、删除恢复或预览链路。
- 继续复用现有剪贴板临时结果 suppress 机制，不把包围处理后的临时文本写入历史。

## Knowledge Context

- required: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md), [../../260622/1031-line-join/spec.md](../../260622/1031-line-join/spec.md), [../../260613-SettingUiModify/260614-shortcut-compact-semantics.md](../../260613-SettingUiModify/260614-shortcut-compact-semantics.md)
- related: [../../../knowledge/MEMORY_INDEX.md](../../../knowledge/MEMORY_INDEX.md), [../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](../../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
- memory routing: none unless implementation discovers reusable shortcut/menu rules beyond this feature.
