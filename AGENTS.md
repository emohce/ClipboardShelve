# EzClipboard Agent Guide

## 1. Read First
- `vibe/ai-rules/00-error-memory.md`
- `vibe/ai-rules/00-writing-style.md`
- `vibe/vibe-doc/glossary.md`
- `vibe/vibe-doc/workflow/task-levels.md`
- `vibe/vibe-doc/workflow/evidence-levels.md`
- `vibe/vibe-doc/workflow/dod.md`
- `vibe/ai-rules/01-spec-extraction.md`
- `vibe/ai-rules/02-architecture-planning.md`
- `vibe/ai-rules/03-task-decomposition.md`
- `vibe/ai-rules/04-implementation-constraints.md`
- `vibe/ai-rules/05-verification-checklist.md`
- `vibe/ai-rules/06-change-log-format.md`
- `vibe/vibe-doc/adr/README.md`
- `src/global/README.md`
- `src/cpns/README.md`
- `public/README.md`

## 2. Core Workflow
- 复杂任务默认遵循 `spec -> plan -> tasks -> implement -> verify -> knowledge-capture`。
- 命令流程必须显式从 `/speckit-specify` 开始；标准顺序为 `/speckit-specify` -> `/speckit-clarify`（如需要）-> `/speckit-plan` -> `/speckit-tasks` -> `/speckit-implement`，不得跳过 `specify` 直接进入后续阶段。
- 先按 [`vibe/vibe-doc/workflow/task-levels.md`](vibe/vibe-doc/workflow/task-levels.md) 判断任务等级，再决定需要的流程深度。
- 没有 `01-spec.md` 和 `02-plan.md` 的复杂任务，不直接进入实现。
- 单次实现只处理一个当前任务，避免把多个未验证子问题混在一次改动里。
- 所有长期规则、经验、决策都必须落盘到仓库，不能只停留在聊天记录。
- 进入实现前，必须按“模块路径 + 症状关键词 + 关键 API + 运行环境”检索 [`vibe/ai-rules/00-error-memory.md`](vibe/ai-rules/00-error-memory.md)。
- 关键判断要按 [`vibe/vibe-doc/workflow/evidence-levels.md`](vibe/vibe-doc/workflow/evidence-levels.md) 标注证据等级，避免把猜测写成结论。
- 命中错误记录时，必须先阅读对应正文，再决定是否沿用、规避或替换方案。
- 若连续两次修复都未命中真实通路，禁止继续同方向微调，必须回到“确认真实运行通路”步骤。
- 遇到已证伪方案，除非出现新证据，否则禁止重复尝试。
- 发现新的失败模式时，必须新增或更新 `vibe/vibe-doc/ai-error-memory/` 中的记录，并同步更新索引。
- 发现新的长期设计取舍时，必须新增或更新 `vibe/vibe-doc/adr/` 中的决策记录。

## 3. Encoding And Language
- 仓库内新增或重写的规则文档、`spec`、`plan`、`tasks`、`verify`、复盘、ADR 统一使用 `UTF-8` 编码。
- 默认使用简体中文书写说明、计划、验证、复盘、决策背景。
- 代码、命令、路径、配置键、API 名、组件名、提交信息保持英文原文。
- 统一采用“简体中文说明 + 英文标识符 / API / 路径”的中英文混排方式。
- 遇到乱码或非 `UTF-8` 文档时，优先修正编码，不在乱码文本上继续叠加补丁。

## 4. Reference Rules
- 只要涉及代码、配置、样式、脚本、规则文档，必须附带 Markdown 链接。
- 默认使用仓库相对路径，并尽量附带明确行号。
- 若引用的是具体逻辑，不能只写文件名，至少给出起始行号链接。
- 推荐格式：`[src/cpns/ClipItemList.vue#L120](src/cpns/ClipItemList.vue#L120)`。

