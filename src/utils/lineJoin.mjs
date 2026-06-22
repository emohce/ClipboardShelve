export const LINE_JOIN_DEFAULT_SEPARATOR = ','

export function normalizeLineJoinSeparator(value) {
  if (value == null) return LINE_JOIN_DEFAULT_SEPARATOR
  const normalized = String(value).replace(/[\r\n]+/g, '')
  return normalized === '' ? LINE_JOIN_DEFAULT_SEPARATOR : normalized
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
