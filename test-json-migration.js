const assert = require('assert')

async function main() {
  const {
    JSON_DB_SCHEMA_VERSION,
    shouldMigrateJsonDb
  } = await import('./src/storage/jsonMigration.js')

  assert.strictEqual(shouldMigrateJsonDb(null), true)
  assert.strictEqual(shouldMigrateJsonDb({ data: [] }), true)
  assert.strictEqual(
    shouldMigrateJsonDb({
      schemaVersion: JSON_DB_SCHEMA_VERSION,
      data: [{ id: 'a', collect: true, locked: false }],
      collects: [],
      collectData: [],
      tags: [],
      tagUsage: {}
    }),
    true
  )
  assert.strictEqual(
    shouldMigrateJsonDb({
      schemaVersion: JSON_DB_SCHEMA_VERSION,
      data: [{ id: 'a', type: 'text', data: 'a' }],
      collects: [],
      collectData: [],
      tags: [],
      tagUsage: {}
    }),
    true
  )
  assert.strictEqual(
    shouldMigrateJsonDb({
      schemaVersion: JSON_DB_SCHEMA_VERSION,
      data: [{ id: 'a', type: 'text', data: 'a', locked: false }],
      collects: ['c'],
      collectData: [{
        id: 'c',
        type: 'text',
        data: 'c',
        locked: false,
        collectTime: 1,
        tags: [],
        remark: ''
      }],
      tags: [],
      tagUsage: {}
    }),
    false
  )

  console.log('json migration tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
