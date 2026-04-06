# Architecture Planning Rules

## 目标
- 在进入实现前形成可执行、可评估、可回滚的 `02-plan.md`。

## 输入前置
- 先读取 [`ai-rules/00-error-memory.md`](00-error-memory.md)。
- 如命中历史记录，必须阅读对应正文。
- 先确认真实运行通路、真实数据源、真实事件链，不基于表面症状直接出方案。

## 输出结构
```md
# Plan

## Summary
## Current State
## Root Cause Or Main Constraint
## Options Considered
## Chosen Approach
## Affected Files
## Historical Record Strategy
## Risks And Rollback
## Verification Plan
```

## 规则
- `Current State` 要写清现状实现、入口、调用链、关键状态。
- `Root Cause Or Main Constraint` 优先写已确认根因；若未确认，要明确当前只是主约束而非最终根因。
- `Options Considered` 至少写清为什么不用已证伪路径或高风险路径。
- `Chosen Approach` 优先选择最短可验证路径，不为“更优雅”做超范围重构。
- `Affected Files` 只列高影响文件，并说明职责。
- `Historical Record Strategy` 必须写明：
- 命中的错误记录或 ADR。
- 本次沿用、规避、替代了什么。
- 是否预计产生新的错误记录或 ADR。
- `Verification Plan` 必须覆盖“是否真正绕开历史失败通路”。
