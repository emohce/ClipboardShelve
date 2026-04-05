# <tool> Prompts

## 1. 生成 Spec
```text
进入 Plan Mode。

先阅读以下文件：
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/01-spec-extraction.md

任务：
1. 先从我的输入里抽取或生成一个 feature-id，格式为 `NNNN-short-feature-name`
2. 基于该 feature-id，生成 `specs/<feature-id>/<tool>/01-spec.md`, 你的<tool>角色我会给出, 自行提换
3. 不写实现方案
4. 必须包含：目标、背景、用户场景、非目标、验收标准、边界与异常、影响范围、待确认项
5. 如果关键信息缺失，先提出最关键的 1~3 个问题，再根据回答完善 Spec
6. 如果我只给出一句 feature 描述，你要主动补齐可验证的 Spec 结构，而不是直接进入 Plan

输出要求：
- 先单独给出你识别出的 feature-id
- 直接输出可落盘的 Markdown
- 表述必须可验证，避免空泛措辞
```

## 1.1 从 feature 起步
```text
进入 Plan Mode。

我只会给你一个 feature 名称或一句话目标。

要求：
1. 先推导 feature-id
2. 判断当前信息是否足以写完整 Spec
3. 如果不足，先反问最关键的 1~3 个问题
4. 在信息足够后，只输出 `specs/<feature-id>/<tool>/01-spec.md`
5. 不进入实现和 Plan 阶段
```

## 2. 生成 Plan
```text
进入 Plan Mode。

先阅读以下文件：
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/02-architecture-planning.md
- specs/<feature-id>/<tool>/01-spec.md

任务：
1. 研究当前代码库相关入口与调用链
2. 生成 specs/<feature-id>/<tool>/02-plan.md
3. 不直接改代码

要求：
- 如果 `feature-id` 不明确，先从 `01-spec.md` 或我的输入中确认，不自行漂移命名
- 明确列出受影响文件
- 写清数据/状态变化、接口/交互变化、实施步骤、验证方案、风险与回滚点
- 方案必须符合当前仓库结构和现有技术栈
```

## 3. 生成 Tasks
```text
先阅读以下文件：
- AGENTS.md
- ai-rules/03-task-decomposition.md
- specs/<feature-id>/<tool>/02-plan.md

任务：
1. 生成 specs/<feature-id>/<tool>/03-tasks.md
2. 拆分为原子任务
3. 每个任务都要便于单独实现和单独验证

限制：
- 不写代码
- 不扩写未在 Plan 中出现的需求
```

## 4. 执行单个任务
```text
先阅读以下文件：
- AGENTS.md
- ai-rules/04-implementation-constraints.md
- ai-rules/05-verification-checklist.md
- specs/<feature-id>/<tool>/02-plan.md
- specs/<feature-id>/<tool>/03-tasks.md
- specs/<feature-id>/<tool>/04-verify.md

任务：
1. 只实现 <task-id>
2. 保持最小改动
3. 完成后执行必要验证
4. 更新 specs/<feature-id>/<tool>/04-verify.md

输出要求：
- 说明修改了哪些文件
- 说明验证结果
- 若存在未验证项，明确写出原因
```
