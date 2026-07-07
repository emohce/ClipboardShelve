import { registerPluginEnterHandler, consumePendingPluginEnterAction } from './pluginEnterHandlers.js'
import {
  getLastActiveContext,
  getPinGroup,
  getPinnedMap,
  normalizePinGroupType,
  PIN_GROUP_OPERATION,
  PIN_GROUP_TYPES,
  savePinGroup,
  sortPinnedItems
} from '../storage/pinnedItems.js'
import {
  buildPinGroupRuntimeCache,
  resolvePinGroupCacheCursorEntry,
  resolvePinGroupItemsById,
  resolveQuickPastePinnedItem
} from './quickPasteSelection.js'
import { copyAndPasteAndExit, itemMatchesBodyKeyword } from '../utils/index.js'

const QUICK_PASTE_TOP_CODE = 'quick-paste-top'
const QUICK_PASTE_GROUP_CODE = 'quick-paste-pin-group'
const PIN_GROUP_CACHE_ENTRY_TYPE = 'clipboard-item'
const PASTEABLE_CLIPBOARD_ITEM_TYPES = new Set(['text', 'image', 'file'])
const QUICK_PASTE_OPTIONS = {
  respectImageCopyGuard: true,
  useHideMainWindowPaste: true,
  skipResetPluginUiState: true,
  markExitingPlugin: true
}

/** Win 全局快捷键：修饰键 release 后再粘贴（仅 hotkey 路径） */
export const QUICK_PASTE_HOTKEY_SETTLE_MS = 120

let quickPasteInFlight = false
let quickPasteSettlePending = false
const quickPasteQueue = []
let disposeQuickPasteEnterHandler = null
let pinGroupRuntimeCache = null
let pinTopRuntimeCache = null

const createEmptyPinGroupRuntimeCache = (type, updatedAt = 0) => ({
  type: normalizePinGroupType(type),
  operation: PIN_GROUP_OPERATION,
  itemIds: [],
  entries: [],
  cursor: 0,
  updatedAt: Number(updatedAt) || 0
})

const createPinGroupRuntimeCacheState = (currentType) => {
  const groups = {}
  PIN_GROUP_TYPES.forEach((type) => {
    groups[type] = createEmptyPinGroupRuntimeCache(type)
  })
  return {
    currentType: normalizePinGroupType(currentType || getLastActiveContext().tab),
    groups,
    updatedAt: 0
  }
}

const ensurePinGroupRuntimeCacheState = (currentType) => {
  if (!pinGroupRuntimeCache || typeof pinGroupRuntimeCache !== 'object') {
    pinGroupRuntimeCache = createPinGroupRuntimeCacheState(currentType)
  }
  if (!pinGroupRuntimeCache.groups || typeof pinGroupRuntimeCache.groups !== 'object') {
    pinGroupRuntimeCache.groups = {}
  }
  PIN_GROUP_TYPES.forEach((type) => {
    if (!pinGroupRuntimeCache.groups[type]) {
      pinGroupRuntimeCache.groups[type] = createEmptyPinGroupRuntimeCache(type)
    }
  })
  pinGroupRuntimeCache.currentType = normalizePinGroupType(
    currentType || pinGroupRuntimeCache.currentType || getLastActiveContext().tab
  )
  return pinGroupRuntimeCache
}

export const isQuickPasteEnterAction = (action) =>
  action?.code === QUICK_PASTE_TOP_CODE || action?.code === QUICK_PASTE_GROUP_CODE

const hideQuickPasteWindow = () => {
  if (typeof utools !== 'undefined' && typeof utools.hideMainWindow === 'function') {
    utools.hideMainWindow()
  }
}

const parseStarFilter = (raw) => {
  const value = raw ?? ''
  if (!value || value[0] !== '*') return { isStar: false, tagKeyword: '', bodyKeyword: '' }
  const afterStar = value.slice(1)
  const firstNonSpace = afterStar.search(/\S/)
  if (firstNonSpace === -1) return { isStar: true, tagKeyword: '', bodyKeyword: '' }
  const rest = afterStar.slice(firstNonSpace)
  const spaceIndex = rest.indexOf(' ')
  return {
    isStar: true,
    tagKeyword: spaceIndex === -1 ? rest : rest.slice(0, spaceIndex),
    bodyKeyword: spaceIndex === -1 ? '' : rest.slice(spaceIndex + 1).trim()
  }
}

const tagMatch = (item, tagKeyword) => {
  if (!tagKeyword) return true
  const keyword = String(tagKeyword).toLowerCase()
  const tags = Array.isArray(item?.tags) ? item.tags : []
  return tags.some((tag) => String(tag).toLowerCase().includes(keyword))
}

