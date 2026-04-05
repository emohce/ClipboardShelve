# AI Tools Use

## 目的
- 为 Cursor、Codex、Windsurf 提供统一的 speccoding 提示词模板。
- 所有工具都遵循同一套 `ai-rules/` 与 `AGENTS.md`，避免流程漂移。

## 目录结构
```text
specs/ai-tools-use/
  README.md
  cursor-prompts.md
  codex-prompts.md
  windsurf-prompts.md
  universal-feature-intake-prompt.md
  multi-ai-orchestrator.md
  multi-ai-merge-checklist.md
  multi-ai-merge-prompt.md
  multi-ai-execution-strategy.md
```

## feature-id 规则
- 当用户只提供 feature 名称、目标或一句话需求时，工具必须先抽取或生成 `feature-id`。
- `feature-id` 推荐格式：`NNNN-short-feature-name`
- `NNNN` 为四位序号，占位时可先用 `<feature-id>`，最终落盘前再替换成真实目录名。
- `short-feature-name` 使用小写英文 kebab-case，表达核心能力，不要包含实现词汇。
- 如果用户已明确给出 feature-id，则直接复用，不重新命名。

## 首阶段规则
- 第一阶段永远先生成 `01-spec.md`。
- 如果需求信息不足，先由工具追问最关键的 1~3 个问题，再回写 Spec。
- 在 `01-spec.md` 未稳定前，不进入 `02-plan.md`、`03-tasks.md` 或代码实现。

## 使用顺序
1. 从用户输入中抽取或生成 `feature-id`
2. 先产出 `specs/<feature-id>/01-spec.md`
3. 再产出 `specs/<feature-id>/02-plan.md`
4. 再产出 `specs/<feature-id>/03-tasks.md`
5. 最后按任务逐项实现并回写 `specs/<feature-id>/04-verify.md`

## 通用约束
- 复杂任务先规划，后实现。
- 不在没有 `01-spec.md` 或 `02-plan.md` 的情况下直接写代码。
- 所有输出优先落盘到仓库，而不是停留在聊天记录。
- 如果用户只给 feature，不得跳过补充提问与 Spec 整理阶段。

## 文件说明
- `cursor-prompts.md`: Cursor Plan Mode / Agent 模板
- `codex-prompts.md`: Codex app / Codex CLI 风格模板
- `windsurf-prompts.md`: Windsurf Cascade / Workflows 模板
- `universal-feature-intake-prompt.md`: 通用需求启动提示词，适合不同工具从原始需求进入 spec 阶段
- `multi-ai-orchestrator.md`: 多 AI 分阶段编排与汇总模板
- `multi-ai-merge-checklist.md`: 多 AI 汇总时的固定检查项
- `multi-ai-merge-prompt.md`: 多 AI 汇总专用提示词，适合 spec / plan / verify 阶段 merge
- `multi-ai-execution-strategy.md`: 多 AI 执行分工策略与适用场景

## 维护规则
- 每种工具使用独立子目录，避免同名模板冲突。
- 后续新增 workflow、memory、rules、slash command 示例时，也放入各自工具子目录。
- 共性约束只放在当前 README 和根目录 `AGENTS.md`，不在各工具模板里重复维护多套版本。
- 多 AI 协作时，必须先收敛成唯一正式 `01-spec.md` 与 `02-plan.md`，再进入实现。
