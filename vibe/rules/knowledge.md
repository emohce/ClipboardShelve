# Knowledge Rules

Tool: codex

## Routing

- Memory reference index: `vibe/knowledge/MEMORY_INDEX.md`
- Error memories: `vibe/knowledge/error-memory/`
- ADRs: `vibe/knowledge/adr/`
- Glossary/domain notes: `vibe/knowledge/glossary.md` or domain-specific files
- Active process docs: `vibe/specs/`
- Eval records: `vibe/evals/`

## Migration Notes

- Legacy material is preserved in `vibe/knowledge/legacy/`.
- No DB-specific workspace was created during migration.

## Write Policy

- Search existing knowledge before adding new records.
- Store only reusable, verified, safe knowledge.
- Mark evidence as code, test, DBTools, user-confirmed, official-doc, or inference.
- Link old and new docs when business behavior changes.

## Document Governance Map

- Knowledge index: [../knowledge/README.md](../knowledge/README.md)
- Memory reference index: [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md)
- Project process hub: [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md)
- Specs index: [../specs/README.md](../specs/README.md)
- Legacy map: [../knowledge/legacy/README.md](../knowledge/legacy/README.md)
- DB workspace: not configured for this project
- Use `--all-markdown` only for deep historical document hygiene; default audit covers active AI rule surfaces.

## Process Hub Policy

- Before opening a new process directory, check [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) and [../specs/README.md](../specs/README.md) for existing active or related work.
- Update [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) when the active focus, task status, or authoritative process document changes.
- Keep the hub as an index and routing surface; detailed requirements, plans, tasks, verification, and handoff notes stay in task directories.

## Task Knowledge Policy

- Medium or larger tasks must define `Knowledge Context`: required reads, related memories, implementation constraints, non-goals, and memory routing.
- Task plans must state the implementation path and rejected alternatives when there is more than one plausible path.
- Task progress must be updated in [../specs/PROJECT_STATUS.md](../specs/PROJECT_STATUS.md) when scope, status, authoritative docs, or verification state changes.
- Reusable findings discovered during a task must be routed through [../knowledge/MEMORY_INDEX.md](../knowledge/MEMORY_INDEX.md); do not scatter new long-term memory across task notes without an index link.
