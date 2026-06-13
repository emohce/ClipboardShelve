const TOKEN_PATTERN = /\s*(!|&&|\|\||\(|\)|==|!=|true\b|false\b|'[^']*'|"[^"]*"|[A-Za-z_][A-Za-z0-9_.-]*)\s*/gy

function tokenize(input) {
  const source = String(input || '').trim()
  if (!source) return []
  const tokens = []
  let index = 0
  while (index < source.length) {
    TOKEN_PATTERN.lastIndex = index
    const match = TOKEN_PATTERN.exec(source)
    if (!match || match.index !== index) {
      throw new SyntaxError(`Unexpected token near "${source.slice(index)}"`)
    }
    tokens.push(match[1])
    index = TOKEN_PATTERN.lastIndex
  }
  return tokens
}

function createParser(tokens) {
  let index = 0

  function peek() {
    return tokens[index]
  }

  function consume(expected) {
    const token = tokens[index]
    if (expected && token !== expected) {
      throw new SyntaxError(`Expected "${expected}" but found "${token || 'end'}"`)
    }
    index += 1
    return token
  }

  function parsePrimary() {
    const token = peek()
    if (!token) throw new SyntaxError('Unexpected end of when expression')
    if (token === '(') {
      consume('(')
      const expr = parseOr()
      consume(')')
      return expr
    }
    if (token === 'true' || token === 'false') {
      consume()
      return { type: 'literal', value: token === 'true' }
    }
    if (token.startsWith("'") || token.startsWith('"')) {
      consume()
      return { type: 'literal', value: token.slice(1, -1) }
    }
    if (/^[A-Za-z_]/.test(token)) {
      consume()
      return { type: 'identifier', name: token }
    }
    throw new SyntaxError(`Unexpected token "${token}"`)
  }

  function parseUnary() {
    if (peek() === '!') {
      consume('!')
      return { type: 'not', expr: parseUnary() }
    }
    return parsePrimary()
  }

  function parseCompare() {
    let left = parseUnary()
    while (peek() === '==' || peek() === '!=') {
      const op = consume()
      const right = parseUnary()
      left = { type: 'compare', op, left, right }
    }
    return left
  }

  function parseAnd() {
    let left = parseCompare()
    while (peek() === '&&') {
      consume('&&')
      left = { type: 'and', left, right: parseCompare() }
    }
    return left
  }

  function parseOr() {
    let left = parseAnd()
    while (peek() === '||') {
      consume('||')
      left = { type: 'or', left, right: parseAnd() }
    }
    return left
  }

  const ast = parseOr()
  if (index < tokens.length) throw new SyntaxError(`Unexpected token "${peek()}"`)
  return ast
}

export function parseWhenExpression(expression) {
  return createParser(tokenize(expression))
}

function valueOf(node, context) {
  switch (node.type) {
    case 'literal':
      return node.value
    case 'identifier':
      return context?.[node.name]
    case 'not':
      return !Boolean(valueOf(node.expr, context))
    case 'and':
      return Boolean(valueOf(node.left, context)) && Boolean(valueOf(node.right, context))
    case 'or':
      return Boolean(valueOf(node.left, context)) || Boolean(valueOf(node.right, context))
    case 'compare': {
      const left = valueOf(node.left, context)
      const right = valueOf(node.right, context)
      return node.op === '==' ? left === right : left !== right
    }
    default:
      return false
  }
}

export function evaluateWhenExpression(expression, context = {}) {
  if (!expression || !String(expression).trim()) return true
  return Boolean(valueOf(parseWhenExpression(expression), context))
}

function cloneSetPair(pair) {
  return {
    positive: new Set(pair.positive),
    negative: new Set(pair.negative)
  }
}

function mergeSetPairs(left, right) {
  const merged = cloneSetPair(left)
  right.positive.forEach((value) => merged.positive.add(value))
  right.negative.forEach((value) => merged.negative.add(value))
  return merged
}

function literalSetsForNode(node) {
  if (!node) return [{ positive: new Set(), negative: new Set() }]
  if (node.type === 'and') {
    const leftSets = literalSetsForNode(node.left)
    const rightSets = literalSetsForNode(node.right)
    return leftSets.flatMap((left) => rightSets.map((right) => mergeSetPairs(left, right)))
  }
  if (node.type === 'or') {
    return [...literalSetsForNode(node.left), ...literalSetsForNode(node.right)]
  }
  if (node.type === 'identifier') {
    return [{ positive: new Set([node.name]), negative: new Set() }]
  }
  if (node.type === 'not' && node.expr?.type === 'identifier') {
    return [{ positive: new Set(), negative: new Set([node.expr.name]) }]
  }
  return [{ positive: new Set(), negative: new Set() }]
}

export function getWhenLiteralSets(expression) {
  if (!expression || !String(expression).trim()) return [{ positive: new Set(), negative: new Set() }]
  return literalSetsForNode(parseWhenExpression(expression))
}
