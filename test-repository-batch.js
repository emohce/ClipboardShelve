const assert = require('assert')

global.utools = {
  dbStorage: {
    getItem: () => ({})
  }
}

async function main() {
  const { createClipboardRepository } = await import('./src/storage/clipboardRepository.js')

  const legacyDb = {
    dataBase: {
      data: [
        { id: 'a', type: 'text', data: 'a', locked: false },
        { id: 'b', type: 'text', data: 'b', locked: false },
        { id: 'c', type: 'text', data: 'c', locked: true }
      ],
      collects: [],
      collectData: [],
      tags: [],
      tagUsage: {}
    },
    getCollects() {
      return this.dataBase.collectData
    },
    removeItemsViaIds(ids) {
      this.removeItemsCalls = (this.removeItemsCalls || 0) + 1
      const idSet = new Set(ids)
      const before = this.dataBase.data.length
      this.dataBase.data = this.dataBase.data.filter((item) => !idSet.has(item.id))
      return { removed: before - this.dataBase.data.length, skippedLocked: 0, skippedCollected: 0, missing: 0 }
    },
    setLocks(ids, locked) {
      this.setLocksCalls = (this.setLocksCalls || 0) + 1
      const idSet = new Set(ids)
      this.dataBase.data.forEach((item) => {
        if (idSet.has(item.id)) item.locked = locked
      })
      return true
    }
  }

  const repo = createClipboardRepository(legacyDb)
  const removeResult = repo.removeItems(['a', 'b'], { force: false })
  assert.strictEqual(removeResult.removed, 2)
  assert.strictEqual(legacyDb.removeItemsCalls, 1)
  assert.deepStrictEqual(legacyDb.dataBase.data.map((item) => item.id), ['c'])

  const locked = repo.setLocks(['c'], false)
  assert.strictEqual(locked, true)
  assert.strictEqual(legacyDb.setLocksCalls, 1)
  assert.strictEqual(legacyDb.dataBase.data[0].locked, false)

  console.log('repository batch tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
