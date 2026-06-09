# Project Rules

Tool: codex

## Project Profile

- Name: `EzClipboard`
- Current inferred stack: Vue 3 + Vite + Element Plus + uTools clipboard utility
- Migration date: 2026-06-06

## Detected Manifests

- `package.json`
- `vite.config.js`

## Local Rule Policy

- Keep project-specific constraints here; move reusable cross-project rules to CodeNote.
- Do not overwrite existing user work or unrelated business files.
- Before implementation, inspect the relevant source paths and existing docs for the current task.
- For UI work, follow project style first, then CodeNote UI rules.
- For security, data, release, or permission work, apply CodeNote high-risk gates.

## High-Risk Areas

- Treat configuration, credentials, release scripts, generated artifacts, data mutations, and external-service writes as high risk until project-specific rules say otherwise.
- Add concrete high-risk paths here as they are discovered.
## Migrated Project-Specific Constraints

- 修改 `public/plugin.json`、`public/preload.js`、`public/listener.js` 前必须说明影响范围和回归风险。
- 修改 `src/global/` 前必须明确事件链、快捷键链、窗口行为或持久化路径。
- 修改动态滚动、焦点、高亮、列表导航时必须确认真实滚动祖先、真实焦点入口和真实触发链。
- `dist/` 是构建产物，不手改。