const matchSearchableItemType = (item, keyword = '', tab = 'all') => {
  if (!item) return false
  if (tab === 'text') return item.type === 'text'
  if (tab === 'image') return item.type === 'image'
  if (tab === 'file') return item.type === 'file'
  if (tab === 'collect') return true
  if (keyword && item.type === 'image') return itemMatchesBodyKeyword(item, keyword)
  return keyword ? item.type !== 'image' : true
}

const itemMatchesContext = (item, context = getLastActiveContext(), db = window.db) => {
  if (!item) return false
  const keyword = typeof context.keyword === 'string' ? context.keyword.trim() : ''
  const parsed = parseStarFilter(context.keyword)
  const isCollected = Boolean(item?.id && db?.isCollected?.(item.id))

  if (context.tab === 'collect') {
    if (!isCollected) return false
    if (context.collectTag && context.collectTag !== '*全部*' && !tagMatch(item, context.collectTag)) return false
    if (context.lockFilter === 'locked' && item.locked !== true) return false
    if (parsed.isStar) return tagMatch(item, parsed.tagKeyword) && itemMatchesBodyKeyword(item, parsed.bodyKeyword)
    return matchSearchableItemType(item, keyword, 'collect') && itemMatchesBodyKeyword(item, keyword)
  }

  if (isCollected) return false
  if (parsed.isStar) {
    return matchSearchableItemType(item, context.keyword, context.tab) &&
      (context.lockFilter !== 'locked' || item.locked === true) &&
      itemMatchesBodyKeyword(item, parsed.bodyKeyword)
  }
  return matchSearchableItemType(item, keyword, context.tab) &&
    (context.lockFilter !== 'locked' || item.locked === true) &&
    itemMatchesBodyKeyword(item, keyword)
}

const getItemById = (id, db = window.db) =>
  db?.getById?.(id) || db?.filterDataBaseViaId?.(id)?.[0] || null

const getKnownItems = (db = window.db) => [
  ...(db?.dataBase?.data || []),
  ...(db?.dataBase?.collectData || [])
]

const getCachedItemSnapshotById = () => {
  const map = new Map()
  Object.values(pinGroupRuntimeCache?.groups || {}).forEach((cache) => {
    ;(cache?.entries || []).forEach((entry) => {
      if (entry?.value?.id) map.set(entry.value.id, entry.value)
    })
  })
  ;(pinTopRuntimeCache?.items || []).forEach((item) => {
    if (item?.id) map.set(item.id, item)
  })
  return map
}

const buildCacheFromGroup = (group, db = window.db) => {
  const snapshotById = getCachedItemSnapshotById()
  const type = normalizePinGroupType(group?.type)
  return {
    type,
    operation: group?.operation || PIN_GROUP_OPERATION,
    ...buildPinGroupRuntimeCache(group?.itemIds, {
      cursor: group?.cursor,
      updatedAt: group?.updatedAt,
      knownItems: getKnownItems(db),
      getItemById: (id) => getItemById(id, db) || snapshotById.get(id) || null
    })
  }
}

export function setQuickPasteTopCache(items = [], options = {}) {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => item?.id && !item.__pinGroup && PASTEABLE_CLIPBOARD_ITEM_TYPES.has(item.type)
  )
  pinTopRuntimeCache = {
    items: list,
    context: options.context || getLastActiveContext(),
    updatedAt: Number(options.updatedAt) || Date.now()
  }
  return pinTopRuntimeCache
}

export function clearQuickPasteTopCache() {
  pinTopRuntimeCache = null
}

export function setQuickPastePinGroupCache(items = [], options = {}) {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => item?.id && !item.__pinGroup && PASTEABLE_CLIPBOARD_ITEM_TYPES.has(item.type)
  )
  const type = normalizePinGroupType(options.type || options.currentType || getLastActiveContext().tab)
  const itemIds = Array.isArray(options.itemIds) && options.itemIds.length
    ? options.itemIds.filter((id) => id && id !== '__ez_pin_group__')
    : list.map((item) => item.id)
  const byId = new Map(list.map((item) => [item.id, item]))
  const snapshotById = getCachedItemSnapshotById()
  const cache = {
    type,
    operation: options.operation || PIN_GROUP_OPERATION,
    itemIds,
    entries: itemIds
      .map((id, sourceIndex) => ({
        type: PIN_GROUP_CACHE_ENTRY_TYPE,
        value: byId.get(id) || snapshotById.get(id) || null,
        sourceIndex
      }))
      .filter((entry) => entry.value),
    cursor: Math.max(0, Number(options.cursor) || 0),
    updatedAt: Number(options.updatedAt) || Date.now()
  }
  const state = ensurePinGroupRuntimeCacheState(options.currentType || type)
  state.groups[type] = cache
  state.updatedAt = Math.max(Number(state.updatedAt) || 0, cache.updatedAt)
  return cache
}

