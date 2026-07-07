# 验证记录

Tool: codex
Date: 2026-07-07

## 自动验证

- `node test-shortcut-command-system.js`：通过。
  - 覆盖普通置顶快捷粘贴 partial image hydrate、置顶组合 id 解析 hydrate、置顶组合运行时 cache hydrate。
  - 备注：Node 输出既有 `MODULE_TYPELESS_PACKAGE_JSON` 告警；现有 silent fallback 用例仍输出一次 `hideMainWindowPaste* unavailable` 日志，不影响断言。
- `node test-storage-query.js`：通过。
  - 备注：Node 输出既有 `MODULE_TYPELESS_PACKAGE_JSON` 告警。
- `node test-image-payload-path.js`：通过。
  - 覆盖 SVG data URL、`createFile(image)` 与别名图片共用文件路径解析、Mac `file:///Users/...`、Windows `file:///C:/...` 和操作入口 hydrate 防御。
- `pnpm run build`：通过。
  - 备注：Vite 输出既有 `pdfjs-dist` eval 警告，不影响本次构建。
- `git diff --check`：通过。
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_code_links.py --root /Users/gdkmjd/work/czz/EzClipboard vibe/specs/260707/1032-pin-image-base64-hydration vibe/knowledge/quick-paste-runtime.md vibe/knowledge/quick-paste-pin-group-cache.md vibe/knowledge/technical-details.md vibe/knowledge/error-memory/README.md vibe/knowledge/error-memory/2026-07-07-externalized-payload-hydration.md vibe/specs/PROJECT_STATUS.md`：通过。
- `python3 /Users/gdkmjd/work/czz/CzzProj/CodeNote/AiRef/VibePractice/Vibe_Rules/scripts/audit_ai_rules.py . --mode project`：通过。

## 手工验证状态

- Mac 真实 uTools：未在本轮自动执行真实窗口操作；建议复测普通截图置顶后列表展示、置顶快捷粘贴、置顶组合循环粘贴、收藏标签编辑预览。
- Windows 真实 uTools：当前机器无法真实复测；建议复测置顶、组合、`file:///C:/...` 图片复制。

## 文档与记忆

- 过程文档：当前目录。
- 长期知识：已更新 [../../../knowledge/quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md)、[../../../knowledge/quick-paste-pin-group-cache.md](../../../knowledge/quick-paste-pin-group-cache.md)、[../../../knowledge/technical-details.md](../../../knowledge/technical-details.md)。
- 错误归档：已新增 [../../../knowledge/error-memory/2026-07-07-externalized-payload-hydration.md](../../../knowledge/error-memory/2026-07-07-externalized-payload-hydration.md)。
