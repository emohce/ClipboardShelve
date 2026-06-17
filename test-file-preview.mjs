import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import packageJson from './package.json' with { type: 'json' }
import {
  FILE_PREVIEW_LIMITS,
  classifyFilePreview,
  detectTextDocumentKind,
  getFileSizeState,
  getPreviewableFile,
  parseFileItemData,
  sanitizePreviewHtml,
  sliceTablePreview
} from './src/utils/filePreview.mjs'
import {
  buildDetectedTextDocumentPreview,
  createEmptyTextDocumentPreview
} from './src/utils/textDocumentPreview.mjs'

function testClassifiesCommonPreviewTypes() {
  assert.equal(classifyFilePreview('/tmp/report.pdf'), 'pdf')
  assert.equal(classifyFilePreview('/tmp/readme.MD'), 'markdown')
  assert.equal(classifyFilePreview('/tmp/spec.adoc'), 'asciidoc')
  assert.equal(classifyFilePreview('/tmp/table.csv'), 'csv')
  assert.equal(classifyFilePreview('/tmp/book.xlsx'), 'spreadsheet')
  assert.equal(classifyFilePreview('/tmp/legacy.xls'), 'unsupported')
  assert.equal(classifyFilePreview('/tmp/doc.docx'), 'word')
  assert.equal(classifyFilePreview('/tmp/slides.pptx'), 'presentation')
  assert.equal(classifyFilePreview('/tmp/show.ppsx'), 'presentation')
  assert.equal(classifyFilePreview('/tmp/legacy.ppt'), 'unsupported')
  assert.equal(classifyFilePreview('/tmp/notes.json'), 'structured-json')
  assert.equal(classifyFilePreview('/tmp/notes.jsonc'), 'structured-json')
  assert.equal(classifyFilePreview('/tmp/config.yaml'), 'structured-yaml')
  assert.equal(classifyFilePreview('/tmp/config.yml'), 'structured-yaml')
  assert.equal(classifyFilePreview('/tmp/app.log'), 'text')
  assert.equal(classifyFilePreview('/tmp/README'), 'text')
  assert.equal(classifyFilePreview('/tmp/.env'), 'text')
  assert.equal(classifyFilePreview('/tmp/legacy.doc'), 'unsupported')
}

function testParsesClipboardFileDataSafely() {
  assert.deepEqual(parseFileItemData('not-json'), [])
  assert.deepEqual(parseFileItemData(JSON.stringify([{ path: '/tmp/a.md' }, { name: 'missing' }])), [
    { path: '/tmp/a.md', name: 'a.md' }
  ])
}

function testSelectsFirstPreviewableFile() {
  const files = [
    { path: '/tmp/archive.zip' },
    { path: '/tmp/readme.md' },
    { path: '/tmp/book.xlsx' }
  ]
  assert.deepEqual(getPreviewableFile(files), {
    path: '/tmp/readme.md',
    name: 'readme.md',
    kind: 'markdown'
  })
  assert.deepEqual(getPreviewableFile([{ path: '/tmp/config', name: 'config' }]), {
    path: '/tmp/config',
    name: 'config',
    kind: 'text'
  })
}

function testSizeLimitsByKind() {
  assert.equal(getFileSizeState(FILE_PREVIEW_LIMITS.text, 'text').ok, true)
  assert.equal(getFileSizeState(FILE_PREVIEW_LIMITS.text + 1, 'text').ok, false)
  assert.equal(getFileSizeState(FILE_PREVIEW_LIMITS.pdf + 1, 'pdf').limit, FILE_PREVIEW_LIMITS.pdf)
}

function testSanitizesPreviewHtmlFallback() {
  const html = '<h1>Hi</h1><script>alert(1)</script><a href="javascript:alert(1)" onclick="x()">x</a>'
  const safe = sanitizePreviewHtml(html)
  assert.equal(safe.includes('<script'), false)
  assert.equal(safe.includes('javascript:'), false)
  assert.equal(safe.includes('onclick='), false)
  assert.equal(safe.includes('<h1>Hi</h1>'), true)
}

function testSlicesTablePreview() {
  const rows = Array.from({ length: 150 }, (_, row) =>
    Array.from({ length: 40 }, (_, col) => `${row}:${col}`)
  )
  const preview = sliceTablePreview(rows)
  assert.equal(preview.rows.length, 100)
  assert.equal(preview.rows[0].length, 30)
  assert.equal(preview.truncatedRows, true)
  assert.equal(preview.truncatedCols, true)
}

