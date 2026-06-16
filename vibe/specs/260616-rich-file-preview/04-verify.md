# Verify: 常见文件富预览

Tool: codex

## Automated
- `node test-preview-layout.mjs`
- `node test-file-preview.mjs`
- `node test-preview-scroll.mjs`
- `pnpm run build`

## Manual Checklist
- Shift 预览：PDF、MD、ADOC、CSV、XLSX、DOCX、TXT、图片、多文件混合项。
- `s-up/down`：短按单步，持续 500ms 后逐档加速，松开后重置。
- `s-left/right`：CSV/Excel 宽表格可横向移动；宽 PDF/HTML 内容实际溢出时可移动。
- 图片：超宽/超长仍保留 Shift+方向键移动。
- 安全：MD/AD/DOCX 中脚本和 `javascript:` 链接不执行。
- 超限：大文件显示跳过内嵌预览，不阻塞 UI。

## Current Result
- `node test-preview-layout.mjs && node test-file-preview.mjs && node test-preview-scroll.mjs` 已通过。
- `pnpm run build` 已通过，保留 Vite chunk-size warning；PDF、PapaParse、read-excel-file、Mammoth、AsciiDoctor 已拆为独立 chunk。
- `pnpm audit --prod`：新增 `xlsx` 风险已通过改用 `read-excel-file` + `papaparse` 移除；仍返回 5 个既有依赖链 advisory（`element-plus` -> `lodash/lodash-es`，`vue` compiler -> `postcss`）。
- in-app browser 干净标签打开 `http://127.0.0.1:8099/`：`#app` 与 `.clip-item-list` 存在，无 Vite error overlay，控制台 error 为空。
- uTools 外壳真实文件剪贴板手工验证待最终产品联调执行。
