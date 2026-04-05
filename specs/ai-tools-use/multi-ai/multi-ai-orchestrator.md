# Multi AI Orchestrator

## 目标
- 让 Cursor、Windsurf、Codex 在同一需求上并行思考。
- 每一阶段先分头产出，再集中汇总，最终只保留一份正式结果进入下一阶段。
- 避免三个工具同时自由修改同一份代码导致漂移和冲突。

## 总体原则
- 每一阶段必须先有唯一正式文件，再进入下一阶段。
- 各工具产物只作为候选输入，不直接视为最终结论。
- 实现阶段默认不采用三工具同时全量改同一批文件。
- 高风险需求采用“三方思考 + 一方主实现 + 两方复核”的模式。

## 推荐目录
```text
specs/<feature-id>/
  00-intake.md
  01-spec.md
  02-plan.md
  03-tasks.md
  04-verify.md
  05-review-summary.md
  ai/
    cursor-spec.md
    windsurf-spec.md
    codex-spec.md
    cursor-plan.md
    windsurf-plan.md
    codex-plan.md
    cursor-exec.md
    windsurf-exec.md
    codex-exec.md
    cursor-verify.md
    windsurf-verify.md
    codex-verify.md
    merge-spec.md
    merge-plan.md
    merge-verify.md
```

## 阶段流程

### 1. Intake
- 输入只有 feature 名称、目标、背景或问题描述也可以启动。
- 先统一抽取 `feature-id`。
- 若三工具推导出的 `feature-id` 不一致，由编排器确定唯一目录名。
- 把用户原始输入落到 `00-intake.md`。

### 2. Parallel Spec
- Cursor、Windsurf、Codex 各自基于同一输入生成一份详细 spec。
- 输出到：
  - `ai/cursor-spec.md`
  - `ai/windsurf-spec.md`
  - `ai/codex-spec.md`
- 如果信息不足，先由各工具提出关键澄清问题，再统一收口。

### 3. Spec Merge
- 由编排器比较三份 spec 的共识、冲突、遗漏和风险。
- 输出 `ai/merge-spec.md`，记录取舍理由。
- 最终生成唯一正式文件 `01-spec.md`。
- 没有正式 `01-spec.md` 不进入 plan。

### 4. Parallel Plan
- 三工具只读取正式 `01-spec.md`，分别输出自己的技术方案。
- 输出到：
  - `ai/cursor-plan.md`
  - `ai/windsurf-plan.md`
  - `ai/codex-plan.md`

### 5. Plan Merge
- 编排器汇总三份 plan，判断哪一份更贴近当前仓库。
- 输出 `ai/merge-plan.md`。
- 最终生成唯一正式 `02-plan.md`。

### 6. Tasks
- 任务拆分建议只保留一份正式 `03-tasks.md`。
- 不建议三方各拆一份 tasks，否则粒度容易漂移、重复或漏项。

### 7. Execution
- 默认采用：
  - 一方主实现
  - 一方针对高风险模块给补充实现建议
  - 一方做代码审视和风险挑战
- 各工具记录自己的执行笔记到：
  - `ai/cursor-exec.md`
  - `ai/windsurf-exec.md`
  - `ai/codex-exec.md`

### 8. Verify
- 三工具基于同一正式实现分别核验。
- 输出到各自的 `ai/*-verify.md`。
- 编排器最终合并为：
  - `ai/merge-verify.md`
  - `04-verify.md`
  - `05-review-summary.md`

## 编排器职责
- 统一 `feature-id`
- 统一正式 spec / plan / tasks / verify
- 比较多方结论的共识与冲突
- 记录采纳理由与放弃理由
- 控制阶段切换，不允许跳步

## 编排器提示词模板
```text
你是多 AI 协作编排器。

输入：
- 用户需求 / 00-intake.md
- Cursor 结果
- Windsurf 结果
- Codex 结果

任务：
1. 识别三方共识
2. 识别冲突点和缺失点
3. 说明每个冲突点的取舍理由
4. 产出唯一正式文件
5. 未形成唯一结论前，不进入下一阶段

输出格式：
# Merge Decision

## 共识
- ...

## 冲突点
- ...

## 采纳决策
- ...

## 放弃原因
- ...

## 输出文件
- specs/<feature-id>/01-spec.md
```

## 适用场景
- 复杂功能
- 高风险重构
- 需求不清晰、容易歧义的任务
- 需要多个视角相互挑战的方案设计

## 不适用场景
- 微小修复
- 单文件样式调整
- 低风险文档修改
- 已有唯一明确实现路径的简单需求
