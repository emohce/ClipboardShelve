# Specs

## 目录约定
```text
specs/
  0000-template/
  0001-feature-name/
  0002-another-feature/
  ai-tools-use/
    cursor-prompts.md
    codex-prompts.md
    windsurf-prompts.md
```

## 规则
- 每个真实需求使用独立目录，避免多个需求混在同一份文档。
- `0000-template/` 只做模板，不记录真实需求。
- `ai-tools-use/` 存放不同 AI 工具的统一提示词模板，并按工具子目录隔离。

## 最小流程
1. 复制 `0000-template/` 为新需求目录
2. 先完成 `01-spec.md`
3. 再完成 `02-plan.md`
4. 再完成 `03-tasks.md`
5. 实现后持续更新 `04-verify.md`