export function clearQuickPastePinGroupCache(type, options = {}) {
  if (!type) {
    pinGroupRuntimeCache = null
    return null
  }
  const state = ensurePinGroupRuntimeCacheState(
    options.currentType || pinGroupRuntimeCache?.currentType || getLastActiveContext().tab
  )
  state.groups[normalizePinGroupType(type)] = createEmptyPinGroupRuntimeCache(type, Date.now())
  state.updatedAt = Date.now()
  return state
}

export function refreshQuickPastePinGroupCache(options = {}) {
  const db = options.db || window.db
  const context = options.context || getLastActiveContext()
  const type = normalizePinGroupType(options.type || options.group?.type || context.tab)
  const group = options.group || getPinGroup(type)
  if (!group?.itemIds?.length) {
    clearQuickPastePinGroupCache(type, { currentType: context.tab })
    return null
  }
  const next = buildCacheFromGroup(group, db)
  const state = ensurePinGroupRuntimeCacheState(options.currentType || context.tab || type)
  const prevCache = state.groups[type]
  if (prevCache?.entries?.length && next.entries.length) {
    const prevById = new Map(
      prevCache.entries
        .filter((entry) => entry?.value?.id)
        .map((entry) => [entry.value.id, entry.value])
    )
    next.entries = next.entries.map((entry) => ({
      ...entry,
      value: entry.value || prevById.get(entry.value?.id) || null
    })).filter((entry) => entry.value)
  }
  state.groups[type] = next
  state.updatedAt = Math.max(Number(state.updatedAt) || 0, Number(next.updatedAt) || 0)
  return next
}

function getQuickPastePinGroupCache(db = window.db, context = getLastActiveContext()) {
  const type = normalizePinGroupType(context.tab)
  const cache = pinGroupRuntimeCache?.groups?.[type]
  if (cache?.entries?.length) return cache
  return refreshQuickPastePinGroupCache({ db, type, context })
}

const getPinnedItemsForContext = (context = getLastActiveContext(), db = window.db) => {
  const map = getPinnedMap()
  const ids = Object.keys(map).filter(Boolean)
  if (!ids.length) return []
  const snapshotById = getCachedItemSnapshotById()
  const items = resolvePinGroupItemsById(ids, {
    knownItems: getKnownItems(db),
    getItemById: (id) => getItemById(id, db) || snapshotById.get(id) || null
  })
  return sortPinnedItems(
    items.filter((item) => itemMatchesContext(item, context, db)),
    map
  )
}

const contextSnapshotKey = (context = {}) =>
  [context.tab || 'all', context.collectTag || '', context.keyword || '', context.lockFilter || 'all'].join('\u0001')

const getQuickPasteTopItem = (db = window.db) => {
  const context = getLastActiveContext()
  const liveItems = getPinnedItemsForContext(context, db)
  if (liveItems.length) {
    if (!pinTopRuntimeCache || contextSnapshotKey(pinTopRuntimeCache.context) !== contextSnapshotKey(context)) {
      setQuickPasteTopCache(liveItems, { context })
    }
    return resolveQuickPastePinnedItem(liveItems)
  }
  if (pinTopRuntimeCache?.items?.length &&
    contextSnapshotKey(pinTopRuntimeCache.context) === contextSnapshotKey(context)) {
    return resolveQuickPastePinnedItem(pinTopRuntimeCache.items)
  }
  return null
}

const logQuickPasteDebug = (message, detail = {}) => {
  if (typeof window === 'undefined' || !window.__EZ_QUICK_PASTE_DEBUG) return
  console.log('[quick-paste]', message, detail)
}

const isHotkeyPluginEnter = (enterFrom) => enterFrom === 'hotkey'

const getRuntimePlatform = () => {
  try {
    const osPlatform = typeof window !== 'undefined' ? window.exports?.os?.platform?.() : ''
    if (osPlatform) return osPlatform
  } catch (_) {}
  try {
    if (typeof navigator !== 'undefined' && /Win/i.test(navigator.platform || '')) return 'win32'
  } catch (_) {}
  try {
    if (typeof process !== 'undefined' && process.platform) return process.platform
  } catch (_) {}
  return ''
}

const isWindowsRuntime = () =>
  getRuntimePlatform() === 'win32'

const shouldSettleHotkeyPaste = (enterFrom) =>
  isHotkeyPluginEnter(enterFrom) && isWindowsRuntime()

