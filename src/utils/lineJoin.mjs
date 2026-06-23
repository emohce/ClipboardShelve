export const LINE_JOIN_DEFAULT_SEPARATOR = ','
export const LINE_JOIN_DEFAULT_SURROUND = '"'

const SURROUND_OPEN_TO_CLOSE = {
  '{': '}',
  '[': ']',
  '(': ')',
  '<': '>'
}

const SURROUND_CLOSE_TO_OPEN = Object.entries(SURROUND_OPEN_TO_CLOSE).reduce((map, [open, close]) => {
  map[close] = open
  return map
}, {})

export function normalizeLineJoinSeparator(value) {
  if (value == null) return LINE_JOIN_DEFAULT_SEPARATOR
  const normalized = String(value).replace(/[\r\n]+/g, '')
  return normalized === '' ? LINE_JOIN_DEFAULT_SEPARATOR : normalized
}

export function normalizeLineJoinSurround(value) {
  if (value == null) return LINE_JOIN_DEFAULT_SURROUND
  const normalized = String(value).replace(/[\r\n]+/g, '').trim()
  return normalized === '' ? LINE_JOIN_DEFAULT_SURROUND : normalized.slice(0, 1)
}

export function resolveLineJoinSurroundPair(value) {
  const surround = normalizeLineJoinSurround(value)
  if (SURROUND_OPEN_TO_CLOSE[surround]) {
    return { open: surround, close: SURROUND_OPEN_TO_CLOSE[surround] }
  }
  if (SURROUND_CLOSE_TO_OPEN[surround]) {
    return { open: SURROUND_CLOSE_TO_OPEN[surround], close: surround }
  }
  return { open: surround, close: surround }
}

export function getJoinableTextLines(text) {
  return String(text ?? '')
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function canJoinTextLines(text) {
  return getJoinableTextLines(text).length >= 2
}

export function joinTextLines(text, separator = LINE_JOIN_DEFAULT_SEPARATOR) {
  const lines = getJoinableTextLines(text)
  if (lines.length < 2) return ''
  return lines.join(normalizeLineJoinSeparator(separator))
}

function getSurroundedTextLines(text, surround = LINE_JOIN_DEFAULT_SURROUND) {
  const lines = getJoinableTextLines(text)
  if (lines.length < 2) return []
  const pair = resolveLineJoinSurroundPair(surround)
  return lines.map((line) => `${pair.open}${line}${pair.close}`)
}

export function surroundTextLines(text, surround = LINE_JOIN_DEFAULT_SURROUND) {
  return getSurroundedTextLines(text, surround).join('\n')
}

export function joinTextLinesWithSurround(
  text,
  separator = LINE_JOIN_DEFAULT_SEPARATOR,
  surround = LINE_JOIN_DEFAULT_SURROUND
) {
  return getSurroundedTextLines(text, surround).join(normalizeLineJoinSeparator(separator))
}
