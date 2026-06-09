export const JSON_DB_SCHEMA_VERSION = 2

const hasMissingLocked = (items = []) =>
  Array.isArray(items) && items.some((item) => item && typeof item.locked !== 'boolean')

const hasMissingFileOrigins = (items = []) =>
  Array.isArray(items) && items.some((item) => item?.type === 'file' && !Array.isArray(item.originPaths))

const hasMissingCollectFields = (items = []) =>
  Array.isArray(items) && items.some((item) =>
    item && (!item.collectTime || !Array.isArray(item.tags) || typeof item.remark !== 'string')
  )

export const shouldMigrateJsonDb = (dataBase, schemaVersion = JSON_DB_SCHEMA_VERSION) => {
  if (!dataBase || typeof dataBase !== 'object') return true
  if (dataBase.schemaVersion !== schemaVersion) return true
  if (!Array.isArray(dataBase.data)) return true
  if (!Array.isArray(dataBase.collects)) return true
  if (!Array.isArray(dataBase.collectData)) return true
  if (!Array.isArray(dataBase.tags)) return true
  if (!dataBase.tagUsage || typeof dataBase.tagUsage !== 'object') return true
  if (dataBase.data.some((item) => item?.collect)) return true
  if (hasMissingLocked(dataBase.data) || hasMissingLocked(dataBase.collectData)) return true
  if (hasMissingCollectFields(dataBase.collectData)) return true
  return hasMissingFileOrigins(dataBase.data) || hasMissingFileOrigins(dataBase.collectData)
}
