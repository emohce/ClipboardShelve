/**
 * 数据迁移工具 - 从 JSON 文件迁移到 uTools DB
 */

const { existsSync, readFileSync, writeFileSync, copyFileSync } = window.exports
const path = window.exports.path
import { UToolsDB } from './utoolsDB'

/**
 * 备份 JSON 数据库文件
 */
function backupJsonDb(dbPath) {
  const backupPath = dbPath + '.backup.' + Date.now()
  try {
    copyFileSync(dbPath, backupPath)
    console.log('[Migration] 备份成功:', backupPath)
    return backupPath
  } catch (err) {
    console.error('[Migration] 备份失败:', err)
    throw err
  }
}

/**
 * 读取 JSON 数据库
 */
function readJsonDb(dbPath) {
  try {
    const data = readFileSync(dbPath, { encoding: 'utf8' })
    return JSON.parse(data)
  } catch (err) {
    console.error('[Migration] 读取 JSON 失败:', err)
    throw err
  }
}

/**
 * 验证数据完整性
 */
function validateData(jsonData) {
  const errors = []
  
  if (!jsonData) {
    errors.push('数据为空')
    return { valid: false, errors }
  }
  
  if (!Array.isArray(jsonData.data)) {
    errors.push('data 字段不是数组')
  }
  
  if (!Array.isArray(jsonData.collects)) {
    errors.push('collects 字段不是数组')
  }
  
  if (!Array.isArray(jsonData.collectData)) {
    errors.push('collectData 字段不是数组')
  }
  
  if (jsonData.collects.length !== jsonData.collectData.length) {
    errors.push(`collects (${jsonData.collects.length}) 与 collectData (${jsonData.collectData.length}) 长度不匹配`)
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 迁移数据到 uTools DB（批量写入 + 分块让出事件循环，避免逐条 addItem 触发数千次 _putIndex 导致卡死）
 */
async function migrateToUToolsDB(jsonData, utoolsDb) {
  console.log('[Migration] 开始迁移数据')
  console.log('[Migration] 数据项数:', jsonData.data?.length || 0)
  console.log('[Migration] 收藏数:', jsonData.collects?.length || 0)

  let migratedItems = 0
  let migratedCollects = 0
  const errors = []

  if (Array.isArray(jsonData.data)) {
    const total = jsonData.data.length
    try {
      await utoolsDb.bulkPutHistoryItems(jsonData.data)
      migratedItems = utoolsDb.dataCache.data.length
      console.log(`[Migration] 历史项批量写入完成: ${migratedItems}/${total}`)
    } catch (err) {
      errors.push(`批量写入历史数据失败: ${err.message}`)
      console.error('[Migration] bulkPutHistoryItems 失败:', err)
    }
  }

  // 迁移收藏数据
  if (Array.isArray(jsonData.collects) && Array.isArray(jsonData.collectData)) {
    try {
      utoolsDb.dataCache.collects = jsonData.collects.slice()
      utoolsDb.dataCache.collectData = jsonData.collectData.map((it) => ({ ...it }))
      await utoolsDb._putCollects()
      utoolsDb._updateTime()
      await utoolsDb._putIndex()
      migratedCollects = jsonData.collects.length
    } catch (err) {
      errors.push(`收藏数据写入失败: ${err.message}`)
      console.error('[Migration] _putCollects 失败:', err)
    }
  }

  // 迁移标签数据
  try {
    if (Array.isArray(jsonData.tags)) {
      utoolsDb.dataCache.tags = jsonData.tags.slice()
    }
    if (jsonData.tagUsage && typeof jsonData.tagUsage === 'object') {
      utoolsDb.dataCache.tagUsage = { ...jsonData.tagUsage }
    }
    await utoolsDb._putTags()
    utoolsDb._updateTime()
    await utoolsDb._putIndex()
  } catch (err) {
    errors.push(`标签数据写入失败: ${err.message}`)
    console.error('[Migration] _putTags 失败:', err)
  }

  console.log('[Migration] 迁移完成')
  console.log('[Migration] 成功迁移数据项:', migratedItems)
  console.log('[Migration] 成功迁移收藏:', migratedCollects)
  console.log('[Migration] 错误数:', errors.length)

  return {
    success: errors.length === 0,
    migratedItems,
    migratedCollects,
    errors
  }
}

/**
 * 执行完整迁移流程
 */
export async function executeMigration(dbPath, options = {}) {
  const { backup = true, validate = true } = options
  
  console.log('[Migration] ========== 开始迁移流程 ==========')
  console.log('[Migration] 源文件:', dbPath)
  
  // 检查源文件是否存在
  if (!existsSync(dbPath)) {
    throw new Error('源数据库文件不存在: ' + dbPath)
  }
  
  // 备份
  let backupPath = null
  if (backup) {
    backupPath = backupJsonDb(dbPath)
  }
  
  // 读取 JSON 数据
  const jsonData = readJsonDb(dbPath)
  
  // 验证数据
  if (validate) {
    const validation = validateData(jsonData)
    if (!validation.valid) {
      console.error('[Migration] 数据验证失败:', validation.errors)
      throw new Error('数据验证失败: ' + validation.errors.join(', '))
    }
    console.log('[Migration] 数据验证通过')
  }
  
  // 勿先 init()：init 会 allDocs + 排序载入内存，数据量大时同样卡死。仅 wipe 后批量导入即可。
  const utoolsDb = new UToolsDB()
  console.log('[Migration] 清空 uTools DB 中既有剪贴板文档…')
  await utoolsDb.wipeAllClipboardDocs()

  // 执行迁移
  const result = await migrateToUToolsDB(jsonData, utoolsDb)
  utoolsDb.isLoaded = true
  
  console.log('[Migration] ========== 迁移流程完成 ==========')
  
  return {
    ...result,
    backupPath,
    sourceItemCount: jsonData.data?.length || 0,
    sourceCollectCount: jsonData.collects?.length || 0
  }
}

/**
 * 回滚迁移（从 uTools DB 恢复到 JSON）
 */
export async function rollbackMigration(dbPath, backupPath) {
  console.log('[Migration] ========== 开始回滚 ==========')
  console.log('[Migration] 备份文件:', backupPath)
  console.log('[Migration] 目标文件:', dbPath)
  
  if (!existsSync(backupPath)) {
    throw new Error('备份文件不存在: ' + backupPath)
  }
  
  try {
    copyFileSync(backupPath, dbPath)
    console.log('[Migration] 回滚成功')
    
    // 清空 uTools DB
    const utoolsDb = new UToolsDB()
    await utoolsDb.init()
    await utoolsDb.emptyDataBase()
    
    console.log('[Migration] uTools DB 已清空')
    return { success: true }
  } catch (err) {
    console.error('[Migration] 回滚失败:', err)
    throw err
  }
}
