import { performance } from 'node:perf_hooks'
import { queryClipboardItems } from '../src/storage/searchIndex.js'

const SIZES = [1000, 10000, 50000]

const makeItem = (index) => {
  const type = index % 11 === 0 ? 'image' : index % 7 === 0 ? 'file' : 'text'
  const base = {
    id: `${type}-${index}`,
    type,
    updateTime: Date.now() - index,
    locked: index % 13 === 0,
    tags: index % 17 === 0 ? ['star', 'work'] : []
  }
  if (type === 'image') {
    return {
      ...base,
      data: `data:image/png;base64,${'x'.repeat(256)}`,
      alias: index % 5 === 0 ? `diagram ${index}` : ''
    }
  }
  if (type === 'file') {
    return {
      ...base,
      data: JSON.stringify([{ path: `/tmp/project/report-${index}.pdf` }])
    }
  }
  return {
    ...base,
    data: `clipboard text item ${index} alpha beta gamma`,
    remark: index % 19 === 0 ? 'reusable snippet' : ''
  }
}

const measure = (label, fn) => {
  const start = performance.now()
  const result = fn()
  const elapsed = performance.now() - start
  return {
    label,
    elapsedMs: Number(elapsed.toFixed(2)),
    total: result.total,
    page: result.items.length
  }
}

for (const size of SIZES) {
  const items = Array.from({ length: size }, (_, index) => makeItem(index))
  const collectItems = items.filter((_, index) => index % 23 === 0)
  const collectIds = new Set(collectItems.map((item) => item.id))
  const aliasMap = Object.fromEntries(items.slice(0, 200).map((item, index) => [item.id, `alias-${index}`]))

  const cases = [
    measure(`${size}: first page`, () =>
      queryClipboardItems({ items, collectItems, collectIds, aliasMap, tab: 'all', limit: 30 })
    ),
    measure(`${size}: keyword text`, () =>
      queryClipboardItems({ items, collectItems, collectIds, aliasMap, tab: 'all', keyword: 'alpha gamma', limit: 30 })
    ),
    measure(`${size}: file search`, () =>
      queryClipboardItems({ items, collectItems, collectIds, aliasMap, tab: 'file', keyword: 'report-14', limit: 30 })
    ),
    measure(`${size}: collect tag`, () =>
      queryClipboardItems({ items, collectItems, collectIds, aliasMap, tab: 'collect', collectTag: 'star', limit: 30 })
    )
  ]

  console.table(cases)
}
