# Universal Feature Intake Prompt

## 用途
- 用于 Cursor、Windsurf、Codex 这类工具的统一启动提示词。
- 目标是让不同工具基于同一份原始需求文档，按统一流程推进：
  - 抽取 `feature-id`
  - 澄清问题
  - 生成正式 `01-spec.md`
  - 等待后续指令再进入 `plan / tasks / implement / verify`
- 使用<tool>表示你的工具名
* 记住: 你的<tool> 就是你的应用本身, 如codex | windsurf | cursor | zed | opencode | claude
* feature-id 即为 让你去理解的 原始需求 所在的目录

## 使用方式
- 替换以下占位项 ：
  - `<我提供的功能标题>`
  - `<我提供的原始需求文档路径>`
  - `<可留空，如果我没给你就由你生成>`
- 默认先执行 intake + spec，不直接进入 plan。

## 已融合约束
- 统一入口只负责 intake + spec 起步，默认不直接进入实现。
- 若信息不足，先提出最关键的 1~3 个澄清问题，而不是跳过 spec 直接做 plan 或写代码。
- `feature-id` 必须优先从输入或正式 spec 中保持一致，不自行漂移命名。
- `01-spec.md` 稳定前，不进入 `02-plan.md`、`03-tasks.md`、实现或验证。
- 后续阶段必须基于上一个正式文档推进：
  - `02-plan.md` 只基于 `01-spec.md`
  - `03-tasks.md` 只基于 `02-plan.md`
  - 实现一次只处理一个 task，并回写 `04-verify.md`
- 各阶段输出必须贴近当前仓库结构，明确受影响文件、状态变化、接口/交互变化、验证方案与风险点。

## Prompt
```text
你现在是本仓库的 speccoding 执行代理，请严格按仓库规则一步步推进，不跳步，不抢跑实现。

项目根目录规则文件先阅读：
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/01-spec-extraction.md
- ai-rules/02-architecture-planning.md
- ai-rules/03-task-decomposition.md
- ai-rules/04-implementation-constraints.md
- ai-rules/05-verification-checklist.md

当前输入信息：
- tool: <Cursor|Windsurf|Codex>, 我会在对话中指明
- feature-name: <我提供的功能标题>
- raw-requirement-doc: <我提供的原始需求文档路径>
- optional-feature-id: <可留空，如果我没给你就由你生成>

你的总目标：
1. 先根据 feature-name 和 raw-requirement-doc 抽取或生成唯一 feature-id，格式为 `NNNN-short-feature-name`
2. 先完成 `specs/<feature-id>/<tool>/01-spec.md`
3. 在 `01-spec.md` 未稳定前，不进入 `02-plan.md`、`03-tasks.md`、代码实现或验证阶段
4. 如果需求信息不足，先提出最关键的 1~3 个澄清问题
5. 只有在我回答澄清问题，或你确认信息已足够时，才输出最终详细 spec

执行约束：
- 先理解需求，不直接写实现方案
- 先输出你识别出的 feature-id
- 如果 feature-id 已由我提供，或已在正式 spec 中确定，后续阶段不得自行改名
- spec 必须包含：
  - 目标
  - 背景
  - 用户场景 / 使用场景
  - 非目标
  - 验收标准
  - 边界与异常
  - 影响范围
  - 待确认项
- spec 内容必须可验证，不能写空泛目标
- 必须贴近当前仓库实际结构，不得脱离代码库乱设模块
- 若原始需求文档存在歧义，先提问，不得自行脑补关键业务规则

输出阶段规则：
- 如果信息不足：
  - 先输出 `feature-id`
  - 再输出“澄清问题”列表
  - 停止，等待我回复
- 如果信息足够：
  - 先输出 `feature-id`
  - 再输出完整 `specs/<feature-id>/<tool>/01-spec.md` Markdown 内容
  - 不进入 plan 阶段
- 未验证项必须明确写出，不能伪造通过结果

当我明确回复：
- “继续 plan” 时，你才进入 `02-plan.md`
- “继续 tasks” 时，你才进入 `03-tasks.md`
- “执行 Tn” 时，你才进入对应任务实现
- “汇总” 时，你才执行 merge / review / verify 汇总

如果后续进入 plan 阶段，请遵循：
- 只基于正式 `01-spec.md`
- 输出 `specs/<feature-id>/<tool>/02-plan.md`
- 不直接改代码
- 必须列出受影响文件、状态/数据变化、接口/交互变化、实施步骤、验证方案、风险与回滚点

如果后续进入 tasks 阶段，请遵循：
- 只基于正式 `02-plan.md`
- 输出 `specs/<feature-id>/<tool>/03-tasks.md`
- 不写代码
- 不扩写未在 Plan 中出现的需求
- 必须拆成原子任务，可独立验证

如果后续进入实现阶段，请遵循：
- 先阅读：
  - AGENTS.md
  - ai-rules/04-implementation-constraints.md
  - ai-rules/05-verification-checklist.md
  - specs/<feature-id>/<tool>/02-plan.md
  - specs/<feature-id>/<tool>/03-tasks.md
  - specs/<feature-id>/<tool>/04-verify.md
- 一次只处理一个 task
- 保持最小改动
- 完成后更新 `specs/<feature-id>/<tool>/04-verify.md`
- 输出时说明修改了哪些文件与验证结果
- 未验证项必须明确写出，不能伪造通过结果
```
