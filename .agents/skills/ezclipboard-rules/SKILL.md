---
name: ezclipboard-rules
description: Use at the start of any EzClipboard coding, UI, storage, documentation, or release task to load the project rule tree, global CodeNote rules, high-risk gates, and task-specific memories without copying all rules into the prompt.
---

# EzClipboard Rules Router

Use this project skill as the compact entry point for AI tools that support skills or project memories.

## Always Read First

- Project adapter: [../../../AGENTS.md](../../../AGENTS.md)
- Project rule index: [../../../vibe/rules/README.md](../../../vibe/rules/README.md)
- Project documentation rules: [../../../vibe/rules/documentation.md](../../../vibe/rules/documentation.md)
- Project developer soul: [../../../vibe/knowledge/developer-soul.md](../../../vibe/knowledge/developer-soul.md)
- Memory reference index: [../../../vibe/knowledge/MEMORY_INDEX.md](../../../vibe/knowledge/MEMORY_INDEX.md)
- Project process hub: [../../../vibe/specs/PROJECT_STATUS.md](../../../vibe/specs/PROJECT_STATUS.md)
- Global CodeNote rules: [../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md](../../../../CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/VibeAi.md)

## Task-Specific Loading

- UI / interaction / layout: read [../../../vibe/vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](../../../vibe/vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md) and [../ezclipboard-ui/SKILL.md](../ezclipboard-ui/SKILL.md).
- Storage / migration / performance: read [../../../vibe/vibe-doc/ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md](../../../vibe/vibe-doc/ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md) and [../../../vibe/specs/performance-rewrite/README.md](../../../vibe/specs/260609-performance-rewrite/README.md).
- Clipboard navigation / search / deletion: read [../../../vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md](../../../vibe/vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md).
- uTools runtime assets: read [../../../vibe/vibe-doc/ai-error-memory/2026-04-10-utools-runtime-assets.md](../../../vibe/vibe-doc/ai-error-memory/2026-04-10-utools-runtime-assets.md).
- Documentation / memory updates: read [../../../vibe/rules/knowledge.md](../../../vibe/rules/knowledge.md) and [../../../vibe/knowledge/MEMORY_INDEX.md](../../../vibe/knowledge/MEMORY_INDEX.md), then run link audits when citing code.
- Process / project progress updates: read [../../../vibe/specs/PROJECT_STATUS.md](../../../vibe/specs/PROJECT_STATUS.md), then update it when task status, active focus, or authoritative process docs change.
- Architecture / UI / interaction / configuration taste: read [../../../vibe/knowledge/developer-soul.md](../../../vibe/knowledge/developer-soul.md) and preserve its project-specific defaults unless task evidence justifies a deviation.

## Operating Rules

- Do not copy the global CodeNote rule body into this repository; link to it.
- Load only the relevant task-specific memory after reading the core rule index.
- Preserve existing user changes and unrelated business code.
- Before UI edits, explain why the current structure is insufficient and how verification will prove the new structure is safe.
- Before storage edits, explain migration, fallback, repeat-import, and data-consistency impact.
- Final replies must include verification status and memory/process-document status.
