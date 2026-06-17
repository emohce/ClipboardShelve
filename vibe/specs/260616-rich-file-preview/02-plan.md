# Plan: 常见文件富预览

Tool: codex

## 1. 实施方案
- 新增纯函数工具，先覆盖文件分类、大小阈值、HTML 清洗兜底、表格抽样和滚动加速。
- 新增 [../../../src/cpns/FileRichPreview.vue](../../../src/cpns/FileRichPreview.vue:1)，集中处理读取、解析、状态、滚动容器和 PDF 按需加载。
- 在 [../../../scripts/utools-runtime-assets.mjs](../../../scripts/utools-runtime-assets.mjs:1) 的 preload 资产中暴露 `renderPdfFirstPagePreview`，用 uTools 内置 Sharp 生成 PDF 第 1 页图片。
- 同一 preload 资产暴露 `readTextPreviewFile` / `readBinaryPreviewFile`，让 TXT/MD/ADOC/CSV/DOCX/XLSX 预览读取从渲染线程同步 I/O 切换到异步 I/O。
- `.json/.jsonc/.yaml/.yml` 增加结构化树预览；`.txt` / 无扩展名使用保守内容识别自动渲染 JSON/YAML/CSV/AsciiDoc/Markdown，失败回退纯文本。
- 普通文本条目的 Shift 预览使用同一内容级预览构建器，不按当前 tab 分支；全部、文字、收藏等 tab 下同一条目预览结果一致。
- 在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1120) 的 `file` 分支选择第一个可预览文件；图片保留旧预览，其他文件进入富预览。
- 在 [../../../src/cpns/ClipFullData.vue](../../../src/cpns/ClipFullData.vue:22) 保留 `FileList`，上方增加富预览。
- 保留旧 command id，仅把文案和处理器语义统一为“预览滚动”。
- PPTX/PPSX 增加低保真幻灯片文本预览：读取 OOXML 包内 `ppt/slides/slide*.xml`，提取文本并按 slide card 展示，不做高清渲染或版式还原。

## 2. 依赖策略
- 直接依赖：`pdfjs-dist`、`markdown-it`、`dompurify`、`@asciidoctor/core`、`read-excel-file`、`papaparse`、`mammoth`、`jszip`、`yaml`。
- 组件内部使用 `import()` 动态加载，避免主流程同步加载解析器。
- 不新增 `sharp` npm 依赖；uTools 外壳优先调用内置 `utools.sharp`，浏览器 dev 或旧外壳缺失时自动退回 PDF.js。
- PDF 固定使用 `pdfjs-dist@2.6.347` 的 es5 `pdf.js` / `pdf.worker.js`，避开 uTools 外壳对现代 `Promise.withResolvers`、原生私有字段与 Babel private-field helper 的兼容问题；`getDocument` 必须保留 `isEvalSupported: false`。
- PDF worker 使用 Vite `new URL(..., import.meta.url)` 产物路径。

## 3. 安全与性能
- 默认阈值在 [../../../src/utils/filePreview.mjs](../../../src/utils/filePreview.mjs:1)：文本/JSON/YAML/MD/AD/CSV 5MB，Office 20MB，PDF/图片 50MB。
- HTML 预览统一走 DOMPurify；DOMPurify 不可用时使用兜底清洗。
- CSV/Excel xlsx/xlsm 只展示前 100 行、前 30 列。
- TXT/MD/ADOC/JSON/YAML 默认只读取首段 1MB 用于预览；CSV 默认只读取首段 512KB 后解析前 100 行，避免大文本和宽表格整文件阻塞。
- 结构化 JSON/YAML 只展示深度 6、最多 300 个节点，长字符串截断到 300 字符；解析失败时显示原文，不进入错误态。
- 普通文本预览也复用结构化树、HTML 和表格展示；异步 Markdown/YAML/AsciiDoc 渲染用 token 防止旧条目结果写回当前预览。
- DOCX/XLSX 仍需完整文件交给现有解析库，但二进制读取改为 preload 异步读取，并受既有 20MB 阈值限制。
- PPTX/PPSX 只展示前 20 张幻灯片、每张前 20 行文本，文件大小阈值 30MB；`.ppt` 二进制格式继续降级为不可富预览。
- 非 PDF 富预览按 `kind:path:size:mtimeMs:mode` 做最多 12 项运行期缓存，重复 Shift 预览优先复用解析结果。
- PDF 初始只渲染第 1 页；滚动接近底部时通过空闲调度逐页补齐后续页面。
- PDF 首屏优先走 preload `renderPdfFirstPagePreview(path, { density, maxWidth })`，避免渲染线程先同步读取完整 PDF；Sharp 首屏失败时保留现有 PDF.js fallback。
- PDF 页面按容器宽度计算渲染 scale，hover 预览最高 0.95，全屏详情最高 1.15，避免固定高倍渲染拖慢首屏。
- PDF 页面图片使用 `canvas.toBlob()` + object URL，组件切换、卸载和缓存淘汰时释放 URL，避免 base64 data URL 放大内存和响应式更新成本。
- PDF.js 模块加载使用运行期 promise 缓存；第 1 页 Blob 按 `path:size:mtimeMs:mode` 做最多 6 项 LRU 缓存，重复预览同一文件优先秒开首屏。
- PDF 性能日志仅在 uTools dev 或 `globalThis.__EZ_CLIPBOARD_DEBUG_PDF_PREVIEW__` 开启时输出，字段包含 `statMs/readMs/firstPageMs/backend/fallbackReason`。

## 4. 滚动加速
- 步进计算在 [../../../src/utils/previewScroll.mjs](../../../src/utils/previewScroll.mjs:1)。
- `s-up/down/left/right` 仍走原绑定；[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:557) 根据同方向持续 keydown/repeat 计算 held time。
- 图片预览容器使用旋转滚动条布局，方向 delta 保持反向适配。
- 方向切换、Shift 松开、预览关闭、滚动到边界时重置加速状态。

## 5. 风险
- 动态库体积增大；构建产物会拆出 PDF、Excel、Mammoth、AsciiDoctor 等独立 chunk。
- TXT 自动识别采用保守策略，可能漏识别弱格式文档；优先避免普通文本被误渲染。
- SheetJS `xlsx` 因 npm audit 高危且无 npm patched version，未采用；`.xls/.ods` v1 降级。
- uTools 外壳内真实文件读取依赖 preload `statSync/readFileSync`；浏览器 dev stub 只能验证空态和构建。
- uTools Sharp PDF 首屏依赖当前外壳内置能力；缺失、渲染失败或 PDF.js 后台初始化失败时保持结构化降级。
- `.doc`、`.ppt` 降级为不可富预览文件；PPTX/PPSX 为低保真文本预览，不能替代完整演示文稿查看器。
