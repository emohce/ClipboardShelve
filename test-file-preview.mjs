import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import packageJson from './package.json' with { type: 'json' }
import {
  FILE_PREVIEW_LIMITS,
  classifyFilePreview,
  getFileSizeState,
  getPreviewableFile,
  parseFileItemData,
  sanitizePreviewHtml,
  sliceTablePreview
} from './src/utils/filePreview.mjs'

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
  assert.equal(classifyFilePreview('/tmp/notes.json'), 'text')
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
testPdfPreviewUsesLegacyBuild()
testPdfPreviewUsesFastFirstPagePath()
testPreloadExposesSharpPdfFirstPageRenderer()
testPreloadExposesAsyncDocumentPreviewReaders()
testDocumentPreviewUsesAsyncReadAndCache()
testPresentationPreviewUsesLowFidelityPptxPath()
testPdfJsBundleAvoidsModernRuntimePrimitives()

console.log('file preview tests passed')
