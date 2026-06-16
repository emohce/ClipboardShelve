export const FILE_PREVIEW_LIMITS = {
  text: 5 * 1024 * 1024,
  markdown: 5 * 1024 * 1024,
  asciidoc: 5 * 1024 * 1024,
  csv: 5 * 1024 * 1024,
  spreadsheet: 20 * 1024 * 1024,
  word: 20 * 1024 * 1024,
  pdf: 50 * 1024 * 1024,
  image: 50 * 1024 * 1024,
  unsupported: 0
}

export const TABLE_PREVIEW_MAX_ROWS = 100
export const TABLE_PREVIEW_MAX_COLS = 30

const EXTENSION_KIND_MAP = new Map([
  ['pdf', 'pdf'],
  ['md', 'markdown'],
  ['markdown', 'markdown'],
  ['mdown', 'markdown'],
  ['ad', 'asciidoc'],
  ['adoc', 'asciidoc'],
  ['asc', 'asciidoc'],
  ['asciidoc', 'asciidoc'],
  ['csv', 'csv'],
  ['xlsx', 'spreadsheet'],
  ['xlsm', 'spreadsheet'],
  ['docx', 'word'],
  ['txt', 'text'],
  ['log', 'text'],
  ['json', 'text'],
  ['xml', 'text'],
  ['yaml', 'text'],
  ['yml', 'text'],
  ['ini', 'text'],
  ['conf', 'text'],
  ['jpg', 'image'],
  ['jpeg', 'image'],
  ['png', 'image'],
  ['gif', 'image'],
  ['bmp', 'image'],
  ['webp', 'image'],
  ['svg', 'image'],
  ['ico', 'image'],
  ['heic', 'image']
])

export function getFileNameFromPath(path = '') {
  const value = String(path || '')
  return value.split(/[/\\]/).filter(Boolean).pop() || value || '文件'
}

export function getFileExtension(path = '') {
  const name = getFileNameFromPath(path)
  const dotIndex = name.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === name.length - 1) return ''
  return name.slice(dotIndex + 1).toLowerCase()
}

export function classifyFilePreview(path = '') {
  const ext = getFileExtension(path)
  return EXTENSION_KIND_MAP.get(ext) || 'unsupported'
}

export function normalizePreviewFile(file = {}) {
  const path = typeof file?.path === 'string' ? file.path : ''
  if (!path) return null
  return {
    path,
    name: file.name || getFileNameFromPath(path)
  }
}

export function parseFileItemData(data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizePreviewFile).filter(Boolean)
  } catch (_) {
    return []
  }
}

export function getPreviewableFile(files = []) {
  for (const file of files || []) {
    const normalized = normalizePreviewFile(file)
    if (!normalized) continue
    const kind = classifyFilePreview(normalized.path)
    if (kind === 'unsupported') continue
    return {
      ...normalized,
      kind
    }
  }
  return null
}

export function getFileSizeLimit(kind = 'unsupported') {
  return FILE_PREVIEW_LIMITS[kind] ?? FILE_PREVIEW_LIMITS.unsupported
}

export function getFileSizeState(byteLength, kind = 'unsupported') {
  const size = Math.max(0, Number(byteLength) || 0)
  const limit = getFileSizeLimit(kind)
  return {
    ok: limit > 0 && size <= limit,
    size,
    limit,
    kind
  }
}

export function sliceTablePreview(rows = [], options = {}) {
  const maxRows = Math.max(1, Number(options.maxRows) || TABLE_PREVIEW_MAX_ROWS)
  const maxCols = Math.max(1, Number(options.maxCols) || TABLE_PREVIEW_MAX_COLS)
  const sourceRows = Array.isArray(rows) ? rows : []
  let truncatedCols = false
  const previewRows = sourceRows.slice(0, maxRows).map((row) => {
    const cells = Array.isArray(row) ? row : [row]
    if (cells.length > maxCols) truncatedCols = true
    return cells.slice(0, maxCols).map((cell) => (cell == null ? '' : String(cell)))
  })
  return {
    rows: previewRows,
    truncatedRows: sourceRows.length > maxRows,
    truncatedCols,
    totalRows: sourceRows.length,
    maxRows,
    maxCols
  }
}

export function sanitizePreviewHtml(html = '', sanitizer = null) {
  const source = String(html || '')
  if (typeof sanitizer === 'function') return sanitizer(source)
  return source
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '')
    .replace(/\s+(href|src)\s*=\s*javascript:[^\s>]*/gi, '')
}
