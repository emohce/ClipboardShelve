const assert = require('assert')

async function main() {
  const {
    buildSearchIndex,
    queryClipboardItems,
    normalizeQueryCursor
  } = await import('./src/storage/searchIndex.js')

  const items = [
    {
      id: 'text-1',
      type: 'text',
      data: 'Alpha project note',
      updateTime: 500,
      tags: ['work'],
      alias: 'Pinned note',
      locked: false
    },
    {
      id: 'image-1',
      type: 'image',
      data: 'data:image/png;base64,ALPHA_SHOULD_NOT_MATCH_BODY',
      updateTime: 400,
      tags: ['photo'],
      alias: 'diagram',
      locked: false
    },
    {
      id: 'file-1',
      type: 'file',
      data: JSON.stringify([{ path: '/tmp/report-final.pdf' }]),
      updateTime: 300,
      tags: [],
      locked: true
    },
    {
      id: 'collect-1',
      type: 'text',
      data: 'Collected snippet',
      updateTime: 200,
      collectTime: 900,
      tags: ['star'],
      remark: 'Reusable',
      locked: false
    }
  ]

  const collectIds = new Set(['collect-1'])
  const aliasMap = {
    'file-1': 'Final report'
  }

  assert.strictEqual(normalizeQueryCursor(undefined), 0)
  assert.strictEqual(normalizeQueryCursor('4'), 4)
  assert.strictEqual(normalizeQueryCursor(-10), 0)

  const textIndex = buildSearchIndex(items[0], aliasMap)
  assert.ok(textIndex.includes('alpha project note'))
  assert.ok(textIndex.includes('pinned note'))
  assert.ok(textIndex.includes('work'))

  const imageIndex = buildSearchIndex(items[1], aliasMap)
  assert.ok(imageIndex.includes('diagram'))
  assert.ok(!imageIndex.includes('alpha_should_not_match_body'))

  const fileIndex = buildSearchIndex(items[2], aliasMap)
  assert.ok(fileIndex.includes('final report'))
  assert.ok(fileIndex.includes('report-final.pdf'))

  const firstPage = queryClipboardItems({
    items,
    collectItems: [items[3]],
    collectIds,
    aliasMap,
    tab: 'all',
    keyword: '',
    lockFilter: 'all',
    cursor: 0,
    limit: 2
  })
  assert.deepStrictEqual(firstPage.items.map((item) => item.id), ['text-1', 'image-1'])
  assert.strictEqual(firstPage.nextCursor, 2)
  assert.strictEqual(firstPage.total, 3)

  const lockedOnly = queryClipboardItems({
    items,
    collectItems: [items[3]],
    collectIds,
    aliasMap,
    tab: 'all',
    keyword: '',
    lockFilter: 'locked',
    cursor: 0,
    limit: 10
  })
  assert.deepStrictEqual(lockedOnly.items.map((item) => item.id), ['file-1'])

  const imageBodySearch = queryClipboardItems({
    items,
    collectItems: [items[3]],
    collectIds,
    aliasMap,
    tab: 'all',
    keyword: 'ALPHA_SHOULD_NOT_MATCH_BODY',
    lockFilter: 'all',
    cursor: 0,
    limit: 10
  })
  assert.deepStrictEqual(imageBodySearch.items.map((item) => item.id), [])

  const collectSearch = queryClipboardItems({
    items,
    collectItems: [items[3]],
    collectIds,
    aliasMap,
    tab: 'collect',
    collectTag: 'star',
    keyword: 'reusable',
    lockFilter: 'all',
    cursor: 0,
    limit: 10
  })
  assert.deepStrictEqual(collectSearch.items.map((item) => item.id), ['collect-1'])

  console.log('storage query tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
