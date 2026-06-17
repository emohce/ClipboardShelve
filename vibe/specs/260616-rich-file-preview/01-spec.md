# Spec: 常见文件富预览

Tool: codex

## 1. 目标
- 扩展 `file` 类型预览，支持 PDF、Markdown、AsciiDoc、CSV、JSON/JSONC、YAML、Excel xlsx/xlsm、Word docx、PowerPoint pptx/ppsx、常见文本文件。
- 保持图片文件继续走既有图片预览策略和 Shift+方向键移动。
- 统一预览滚动命令，默认 `s-up/down/left/right`，保留 command 可改键。

## 2. 用户可观察行为
- Shift 按住文件记录时，优先选择第一个可预览文件；图片显示图片预览，其他常见文件显示右侧富预览浮层。
- 全屏详情中，文件记录展示富预览和原文件列表。
- `.json/.jsonc/.yaml/.yml` 显示结构化树；`.txt` / 无扩展名内容保守自动识别 JSON/YAML/CSV/AsciiDoc/Markdown 并渲染，识别或解析失败时保持纯文本。
- 普通剪贴板文本预览不按当前 tab 分支判断；同一条目在全部、文字、收藏等 tab 下都按内容保守识别 JSON/YAML/CSV/AsciiDoc/Markdown，并进入对应特殊预览；编号大纲 + 缩进列表按 Markdown 处理，`- [ ]` checklist 按 AsciiDoc 处理。
- 预览滚动按同方向持续时间加速：500ms 后每 500ms 增加一档，最高不超过可视轴 90%。
- CSV/Excel 等宽表格支持横向和纵向滚动；文本/结构化树/MD/AD/DOCX/PDF 默认纵向，实际横向溢出时也可左右移动。

## 3. 约束
- 不改 `item.type` / `item.data` / `originPaths` 存储结构。
- 不改旧 command id，兼容现有用户改键。
- 文件读取仅使用现有 preload 暴露的 `readFileSync` / `statSync` / `Buffer` / `readTextPreviewFile` / `readBinaryPreviewFile`。
- HTML 输出必须清洗后再进入 `v-html`。

## 4. 代码落点
- 文件分类、大小阈值、HTML 清洗兜底、表格抽样：[../../../src/utils/filePreview.mjs](../../../src/utils/filePreview.mjs:1)。
- 普通文本内容级预览构建：[../../../src/utils/textDocumentPreview.mjs](../../../src/utils/textDocumentPreview.mjs:1)。
- 预览加速步进：[../../../src/utils/previewScroll.mjs](../../../src/utils/previewScroll.mjs:1)。
- 富预览组件与 lazy import 解析链：[../../../src/cpns/FileRichPreview.vue](../../../src/cpns/FileRichPreview.vue:1)。
- Shift 悬浮预览接入：[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:115)、[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:480)、[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1120)。
- 全屏详情接入：[../../../src/cpns/ClipFullData.vue](../../../src/cpns/ClipFullData.vue:22)。
- 快捷键显示文案：[../../../src/global/commandDefaults.js](../../../src/global/commandDefaults.js:83)、[../../../src/global/hotkeyLabels.js](../../../src/global/hotkeyLabels.js:117)。

## 5. Knowledge Context
- required:
  - [../PROJECT_STATUS.md](../PROJECT_STATUS.md)
  - [../../knowledge/MEMORY_INDEX.md](../../knowledge/MEMORY_INDEX.md)
  - [../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](../../vibe-doc/ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md)
  - [../../vibe-doc/ai-error-memory/2026-04-10-utools-runtime-assets.md](../../vibe-doc/ai-error-memory/2026-04-10-utools-runtime-assets.md)
- memory routing: task-local process docs only; no reusable memory promotion yet.

## 6. 非目标
- 不解析 `.doc`、`.xls`、`.ods`、`.ppt`；PPTX/PPSX 仅做低保真文本提取预览，不还原完整幻灯片版式。
- 不把文件正文写入剪贴板搜索索引。
- 不做 Office 完整版式还原或 PDF 标注能力。
