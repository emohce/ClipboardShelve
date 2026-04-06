# Spec Extraction Rules

## 目标
- 把用户需求转成可实现、可验证、可交接的 `01-spec.md`。

## 输入前置
- 先阅读 [`ai-rules/00-error-memory.md`](00-error-memory.md) 并检索是否命中历史失败模式。
- 先阅读 [`docs/glossary.md`](../docs/glossary.md) 中涉及的领域术语，避免词义漂移。
- 若任务与历史失败模式相似，`spec` 必须写明“历史误区与本次排除项”。

## 输出结构
```md
# Spec

## Summary
## Scope
## Non-Goals
## Inputs / Outputs
## Constraints
## Acceptance Criteria
## Historical Pitfalls And Exclusions
## Risks
```

## 规则
- `Summary` 写清用户真正要解决的问题，不复述冗长对话。
- `Scope` 只写本次批准范围内的改动。
- `Non-Goals` 明确不做什么，避免实现扩散。
- `Constraints` 写清环境约束、兼容边界、已有规则、历史失败路径。
- `Acceptance Criteria` 必须可验证，避免“优化体验”这类空描述。
- 如果命中错误经验，`Historical Pitfalls And Exclusions` 必须列出：
- 命中的记录编号。
- 已证伪方案。
- 本次采用或规避的策略。
