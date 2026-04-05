# Multi AI Merge Prompt

## 用途
- 用于在 Cursor、Windsurf、Codex 三方输出后执行统一汇总。
- 适用于 `spec merge`、`plan merge`、`verify merge`。
- 目标是产出唯一正式文件，而不是简单罗列三方答案。

## 使用方式
- 将当前阶段替换为：
  - `spec`
  - `plan`
  - `verify`
- 将输入文件替换为对应的三方产物路径和正式输出路径。
- 可由任意一个工具执行，但它在本轮只负责 merge，不负责继续实现。

## Prompt
```text
你现在是多 AI 协作的 merge orchestrator，只负责汇总，不负责扩写新需求，不负责直接实现代码。

请先阅读：
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/01-spec-extraction.md
- ai-rules/02-architecture-planning.md
- ai-rules/05-verification-checklist.md
- specs/ai-tools-use/multi-ai-merge-checklist.md

当前阶段：
- stage: <spec|plan|verify>

当前输入：
- feature-id: <feature-id>
- source-1: <第一份工具结果路径>
- source-2: <第二份工具结果路径>
- source-3: <第三份工具结果路径>
- canonical-target: <正式输出文件路径>
- merge-record-target: <merge记录文件路径>

你的任务：
1. 比较三份输入的共识、冲突、遗漏和风险
2. 不以篇幅长短或语气自信作为采纳依据
3. 只保留与当前阶段目标有关的内容，不得擅自扩写下一阶段内容
4. 产出一份 merge 记录
5. 产出一份唯一正式文件

硬性约束：
- 如果是 spec merge：
  - 不得提前写实现细节
  - 必须收敛需求范围、验收标准、边界条件
- 如果是 plan merge：
  - 必须贴近当前仓库结构
  - 必须列出真实受影响文件、验证方式、风险和回滚点
- 如果是 verify merge：
  - 只能基于真实验证记录得出结论
  - 不得把未执行项写成通过

输出步骤：
1. 先输出 Merge Review
2. 再输出 canonical file content
3. 除非我明确要求，否则不要进入下一阶段

Merge Review 格式：
# Merge Review

## 阶段
- <spec|plan|verify>

## 共识
- ...

## 冲突点
- ...

## 采纳决策
- ...

## 放弃原因
- ...

## 遗留问题
- ...

## 输出文件
- <canonical-target>
- <merge-record-target>

Canonical 输出规则：
- 如果 stage=spec：
  - 输出完整 `01-spec.md`
- 如果 stage=plan：
  - 输出完整 `02-plan.md`
- 如果 stage=verify：
  - 输出完整 `04-verify.md` 或 `05-review-summary.md`
```

## 推荐输入示例

### Spec Merge
```text
stage: spec
feature-id: 0007-clipboard-source-jump
source-1: specs/0007-clipboard-source-jump/ai/cursor-spec.md
source-2: specs/0007-clipboard-source-jump/ai/windsurf-spec.md
source-3: specs/0007-clipboard-source-jump/ai/codex-spec.md
canonical-target: specs/0007-clipboard-source-jump/01-spec.md
merge-record-target: specs/0007-clipboard-source-jump/ai/merge-spec.md
```

### Plan Merge
```text
stage: plan
feature-id: 0007-clipboard-source-jump
source-1: specs/0007-clipboard-source-jump/ai/cursor-plan.md
source-2: specs/0007-clipboard-source-jump/ai/windsurf-plan.md
source-3: specs/0007-clipboard-source-jump/ai/codex-plan.md
canonical-target: specs/0007-clipboard-source-jump/02-plan.md
merge-record-target: specs/0007-clipboard-source-jump/ai/merge-plan.md
```

### Verify Merge
```text
stage: verify
feature-id: 0007-clipboard-source-jump
source-1: specs/0007-clipboard-source-jump/ai/cursor-verify.md
source-2: specs/0007-clipboard-source-jump/ai/windsurf-verify.md
source-3: specs/0007-clipboard-source-jump/ai/codex-verify.md
canonical-target: specs/0007-clipboard-source-jump/04-verify.md
merge-record-target: specs/0007-clipboard-source-jump/ai/merge-verify.md
```

## 使用建议
- merge 阶段优先使用同一个工具连续执行，减少 merge 风格漂移。
- merge 结果必须落盘，不能只停留在会话里。
- merge 完成后，再把正式文件作为下一阶段唯一输入。
