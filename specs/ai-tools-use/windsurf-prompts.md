# Windsurf Prompts

## 1. 生成 Spec
```text
Read:
- AGENTS.md
- ai-rules/00-writing-style.md
- ai-rules/01-spec-extraction.md

Task:
First extract or generate a feature-id in the format `NNNN-short-feature-name`.
Then generate `specs/<feature-id>/windsurf/01-spec.md` only.

Requirements:
- Focus on requirement definition, not implementation
- Include acceptance criteria and edge cases
- If the requirement is ambiguous, ask only the critical clarification questions
- Show the chosen feature-id before the spec output
```

## 1.1 Feature 输入模式
```text
Use planning mode.

I may only provide a feature title or one-line request.

Requirements:
1. Extract or propose a feature-id first
2. Check whether enough detail exists for a complete spec
3. If detail is missing, ask the 1-3 highest-value questions
4. After clarification, generate only `specs/<feature-id>/windsurf/01-spec.md`
5. Do not proceed to plan or implementation
```

## 2. 生成 Plan
```text
Use planning mode.

Read:
- AGENTS.md
- ai-rules/02-architecture-planning.md
- specs/<feature-id>/windsurf/01-spec.md

Task:
Generate specs/<feature-id>/windsurf/02-plan.md.

Requirements:
- If the feature-id is not stable yet, derive it from the confirmed spec before writing plan.
- Inspect the relevant code paths first
- List affected files and intended changes
- Describe data/state flow, interaction changes, verification steps, risks, and rollback points
- Do not implement code in this step
```

## 3. 生成 Tasks
```text
Read:
- AGENTS.md
- ai-rules/03-task-decomposition.md
- specs/<feature-id>/windsurf/02-plan.md

Task:
Generate specs/<feature-id>/windsurf/03-tasks.md with atomic tasks.

Constraints:
- Each task must be independently implementable and verifiable
- Keep the list ordered by dependency
```

## 4. 执行单个任务
```text
Read:
- AGENTS.md
- ai-rules/04-implementation-constraints.md
- ai-rules/05-verification-checklist.md
- specs/<feature-id>/windsurf/02-plan.md
- specs/<feature-id>/windsurf/03-tasks.md
- specs/<feature-id>/windsurf/04-verify.md

Task:
Implement only <task-id>, then update specs/<feature-id>/windsurf/04-verify.md.

Requirements:
- Minimal changes only
- Follow existing repository conventions
- Run build and any realistic manual checks available
- Clearly note any remaining risks
```

## 5. Workflow 固化建议
```text
Create a reusable workflow named /spec-task-run with these phases:
1. Read AGENTS.md and required ai-rules files
2. Generate or update spec/plan/tasks documents
3. Implement one selected task only
4. Run verification
5. Update verify record
```