function testDetectsTextDocumentKindsConservatively() {
  assert.equal(detectTextDocumentKind('{"name":"EzClipboard","items":[1,2]}').kind, 'structured-json')
  assert.equal(
    detectTextDocumentKind('// config\n{\n  "name": "EzClipboard",\n  "enabled": true,\n}').kind,
    'structured-json'
  )
  assert.equal(
    detectTextDocumentKind('title: EzClipboard\nitems:\n  - preview\n  - search\nenabled: true').kind,
    'structured-yaml'
  )
  assert.equal(detectTextDocumentKind('name,score\nalpha,1\nbeta,2').kind, 'csv')
  assert.equal(detectTextDocumentKind('= Title\n:toc:\n\n== Section\nNOTE: Done').kind, 'asciidoc')
  assert.equal(detectTextDocumentKind('# Title\n\n- one\n- two\n\n[site](https://example.com)').kind, 'markdown')
  assert.equal(detectTextDocumentKind('plain text without document structure').kind, 'text')
  assert.equal(detectTextDocumentKind('# Just one heading').kind, 'text')
  assert.equal(detectTextDocumentKind('hello: world').kind, 'text')
  assert.equal(detectTextDocumentKind('one, two, maybe').kind, 'text')
  assert.equal(detectTextDocumentKind('- just\n- scalar\n- list').kind, 'text')
}

function testDetectsNumberedOutlineAsMarkdown() {
  const outline = [
    '1.  全局-操作/UI说明',
    '1.1 开发目标',
    '  - 实现一个支持全键盘操作, 支持VIM模式的 TODO 助手',
    '  - 功能有严格模块设计, 要进行组件优先设计',
    '1.4 全局交互思想',
    '1.4.1 通用交互思维',
    '  - 00-base-mind : 底层固定交互逻辑',
    '    - Esc推出',
    '      - 推出当前 层|弹窗|遮罩 或 某些状态',
    '3. UI 架构设计 - 抽象UI组件 -- 快速复用',
    '3.1 核心底座: VIM模式',
    '  - 所有的操作如交互点击, 删除, 上下移动等页面触发的行为'
  ].join('\n')
  assert.equal(detectTextDocumentKind(outline).kind, 'markdown')
}

function testDetectsChecklistLineAsAsciiDoc() {
  const checklist = '- [ ] 多 file root 未展开：↓ 跳到下一 root, 然后可正常左右键折叠展开, 可正常上下跳转, 不要混用上下和左右的功能'
  assert.equal(detectTextDocumentKind(checklist).kind, 'asciidoc')
}

function testPdfPreviewUsesLegacyBuild() {
  const source = readFileSync(new URL('./src/cpns/FileRichPreview.vue', import.meta.url), 'utf8')
  assert.equal(packageJson.dependencies['pdfjs-dist'], '2.6.347')
  assert.match(source, /pdfjs-dist\/es5\/build\/pdf\.js/)
  assert.match(source, /pdfjs-dist\/es5\/build\/pdf\.worker\.js/)
  assert.match(source, /isEvalSupported:\s*false/)
  assert.doesNotMatch(source, /pdfjs-dist\/legacy\/build\/pdf\.js/)
  assert.doesNotMatch(source, /pdfjs-dist\/legacy\/build\/pdf\.worker\.js/)
  assert.doesNotMatch(source, /pdfjs-dist\/build\/pdf\.mjs/)
  assert.doesNotMatch(source, /pdfjs-dist\/build\/pdf\.worker\.mjs/)
}

