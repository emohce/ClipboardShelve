# Codex Prompts

## 1. 生成 Spec
```text
Read AGENTS.md and ai-rules/00-writing-style.md and ai-rules/01-spec-extraction.md.

Task:
- Based on the requirement I provide next, produce specs/<feature-id>/codex/01-spec.md.
- Do not write implementation details.
- Include goal, background, scenarios, non-goals, acceptance criteria, edge cases, impact scope, and open questions.

Constraints:
- Keep it executable and verifiable.
- Use concise Markdown suitable for repository storage.
```

## 2. 生成 Plan
```text
Read:
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/02-architecture-planning.md
- specs/<feature-id>/codex/01-spec.md

Task:
- Inspect the codebase first.
- Produce specs/<feature-id>/codex/02-plan.md only.
- Do not implement code yet.

Requirements:
- List affected files with purpose.
- Describe data/state changes, UI or API changes, execution steps, verification plan, risks, and rollback points.
- Keep the solution aligned with the existing Vue 3 + uTools project structure.
```

## 3. 生成 Tasks
```text
Read:
- AGENTS.md
- ai-rules/03-task-decomposition.md
- specs/<feature-id>/codex/02-plan.md

Task:
- Produce specs/<feature-id>/codex/03-tasks.md.
- Break the work into atomic tasks that can be implemented and verified independently.
- Do not write code.
```

## 4. 执行单个任务
```text
Read:
- AGENTS.md
- ai-rules/04-implementation-constraints.md
- ai-rules/05-verification-checklist.md
- specs/<feature-id>/codex/02-plan.md
- specs/<feature-id>/codex/03-tasks.md
- specs/<feature-id>/codex/04-verify.md

Task:
- Implement only <task-id>.
- Keep changes minimal and consistent with the repository style.
- Run the relevant verification steps available in this repository.
- Update specs/<feature-id>/codex/04-verify.md after implementation.

Report:
- Changed files
- Verification results
- Remaining risks or unverified items
```

## 5. 并行线程模板
```text
Read AGENTS.md and specs/<feature-id>/codex/03-tasks.md.

Task:
- Work only on <task-id>.
- Assume other agents may edit other files in parallel.
- Do not revert unrelated changes.
- Update only the files required for your assigned task.
```
