import assert from 'node:assert/strict'
import {
  buildDeleteEventMeta,
  computeDeleteAnchorMeta,
} from './src/utils/deleteAnchor.mjs'
import { rewindLoadedCursorAfterDelete } from './src/utils/listRefresh.mjs'

const rows = Array.from({ length: 8 }, (_, index) => ({ id: `item-${index}` }))

{
  const selected = [rows[2], rows[3], rows[4]]
  const meta = computeDeleteAnchorMeta({
    showList: rows,
    activeIndex: 2,
    isMultiple: true,
    selectedItems: selected,
    itemsToDelete: selected,
    anchorItems: selected,
  })

  assert.deepEqual(meta.anchor, {
    anchorIndex: 4,
    preferItemId: 'item-5',
  })
  assert.deepEqual(meta.toKeep, [])
}

{
  const selected = [rows[4], rows[5], rows[6]]
  const meta = computeDeleteAnchorMeta({
    showList: rows,
    activeIndex: 4,
    isMultiple: true,
    selectedItems: selected,
    itemsToDelete: selected,
    anchorItems: selected,
  })

  assert.deepEqual(meta.anchor, {
    anchorIndex: 6,
    preferItemId: 'item-7',
  })
}

{
  const selected = [rows[5], rows[6], rows[7]]
  const meta = computeDeleteAnchorMeta({
    showList: rows,
    activeIndex: 5,
    isMultiple: true,
    selectedItems: selected,
    itemsToDelete: selected,
    anchorItems: selected,
  })

  assert.deepEqual(meta.anchor, {
    anchorIndex: 7,
    preferItemId: 'item-4',
  })
}

{
  const locked = { ...rows[6], locked: true }
  const mixedRows = [...rows]
  mixedRows[6] = locked
  const selected = [mixedRows[4], mixedRows[5], mixedRows[6]]
  const meta = computeDeleteAnchorMeta({
    showList: mixedRows,
    activeIndex: 4,
    isMultiple: true,
    selectedItems: selected,
    itemsToDelete: [mixedRows[4], mixedRows[5]],
    anchorItems: selected,
  })

  assert.deepEqual(meta.anchor, {
    anchorIndex: 6,
    preferItemId: 'item-6',
  })
  assert.deepEqual(meta.toKeep, [locked])
}

{
  const pagedRows = Array.from({ length: 60 }, (_, index) => ({ id: `paged-${index}` }))
  const selected = [pagedRows[32], pagedRows[33], pagedRows[34]]
  const meta = computeDeleteAnchorMeta({
    showList: pagedRows,
    activeIndex: 32,
    isMultiple: true,
    selectedItems: selected,
    itemsToDelete: selected,
    anchorItems: selected,
  })
  const eventMeta = buildDeleteEventMeta({
    activeIndex: 32,
    anchor: meta.anchor,
    force: false,
  })

  assert.deepEqual(meta.anchor, {
    anchorIndex: 34,
    preferItemId: 'paged-35',
  })
  assert.deepEqual(eventMeta, {
    anchorIndex: 32,
    preferItemId: 'paged-35',
    force: false,
  })
}

assert.strictEqual(rewindLoadedCursorAfterDelete(45, 3), 42)
assert.strictEqual(rewindLoadedCursorAfterDelete(2, 5), 0)
assert.strictEqual(rewindLoadedCursorAfterDelete(null, 3), null)

console.log('delete anchor tests passed')
