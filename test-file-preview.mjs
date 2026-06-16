import assert from 'node:assert/strict'

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

testClassifiesCommonPreviewTypes()
testParsesClipboardFileDataSafely()
testSelectsFirstPreviewableFile()
testSizeLimitsByKind()
testSanitizesPreviewHtmlFallback()
testSlicesTablePreview()

console.log('file preview tests passed')
