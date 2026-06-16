# Plan: 常见文件富预览

Tool: codex

## 1. 实施方案
- 新增纯函数工具，先覆盖文件分类、大小阈值、HTML 清洗兜底、表格抽样和滚动加速。
- 新增 [../../../src/cpns/FileRichPreview.vue](../../../src/cpns/FileRichPreview.vue:1)，集中处理读取、解析、状态、滚动容器和 PDF 按需加载。
- 在 [../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1120) 的 `file` 分支选择第一个可预览文件；图片保留旧预览，其他文件进入富预览。
- 在 [../../../src/cpns/ClipFullData.vue](../../../src/cpns/ClipFullData.vue:22) 保留 `FileList`，上方增加富预览。
- 保留旧 command id，仅把文案和处理器语义统一为“预览滚动”。

## 2. 依赖策略
- 直接依赖：`pdfjs-dist`、`markdown-it`、`dompurify`、`@asciidoctor/core`、`read-excel-file`、`papaparse`、`mammoth`。
- 组件内部使用 `import()` 动态加载，避免主流程同步加载解析器。
- PDF worker 使用 Vite `new URL(..., import.meta.url)` 产物路径。

## 3. 安全与性能
- 默认阈值在 [../../../src/utils/filePreview.mjs](../../../src/utils/filePreview.mjs:1)：文本/MD/AD/CSV 5MB，Office 20MB，PDF/图片 50MB。
- HTML 预览统一走 DOMPurify；DOMPurify 不可用时使用兜底清洗。
- CSV/Excel xlsx/xlsm 只展示前 100 行、前 30 列。
- PDF 初始渲染 3 页，滚动接近底部时继续渲染后续页。

## 4. 滚动加速
- 步进计算在 [../../../src/utils/previewScroll.mjs](../../../src/utils/previewScroll.mjs:1)。
- `s-up/down/left/right` 仍走原绑定；[../../../src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:557) 根据同方向持续 keydown/repeat 计算 held time。
- 图片预览容器使用旋转滚动条布局，方向 delta 保持反向适配。
- 方向切换、Shift 松开、预览关闭、滚动到边界时重置加速状态。

## 5. 风险
- 动态库体积增大；构建产物会拆出 PDF、Excel、Mammoth、AsciiDoctor 等独立 chunk。
- SheetJS `xlsx` 因 npm audit 高危且无 npm patched version，未采用；`.xls/.ods` v1 降级。
- uTools 外壳内真实文件读取依赖 preload `statSync/readFileSync`；浏览器 dev stub 只能验证空态和构建。
- `.doc`、`.ppt/.pptx` 降级为不可富预览文件。
