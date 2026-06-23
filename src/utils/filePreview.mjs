export const FILE_PREVIEW_LIMITS = {
  text: 5 * 1024 * 1024,
  'structured-json': 5 * 1024 * 1024,
  'structured-yaml': 5 * 1024 * 1024,
  markdown: 5 * 1024 * 1024,
  asciidoc: 5 * 1024 * 1024,
  csv: 5 * 1024 * 1024,
  spreadsheet: 20 * 1024 * 1024,
  word: 20 * 1024 * 1024,
  presentation: 30 * 1024 * 1024,
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
  ['pptx', 'presentation'],
  ['ppsx', 'presentation'],
  ['txt', 'text'],
  ['log', 'text'],
  ['json', 'structured-json'],
  ['jsonc', 'structured-json'],
  ['xml', 'text'],
  ['yaml', 'structured-yaml'],
  ['yml', 'structured-yaml'],
  ['ini', 'text'],
  ['conf', 'text'],
  ['cfg', 'text'],
  ['config', 'text'],
  ['cnf', 'text'],
  ['toml', 'text'],
  ['properties', 'text'],
  ['props', 'text'],
  ['env', 'text'],
  ['dotenv', 'text'],
  ['rc', 'text'],
  ['service', 'text'],
  ['timer', 'text'],
  ['socket', 'text'],
  ['mount', 'text'],
  ['target', 'text'],
  ['path', 'text'],
  ['rules', 'text'],
  ['list', 'text'],
  ['desktop', 'text'],
  ['reg', 'text'],
  ['hcl', 'text'],
  ['tf', 'text'],
  ['tfvars', 'text'],
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

const CONFIG_TEXT_EXTENSIONS = new Set([
  'conf',
  'cfg',
  'config',
  'cnf',
  'ini',
  'toml',
  'properties',
  'props',
  'env',
  'dotenv',
  'rc',
  'service',
  'timer',
  'socket',
  'mount',
  'target',
  'path',
  'rules',
  'list',
  'desktop',
  'reg',
  'hcl',
  'tf',
  'tfvars'
])

const CONFIG_TEXT_FILE_NAMES = new Set([
  '.npmrc',
  '.yarnrc',
  '.pnpmrc',
  '.editorconfig',
  '.gitignore',
  '.gitattributes',
  '.gitconfig',
  '.dockerignore',
  '.prettierrc',
  '.eslintrc',
  '.babelrc',
  '.browserslistrc'
])

function isConfigTextFileName(path = '') {
  const name = getFileNameFromPath(path).toLowerCase()
  return CONFIG_TEXT_FILE_NAMES.has(name) || /^\.env(?:\.|$)/.test(name)
}

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
  if (isConfigTextFileName(path)) return 'text'
  if (!ext) return 'text'
  return EXTENSION_KIND_MAP.get(ext) || 'unsupported'
}

export function stripJsonComments(source = '') {
  const text = String(source || '')
  let result = ''
  let inString = false
  let quote = ''
  let escaped = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]
    if (inString) {
      result += char
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        inString = false
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      inString = true
      quote = char
      result += char
      continue
    }
    if (char === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') index += 1
      result += '\n'
      continue
    }
    if (char === '/' && next === '*') {
      index += 2
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        result += text[index] === '\n' ? '\n' : ' '
        index += 1
      }
      index += 1
      continue
    }
    result += char
  }
  return result
}

export function normalizeJsonLikeText(source = '') {
  return stripJsonComments(source).replace(/,\s*([}\]])/g, '$1')
}

