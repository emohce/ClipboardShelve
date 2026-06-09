const assert = require('assert')

async function main() {
  const events = []
  const store = {}
  global.window = {
    dispatchEvent(event) {
      events.push(event.type)
    }
  }
  global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type
      this.detail = options.detail
    }
  }
  global.utools = {
    dbStorage: {
      getItem(key) {
        return store[key]
      },
      setItem(key, value) {
        store[key] = value
      }
    }
  }

  const {
    STORAGE_STATUS_EVENT,
    getStorageRuntimeStatus,
    updateStorageRuntimeStatus,
    markStorageNoticeRead,
    getDefaultStorageRuntimeStatus
  } = await import('./src/storage/storageRuntimeStatus.js')

  assert.deepStrictEqual(getStorageRuntimeStatus(), getDefaultStorageRuntimeStatus())

  const next = updateStorageRuntimeStatus({
    mode: 'sqlite',
    migrationStatus: 'migrated',
    noticeUnread: true,
    progress: 180,
    stepText: '迁移完成',
    sqlitePath: '/tmp/db.sqlite'
  })

  assert.strictEqual(next.progress, 100)
  assert.strictEqual(next.mode, 'sqlite')
  assert.strictEqual(next.noticeUnread, true)
  assert.strictEqual(next.sqlitePath, '/tmp/db.sqlite')
  assert.strictEqual(typeof next.updatedAt, 'number')
  assert.ok(events.includes(STORAGE_STATUS_EVENT))

  const read = markStorageNoticeRead()
  assert.strictEqual(read.noticeUnread, false)
  assert.strictEqual(getStorageRuntimeStatus().noticeUnread, false)

  console.log('storage runtime status tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
