# Verify: 常见文件富预览

Tool: codex

## Automated
- `node test-preview-layout.mjs`
- `node test-file-preview.mjs`
- `node test-preview-scroll.mjs`
- `pnpm run build`

## Manual Checklist
- Shift 预览：PDF、MD、ADOC、CSV、XLSX、DOCX、TXT、图片、多文件混合项。
- PPTX/PPSX：低保真展示 slide 编号、标题和正文文本；`.ppt` 降级为不可富预览。
- `s-up/down`：短按单步，持续 500ms 后逐档加速，松开后重置。
- `s-left/right`：CSV/Excel 宽表格可横向移动；宽 PDF/HTML 内容实际溢出时可移动。
- 图片：超宽/超长仍保留 Shift+方向键移动。
- 安全：MD/AD/DOCX 中脚本和 `javascript:` 链接不执行。
- 超限：大文件显示跳过内嵌预览，不阻塞 UI。

## Current Result
- `node test-preview-layout.mjs && node test-file-preview.mjs && node test-preview-scroll.mjs` 已通过；`test-file-preview.mjs` 覆盖 PDF.js 版本、es5 入口、`isEvalSupported: false`、`Promise.withResolvers`、原生私有字段语法和 Babel private-field helper 回归。
- `pnpm run build` 已通过，保留 Vite chunk-size warning；PDF、PapaParse、read-excel-file、Mammoth、AsciiDoctor 已拆为独立 chunk。`pdfjs-dist@2.6.347` 包内 eval 触发 Rollup warning，但运行时通过 `isEvalSupported: false` 关闭。
- 继续优化已完成：PDF 切换/卸载时释放文档实例，过期异步渲染不再写回当前预览；滚动触发后续页失败时收敛为组件错误状态；Excel 改用 `read-excel-file/universal`，避免浏览器 worker 入口在 uTools/Electron 中的不确定性。
- PDF 兼容修复已完成：uTools 外壳截图中 `Promise.withResolvers is not a function` / `Cannot read from private field` / `attempted to get private field on non-instance` 源于较新 `pdfjs-dist` 入口对较新 Promise API、原生私有字段或 Babel private-field helper 的依赖；组件已固定到 `pdfjs-dist@2.6.347` es5 主入口和同版本 worker，并补充入口回归测试。
- PDF 首屏性能优化已完成：初始渲染从 3 页缩减为 1 页，后续页通过空闲调度逐页补齐；页面图片从 base64 data URL 改为 object URL；PDF.js 模块和第 1 页 Blob 增加运行期缓存；渲染 scale 改为按容器宽度限幅；切换/卸载/过期渲染会释放 object URL。
- PDF 极速首屏路径已完成：preload 暴露 `renderPdfFirstPagePreview`，uTools 外壳优先用内置 Sharp 渲染 PDF 第 1 页；组件在 Sharp 成功后先显示首屏，再后台初始化 PDF.js 获取页数和补页。Sharp 缺失/失败、浏览器 dev 或 PDF.js 首屏失败时保留原 PDF.js 降级；性能日志仅在 dev/调试开关输出 `statMs/readMs/firstPageMs/backend/fallbackReason`。
- 其他文档首屏优化已完成：preload 暴露 `readTextPreviewFile` / `readBinaryPreviewFile`；TXT/MD/ADOC/CSV 使用异步首段读取，DOCX/XLSX 使用异步完整二进制读取并沿用大小阈值；组件增加 12 项非 PDF 解析结果缓存，重复预览同一文件不重复解析。
- PPTX/PPSX 低保真预览已完成：新增 `jszip@3.10.1`，解析 `ppt/slides/slide*.xml` 文本节点，最多展示前 20 张、每张前 20 行；`.ppt` 继续不支持，避免误判二进制格式。
- `pnpm audit --prod`：当前返回 6 个 advisory，其中新增 `pdfjs-dist<=4.1.392` CVE；本修复按 GitHub advisory workaround 在 `getDocument` 显式设置 `isEvalSupported: false`，其余仍为既有依赖链 advisory（`element-plus` -> `lodash/lodash-es`，`vue` compiler -> `postcss`）。
- in-app browser 干净标签打开新 Vite 进程 `http://127.0.0.1:8103/`：`#app` 与 `.clip-item-list` 存在，无 Vite error overlay，控制台 error 为空；验证后已清理临时进程。
- uTools 外壳真实文件剪贴板手工验证待最终产品联调执行，重点确认小 PDF/大 PDF/多页扫描 PDF 的 Sharp 首屏耗时和 PDF.js 后台补页。