function parseJsonLike(source = '') {
  const text = String(source || '').trim()
  const normalizedText = normalizeJsonLikeText(text).trim()
  if (!/^[{[]/.test(text) && !/^[{[]/.test(normalizedText)) return null
  try {
    return JSON.parse(text)
  } catch (_) {
    try {
      return JSON.parse(normalizedText)
    } catch (_) {
      return null
    }
  }
}

function isStructuredValue(value) {
  return value != null && typeof value === 'object'
}

function getSignificantLines(text = '', limit = 80) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim())
    .slice(0, limit)
}

function countDelimiterOutsideQuotes(line = '', delimiter = ',') {
  let count = 0
  let quote = ''
  let escaped = false
  for (const char of String(line || '')) {
    if (quote) {
      if (escaped) {
        escaped = false
      } else if (char === '\\') {
        escaped = true
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === delimiter) count += 1
  }
  return count
}

function detectCsvLike(text = '') {
  const lines = getSignificantLines(text, 30)
  if (lines.length < 3) return null
  for (const delimiter of ['\t', ',', ';']) {
    const counts = lines.map((line) => countDelimiterOutsideQuotes(line, delimiter))
    const stableCount = counts[0]
    if (stableCount < 1) continue
    const matchingRows = counts.filter((count) => count === stableCount).length
    if (matchingRows >= Math.min(lines.length, 5) && counts.slice(0, 3).every((count) => count === stableCount)) {
      return { kind: 'csv', confidence: 0.86, reason: `stable-${delimiter === '\t' ? 'tab' : delimiter}-columns` }
    }
  }
  return null
}

function detectYamlLike(text = '') {
  const lines = getSignificantLines(text, 80)
  if (lines.length < 2) return null
  const keyValueCount = lines.filter((line) => /^\s*[A-Za-z0-9_.-][\w.-]*:\s*(?:\S.*)?$/.test(line)).length
  const listItemCount = lines.filter((line) => /^\s+-\s+\S/.test(line)).length
  const nestedKeyCount = lines.filter((line) => /^\s{2,}[A-Za-z0-9_.-][\w.-]*:\s*(?:\S.*)?$/.test(line)).length
  const documentMarkerCount = lines.filter((line) => /^\s*(---|\.\.\.)\s*$/.test(line)).length
  if (keyValueCount >= 2 && (listItemCount > 0 || nestedKeyCount > 0 || documentMarkerCount > 0)) {
    return { kind: 'structured-yaml', confidence: 0.82, reason: 'yaml-key-tree' }
  }
  return null
}

function detectAsciiDocLike(text = '') {
  const lines = getSignificantLines(text, 80)
  let score = 0
  if (lines.some((line) => /^\s*[-*+]\s+\[[ xX*]\]\s+\S/.test(line))) score += 3
  if (lines.slice(0, 5).some((line) => /^=\s+\S/.test(line))) score += 2
  if (lines.some((line) => /^==+\s+\S/.test(line))) score += 1
  if (lines.some((line) => /^:[A-Za-z0-9_-]+:\s*/.test(line))) score += 1
  if (lines.some((line) => /^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\s+\S/.test(line))) score += 1
  if (lines.some((line) => /^\[source(?:,[^\]]+)?\]\s*$/.test(line))) score += 1
  if (lines.some((line) => /^(----|====|\*\*\*\*)\s*$/.test(line))) score += 1
  if (score >= 3) return { kind: 'asciidoc', confidence: 0.78, reason: 'asciidoc-markers' }
  return null
}

function detectMarkdownLike(text = '') {
  const lines = getSignificantLines(text, 80)
  let score = 0
  const hashHeadingCount = lines.filter((line) => /^#{1,6}\s+\S/.test(line)).length
  const unorderedListCount = lines.filter((line) => /^\s*[-*+]\s+\S/.test(line)).length
  const orderedListCount = lines.filter((line) => /^\s*\d+\.\s+\S/.test(line)).length
  const outlineHeadingCount = lines.filter((line) => /^\s*\d+(?:\.\d+)+\.?\s+\S/.test(line)).length
  const indentedListCount = lines.filter((line) => /^\s{2,}[-*+]\s+\S/.test(line)).length
  if (lines.some((line) => /^(```|~~~)/.test(line))) score += 2
  if (lines.some((line) => /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line))) score += 2
  if (hashHeadingCount > 0) score += 1
  if (unorderedListCount + orderedListCount >= 2) score += 1
  if (outlineHeadingCount >= 2 && unorderedListCount + indentedListCount >= 2) score += 2
  if (outlineHeadingCount >= 4) score += 1
  if (/\[[^\]\n]+\]\([^)]+\)/.test(text)) score += 1
  if (lines.filter((line) => /^>\s+\S/.test(line)).length >= 2) score += 1
  if (lines.filter((line) => /^\s*[-*+]\s+\[[ xX]\]\s+\S/.test(line)).length >= 2) score += 1
  if (score >= 2) return { kind: 'markdown', confidence: 0.72, reason: 'markdown-markers' }
  return null
}

export function detectTextDocumentKind(text = '', options = {}) {
  const source = String(text || '')
  const ext = getFileExtension(options.path || '')
  const canAutoDetect = !ext || ext === 'txt' || CONFIG_TEXT_EXTENSIONS.has(ext) || isConfigTextFileName(options.path)
  if (!canAutoDetect) return { kind: 'text', confidence: 0, reason: 'extension-not-auto-detected' }
  const jsonValue = parseJsonLike(source)
  if (isStructuredValue(jsonValue)) {
    return { kind: 'structured-json', confidence: 0.95, reason: 'json-object-or-array' }
  }
  return (
    detectYamlLike(source) ||
    detectCsvLike(source) ||
    detectAsciiDocLike(source) ||
    detectMarkdownLike(source) ||
    { kind: 'text', confidence: 0, reason: 'no-document-markers' }
  )
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