function testPdfPreviewUsesFastFirstPagePath() {
  const source = readFileSync(new URL('./src/cpns/FileRichPreview.vue', import.meta.url), 'utf8')
  assert.match(source, /PDF_INITIAL_PAGE_COUNT\s*=\s*1/)
  assert.match(source, /PDF_NEXT_PAGE_COUNT\s*=\s*1/)
  assert.match(source, /renderPdfFirstPagePreview/)
  assert.match(source, /tryLoadPdfSharpFirstPage/)
  assert.match(source, /backend:\s*['"]utools-sharp['"]/)
  assert.match(source, /fallbackReason/)
  assert.match(source, /canvas\.toBlob/)
  assert.match(source, /URL\.createObjectURL/)
  assert.match(source, /URL\.revokeObjectURL/)
  assert.match(source, /requestIdleCallback/)
  assert.doesNotMatch(source, /toDataURL\('image\/png'\)/)
  assert.doesNotMatch(source, /renderNextPdfPages\(3/)
}

function testPreloadExposesSharpPdfFirstPageRenderer() {
  const source = readFileSync(new URL('./scripts/utools-runtime-assets.mjs', import.meta.url), 'utf8')
  assert.match(source, /async function renderPdfFirstPagePreview/)
  assert.match(source, /utools\.sharp/)
  assert.match(source, /density/)
  assert.match(source, /page:\s*0/)
  assert.match(source, /pages:\s*1/)
  assert.match(source, /backend:\s*'utools-sharp'/)
  assert.match(source, /data:image\/png;base64/)
  assert.match(source, /window\.exports\s*=\s*{[\s\S]*renderPdfFirstPagePreview/)
}

function testPreloadExposesAsyncDocumentPreviewReaders() {
  const source = readFileSync(new URL('./scripts/utools-runtime-assets.mjs', import.meta.url), 'utf8')
  assert.match(source, /async function readTextPreviewFile/)
  assert.match(source, /async function readBinaryPreviewFile/)
  assert.match(source, /fsPromises\.open/)
  assert.match(source, /fsPromises\.readFile/)
  assert.match(source, /maxBytes/)
  assert.match(source, /truncated/)
  assert.match(source, /window\.exports\s*=\s*{[\s\S]*readTextPreviewFile[\s\S]*readBinaryPreviewFile/)
}

function testDocumentPreviewUsesAsyncReadAndCache() {
  const source = readFileSync(new URL('./src/cpns/FileRichPreview.vue', import.meta.url), 'utf8')
  assert.match(source, /DOCUMENT_PREVIEW_CACHE_LIMIT/)
  assert.match(source, /getCachedDocumentPreview/)
  assert.match(source, /setCachedDocumentPreview/)
  assert.match(source, /readTextPreviewFile/)
  assert.match(source, /readBinaryPreviewFile/)
  assert.match(source, /readTextFilePreview/)
  assert.match(source, /readBinaryFilePreview/)
}

function testStructuredDocumentPreviewPathExists() {
  const source = readFileSync(new URL('./src/cpns/FileRichPreview.vue', import.meta.url), 'utf8')
  const utilitySource = readFileSync(new URL('./src/utils/textDocumentPreview.mjs', import.meta.url), 'utf8')
  assert.match(source, /preview\.type === 'structured'/)
  assert.match(source, /loadStructuredJson/)
  assert.match(source, /loadStructuredYaml/)
  assert.match(source, /renderStructuredTextDocumentPreview/)
  assert.match(source, /createStructuredFilePreview/)
  assert.match(source, /detectedKind/)
  assert.match(utilitySource, /TEXT_DOCUMENT_PREVIEW_MAX_DEPTH\s*=\s*6/)
  assert.match(utilitySource, /TEXT_DOCUMENT_PREVIEW_MAX_NODES\s*=\s*300/)
  assert.match(utilitySource, /TEXT_DOCUMENT_PREVIEW_MAX_STRING_LENGTH\s*=\s*300/)
  assert.match(source, /import\('yaml'\)/)
  assert.match(source, /file-rich-preview__structured/)
}

function testPlainTextPreviewCanRenderDetectedCsv() {
  const source = readFileSync(new URL('./src/cpns/ClipItemList.vue', import.meta.url), 'utf8')
  assert.match(source, /buildDetectedTextDocumentPreview/)
  assert.match(source, /textPreview\.value\.preview/)
  assert.match(source, /text-preview-table/)
  assert.match(source, /textPreview\.preview\.kind === ['"]csv['"]/)
  assert.match(source, /textPreview\.preview\.kind === ['"]structured['"]/)
  assert.match(source, /textPreview\.preview\.kind === ['"]html['"]/)
}

async function testBuildsDetectedTextDocumentPreviews() {
  const empty = createEmptyTextDocumentPreview()
  assert.equal(empty.kind, 'text')
  assert.equal(empty.table.rows.length, 0)

  const csv = await buildDetectedTextDocumentPreview('id,name\n1,alpha\n2,beta')
  assert.equal(csv.kind, 'csv')
  assert.deepEqual(csv.table.rows[0], ['id', 'name'])
  assert.deepEqual(csv.table.rows[1], ['1', 'alpha'])

  const json = await buildDetectedTextDocumentPreview('{"name":"EzClipboard","items":[1,2]}')
  assert.equal(json.kind, 'structured')
  assert.equal(json.format, 'JSON')
  assert.equal(json.detectedKind, 'structured-json')
  assert.ok(json.structured.nodes.some((node) => node.key === 'name'))

  const yaml = await buildDetectedTextDocumentPreview('title: EzClipboard\nitems:\n  - preview\n  - search\nenabled: true')
  assert.equal(yaml.kind, 'structured')
  assert.equal(yaml.format, 'YAML')
  assert.equal(yaml.detectedKind, 'structured-yaml')

  const markdown = await buildDetectedTextDocumentPreview('# Title\n\n- one\n- two')
  assert.equal(markdown.kind, 'html')
  assert.equal(markdown.detectedKind, 'markdown')
  assert.match(markdown.html, /<h1>Title<\/h1>/)

  const outline = await buildDetectedTextDocumentPreview([
    '1.  全局-操作/UI说明',
    '1.1 开发目标',
    '  - 实现一个支持全键盘操作, 支持VIM模式的 TODO 助手',
    '  - 功能有严格模块设计, 要进行组件优先设计',
    '1.4 全局交互思想',
    '  - 00-base-mind : 底层固定交互逻辑',
    '    - Esc推出'
  ].join('\n'))
  assert.equal(outline.kind, 'html')
  assert.equal(outline.detectedKind, 'markdown')

  const checklist = await buildDetectedTextDocumentPreview(
    '- [ ] 多 file root 未展开：↓ 跳到下一 root, 然后可正常左右键折叠展开, 可正常上下跳转, 不要混用上下和左右的功能'
  )
  assert.equal(checklist.kind, 'html')
  assert.equal(checklist.detectedKind, 'asciidoc')
}

function testPresentationPreviewUsesLowFidelityPptxPath() {
  const source = readFileSync(new URL('./src/cpns/FileRichPreview.vue', import.meta.url), 'utf8')
  assert.equal(packageJson.dependencies.jszip, '3.10.1')
  assert.match(source, /loadPresentation/)
  assert.match(source, /import\('jszip'\)/)
  assert.match(source, /ppt\\\/slides\\\/slide/)
  assert.match(source, /file-rich-preview__slides/)
  assert.match(source, /file-rich-preview__slide-text/)
}

function testPdfJsBundleAvoidsModernRuntimePrimitives() {
  const source = readFileSync(
    new URL('./node_modules/pdfjs-dist/es5/build/pdf.js', import.meta.url),
    'utf8'
  )
  const worker = readFileSync(
    new URL('./node_modules/pdfjs-dist/es5/build/pdf.worker.js', import.meta.url),
    'utf8'
  )
  const privateFieldSyntax = /(?:\n\s*(?:static\s+)?#[A-Za-z$][\w$]*(?:\s*[=({;]|;)|this\.#[A-Za-z$][\w$]*)/
  assert.doesNotMatch(source, /Promise\.withResolvers/)
  assert.doesNotMatch(worker, /Promise\.withResolvers/)
  assert.doesNotMatch(source, /attempted to get private field on non-instance/)
  assert.doesNotMatch(worker, /attempted to get private field on non-instance/)
  assert.doesNotMatch(source, /_classPrivate(?:Field|Method)/)
  assert.doesNotMatch(worker, /_classPrivate(?:Field|Method)/)
  assert.doesNotMatch(source, privateFieldSyntax)
  assert.doesNotMatch(worker, privateFieldSyntax)
}

testClassifiesCommonPreviewTypes()
testParsesClipboardFileDataSafely()
testSelectsFirstPreviewableFile()
testSizeLimitsByKind()
testSanitizesPreviewHtmlFallback()
testSlicesTablePreview()
testDetectsTextDocumentKindsConservatively()
testDetectsNumberedOutlineAsMarkdown()
testDetectsChecklistLineAsAsciiDoc()
testPdfPreviewUsesLegacyBuild()
testPdfPreviewUsesFastFirstPagePath()
testPreloadExposesSharpPdfFirstPageRenderer()
testPreloadExposesAsyncDocumentPreviewReaders()
testDocumentPreviewUsesAsyncReadAndCache()
testStructuredDocumentPreviewPathExists()
testPlainTextPreviewCanRenderDetectedCsv()
await testBuildsDetectedTextDocumentPreviews()
testPresentationPreviewUsesLowFidelityPptxPath()
testPdfJsBundleAvoidsModernRuntimePrimitives()

console.log('file preview tests passed')