## 5. Repository Context
- `src/views/`: 页面入口。
- `src/cpns/`: 页面组件和列表项组件。
- `src/global/`: 插件运行时、热键、窗口、剪贴板、数据桥接逻辑。
- `src/hooks/`, `src/utils/`: 可复用逻辑与工具能力。
- `src/style/`: `less` 样式。
- `public/`: `uTools` 插件静态资源与入口脚本。
- `vibe/vibe-doc/ai-error-memory/`: 跨需求、跨模块错误复盘与经验记录。
- `vibe/vibe-doc/adr/`: 长期设计决策与取舍记录。
- `vibe/vibe-doc/glossary.md`: 领域术语表。
- `dist/`: 构建产物，不手改。

## 6. High-Risk Areas
- 修改 `public/plugin.json`、`public/preload.js`、`public/listener.js` 前，必须先说明影响范围与回归风险。
- 修改 `src/global/` 前，必须明确受影响的事件链、快捷键链、窗口行为或持久化路径。
- 修改动态滚动、焦点、高亮、列表导航时，必须先确认真实滚动祖先、真实焦点入口、真实触发链。

## 7. Preflight Checklist
- 已阅读本次任务涉及目录的现有实现。
- 已检索错误经验索引，并记录“命中/未命中”。
- 已确认真实运行通路、真实数据源、真实事件链，而不是只看表面症状。
- 已识别是否涉及高风险目录。
- 已确认最小改动路径，避免不必要重构。
- 已确认本次需要更新的文档类型：`spec`、`verify`、错误复盘、ADR、术语表。

## 8. Knowledge Capture
- 每次任务结束前，必须判断是否需要更新以下内容：
- `vibe/vibe-doc/ai-error-memory/`: 新失败模式、新证伪路径、新确认通路。
- `vibe/vibe-doc/adr/`: 新的长期技术取舍、架构决策、约束变更。
- `vibe/vibe-doc/glossary.md`: 新术语、旧术语歧义、跨模块统一定义。
- 若本次没有新增知识，也要在最终说明中明确“未产生新的错误记录 / ADR / 术语更新”。
- 交付前必须满足 [`vibe/vibe-doc/workflow/dod.md`](vibe/vibe-doc/workflow/dod.md) 的 `Definition of Done`。

## 9. Commands
- install: `pnpm install`
- dev: `pnpm run serve`
- build: `pnpm run build`

## 10. Final Response
- 必须包含：变更摘要、关键文件、风险或兼容性影响、验证状态、知识沉淀状态。
- 如果命中了历史错误记录，必须说明记录编号以及“采用了什么 / 避开了什么”。
- 如果新增了错误记录、ADR 或术语，必须在总结里指出对应文件。

## Active Technologies
- JavaScript (ES modules) + Vue 3.5.x（SFC） + Vite 6.x、`@tanstack/vue-virtual` 3.x、Element Plus 2.x、Less 4.x (001-delete-search-nav-ux)
- uTools `db` / 本地 JSON（见 `src/global/initPlugin.js`、`src/global/utoolsDB.js`） (001-delete-search-nav-ux)
- JavaScript (ES modules) + Vue 3.5.x（SFC） + Vite 6.x、Element Plus 2.x、`@tanstack/vue-virtual` 3.x (003-quick-item-operation)
- uTools `dbStorage`（设置/快捷键映射）+ 本地 JSON（剪贴板数据） (003-quick-item-operation)
- JavaScript (ES modules) + Vue 3.5.x SFC + Vite 6.x, Element Plus 2.x, `@tanstack/vue-virtual` 3.x, uTools API (003-quick-item-operation)
- uTools `dbStorage` + 本地 JSON（既有 `window.db` 持久化链路） (003-quick-item-operation)

## Recent Changes
- 001-delete-search-nav-ux: Added JavaScript (ES modules) + Vue 3.5.x（SFC） + Vite 6.x、`@tanstack/vue-virtual` 3.x、Element Plus 2.x、Less 4.x