const afterHotkeySettle = (callback, options = {}) => {
  if (options.immediate === true || !shouldSettleHotkeyPaste(options.enterFrom)) {
    callback()
    return
  }
  setTimeout(callback, QUICK_PASTE_HOTKEY_SETTLE_MS)
}

const resolveQuickPasteEnterFrom = (action) => {
  const from = typeof action === 'object' && action ? action.from : undefined
  if (from) return from
  if (isQuickPasteEnterAction(action) && isWindowsRuntime()) return 'hotkey'
  return undefined
}

function executeQuickPasteActionSync(action, options = {}) {
  const db = window.db || options.db
  const code = typeof action === 'string' ? action : action?.code
  const enterFrom = options.enterFrom ?? resolveQuickPasteEnterFrom(action)
  const pasteOptions = { ...QUICK_PASTE_OPTIONS, enterFrom }
  if (code !== QUICK_PASTE_TOP_CODE && code !== QUICK_PASTE_GROUP_CODE) return false

  try {
    if (code === QUICK_PASTE_TOP_CODE) {
      const item = getQuickPasteTopItem(db)
      logQuickPasteDebug('quick-paste-top', { itemId: item?.id, type: item?.type, enterFrom })
      if (!item) {
        hideQuickPasteWindow()
        return false
      }
      return copyAndPasteAndExit(item, pasteOptions)
    }

    const context = getLastActiveContext()
    const cache = getQuickPastePinGroupCache(db, context)
    const { item, nextIndex } = resolvePinGroupCacheCursorEntry(cache || {}, { cursor: cache?.cursor })
    const groupType = normalizePinGroupType(cache?.type || context.tab)
    logQuickPasteDebug('quick-paste-pin-group', {
      itemId: item?.id,
      type: item?.type,
      groupType,
      enterFrom,
      cursor: cache?.cursor
    })
    if (!item) {
      hideQuickPasteWindow()
      return false
    }
    const ok = copyAndPasteAndExit(item, pasteOptions)
    if (ok) {
      const saved = savePinGroup(cache.itemIds, { type: groupType, cursor: nextIndex })
      cache.cursor = saved.cursor
      cache.updatedAt = saved.updatedAt
    } else {
      hideQuickPasteWindow()
    }
    return ok
  } catch (err) {
    console.warn('[quickPasteRuntime] executeQuickPasteActionSync failed:', err)
    hideQuickPasteWindow()
    return false
  }
}

const processNextQueuedQuickPaste = (options = {}) => {
  if (quickPasteInFlight || quickPasteSettlePending || !quickPasteQueue.length) return
  const entry = quickPasteQueue.shift()
  quickPasteSettlePending = true
  afterHotkeySettle(() => {
    quickPasteSettlePending = false
    quickPasteInFlight = true
    try {
      executeQuickPasteActionSync(entry.action, { ...options, ...(entry.options || {}) })
    } finally {
      quickPasteInFlight = false
      processNextQueuedQuickPaste(options)
    }
  }, { ...options, ...(entry.options || {}) })
}

export function runQuickPasteAction(action, options = {}) {
  const code = typeof action === 'string' ? action : action?.code
  if (code !== QUICK_PASTE_TOP_CODE && code !== QUICK_PASTE_GROUP_CODE) return false

  const enterFrom = options.enterFrom ?? resolveQuickPasteEnterFrom(action)
  const runOptions = { ...options, enterFrom }

  if (options.immediate === true || !shouldSettleHotkeyPaste(enterFrom)) {
    quickPasteInFlight = true
    try {
      return executeQuickPasteActionSync(action, runOptions)
    } finally {
      quickPasteInFlight = false
    }
  }

  quickPasteQueue.push({ action, options: runOptions })
  processNextQueuedQuickPaste(runOptions)
  return true
}

export function flushPendingQuickPasteActions(options = {}) {
  let pending = consumePendingPluginEnterAction(isQuickPasteEnterAction, {
    maxAgeMs: options.pendingMaxAgeMs || 5000
  })
  while (pending) {
    runQuickPasteAction(pending, options)
    pending = consumePendingPluginEnterAction(isQuickPasteEnterAction, {
      maxAgeMs: options.pendingMaxAgeMs || 5000
    })
  }
}

export function registerQuickPasteRuntime(options = {}) {
  if (disposeQuickPasteEnterHandler) return disposeQuickPasteEnterHandler
  const run = (action) => {
    if (!isQuickPasteEnterAction(action)) return false
    return runQuickPasteAction(action, options)
  }
  disposeQuickPasteEnterHandler = registerPluginEnterHandler(run)

  return disposeQuickPasteEnterHandler
}
