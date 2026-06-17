import {
  detectTextDocumentKind,
  normalizeJsonLikeText,
  sanitizePreviewHtml,
  sliceTablePreview
} from './filePreview.mjs'

export const TEXT_DOCUMENT_PREVIEW_MAX_DEPTH = 6
export const TEXT_DOCUMENT_PREVIEW_MAX_NODES = 300
export const TEXT_DOCUMENT_PREVIEW_MAX_STRING_LENGTH = 300

const CSV_DELIMITERS = ['\t', ',', ';']

export function createEmptyTextDocumentPreview(text = '') {
  return {
    kind: 'text',
    detectedKind: 'text',
    text: String(text || ''),
    html: '',
    format: '',
    table: {
      rows: [],
      truncatedRows: false,
      truncatedCols: false,
      totalRows: 0,
      maxRows: 0,
      maxCols: 0
    },
    structured: {
      nodes: [],
      nodeCount: 0,
      truncated: false
    }
  }
}

function getSignificantTextLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ''))
    .filter((line) => line.trim())
}

function countDelimiterOutsideQuotes(line = '', delimiter = ',') {
  let count = 0
  let quote = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote) {
      if (char === quote) {
        if (line[index + 1] === quote) {
          index += 1
        } else {
          quote = ''
        }
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

function detectCsvDelimiter(text) {
  const lines = getSignificantTextLines(text).slice(0, 12)
  if (lines.length < 2) return ''
  for (const delimiter of CSV_DELIMITERS) {
    const counts = lines.map((line) => countDelimiterOutsideQuotes(line, delimiter))
    const stableCount = counts[0]
    if (stableCount < 1) continue
    if (counts.slice(0, Math.min(5, counts.length)).every((count) => count === stableCount)) {
      return delimiter
    }
  }
  return ''
}

function splitDelimitedTextLine(line = '', delimiter = ',') {
  const cells = []
  let cell = ''
  let quote = ''
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quote) {
      if (char === quote) {
        if (line[index + 1] === quote) {
          cell += quote
          index += 1
        } else {
          quote = ''
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      continue
    }
    if (char === delimiter) {
      cells.push(cell)
      cell = ''
      continue
    }
    cell += char
  }
  cells.push(cell)
  return cells.map((value) => value.trim())
}

export function buildCsvTextDocumentPreview(text = '') {
  const delimiter = detectCsvDelimiter(text)
  if (!delimiter) return createEmptyTextDocumentPreview(text)
  const rows = getSignificantTextLines(text).map((line) => splitDelimitedTextLine(line, delimiter))
  return {
    ...createEmptyTextDocumentPreview(text),
    kind: 'csv',
    detectedKind: 'csv',
    table: sliceTablePreview(rows)
  }
}

function getStructuredValueType(value) {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  return typeof value
}

function formatStructuredPrimitive(value, type) {
  if (type === 'string') {
    const text = String(value)
    const truncated = text.length > TEXT_DOCUMENT_PREVIEW_MAX_STRING_LENGTH
    return `"${truncated ? `${text.slice(0, TEXT_DOCUMENT_PREVIEW_MAX_STRING_LENGTH)}...` : text}"`
  }
  if (type === 'undefined') return 'undefined'
  return String(value)
}

function formatStructuredContainer(value, type) {
  if (type === 'array') return `Array(${value.length})`
  if (type === 'object') return `Object(${Object.keys(value || {}).length})`
  return ''
}

export function renderStructuredTextDocumentPreview(value, options = {}) {
  const nodes = []
  let truncated = false
  let nextId = 0
  const visit = (current, key = '', depth = 0) => {
    if (nodes.length >= TEXT_DOCUMENT_PREVIEW_MAX_NODES) {
      truncated = true
      return
    }
    const type = getStructuredValueType(current)
    const isContainer = type === 'array' || type === 'object'
    nodes.push({
      id: `text-structured-${nextId++}`,
      key,
      depth,
      type,
      isContainer,
      value: isContainer ? formatStructuredContainer(current, type) : formatStructuredPrimitive(current, type)
    })
    if (!isContainer) return
    if (depth >= TEXT_DOCUMENT_PREVIEW_MAX_DEPTH) {
      truncated = true
      return
    }
    const entries = type === 'array'
      ? current.map((entry, index) => [`[${index}]`, entry])
      : Object.entries(current || {})
    for (const [childKey, childValue] of entries) {
      visit(childValue, childKey, depth + 1)
      if (truncated && nodes.length >= TEXT_DOCUMENT_PREVIEW_MAX_NODES) return
    }
  }

  visit(value, '')
  return {
    ...createEmptyTextDocumentPreview(options.text || ''),
    kind: 'structured',
    detectedKind: options.detectedKind || 'structured-json',
    format: options.format || 'JSON',
    structured: {
      nodes,
      nodeCount: nodes.length,
      truncated
    }
  }
}

export function parseJsonPreviewText(text = '') {
  const source = String(text || '').trim()
  try {
    return JSON.parse(source)
  } catch (_) {
    return JSON.parse(normalizeJsonLikeText(source))
  }
}

async function buildMarkdownPreview(text = '', detectedKind = 'markdown') {
  const module = await import('markdown-it')
  const MarkdownIt = module.default || module
  const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true })
  return {
    ...createEmptyTextDocumentPreview(text),
    kind: 'html',
    detectedKind,
    html: await sanitizeHtml(markdown.render(text))
  }
}

async function buildAsciiDocPreview(text = '') {
  const module = await import('@asciidoctor/core')
  const Asciidoctor = module.default || module
  const asciidoctor = Asciidoctor()
  const html = asciidoctor.convert(text, {
    safe: 'safe',
    backend: 'html5',
    attributes: { showtitle: true }
  })
  return {
    ...createEmptyTextDocumentPreview(text),
    kind: 'html',
    detectedKind: 'asciidoc',
    html: await sanitizeHtml(html)
  }
}

async function sanitizeHtml(html) {
  try {
    const module = await import('dompurify')
    const DOMPurify = module.default || module
    return sanitizePreviewHtml(html, (source) =>
      DOMPurify.sanitize(source, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ['target', 'rel']
      })
    )
  } catch (_) {
    return sanitizePreviewHtml(html)
  }
}

export async function buildDetectedTextDocumentPreview(text = '', options = {}) {
  const source = String(text || '')
  const detected = options.kind
    ? { kind: options.kind, confidence: 1, reason: 'forced' }
    : detectTextDocumentKind(source, { path: options.path || '' })
  try {
    if (detected.kind === 'csv') return buildCsvTextDocumentPreview(source)
    if (detected.kind === 'structured-json') {
      const value = parseJsonPreviewText(source)
      if (value != null && typeof value === 'object') {
        return renderStructuredTextDocumentPreview(value, {
          text: source,
          format: 'JSON',
          detectedKind: 'structured-json'
        })
      }
    }
    if (detected.kind === 'structured-yaml') {
      const module = await import('yaml')
      const YAML = module.default || module
      const value = YAML.parse(source)
      if (value != null && typeof value === 'object') {
        return renderStructuredTextDocumentPreview(value, {
          text: source,
          format: 'YAML',
          detectedKind: 'structured-yaml'
        })
      }
    }
    if (detected.kind === 'markdown') return await buildMarkdownPreview(source)
    if (detected.kind === 'asciidoc') return await buildAsciiDocPreview(source)
  } catch (_) {
    return createEmptyTextDocumentPreview(source)
  }
  return createEmptyTextDocumentPreview(source)
}
