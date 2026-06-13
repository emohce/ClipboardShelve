import { registerPluginEnterHandler, consumePendingPluginEnterAction } from './pluginEnterHandlers'
import {
  getLastActiveContext,
  getPinGroup,
  getPinnedMap,
  savePinGroup,
  sortPinnedItems
} from '../storage/pinnedItems'
import {
  buildPinGroupRuntimeCache,
  resolvePinGroupCacheCursorEntry,
  resolvePinGroupItemsById,
  resolveQuickPastePinnedItem
} from './quickPasteSelection'
import { copyAndPasteAndExit, itemMatchesBodyKeyword } from '../utils'

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

let quickPasteInFlight = false
let disposeQuickPasteEnterHandler = null
let pinGroupRuntimeCache = null

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

const buildCacheFromGroup = (group, db = window.db) =>
  buildPinGroupRuntimeCache(group.itemIds, {
    cursor: group.cursor,
    updatedAt: group.updatedAt,
    knownItems: getKnownItems(db),
    getItemById: (id) => getItemById(id, db)
  })

export function setQuickPastePinGroupCache(items = [], options = {}) {
  const list = (Array.isArray(items) ? items : []).filter(
    (item) => item?.id && !item.__pinGroup && PASTEABLE_CLIPBOARD_ITEM_TYPES.has(item.type)
  )
  const itemIds = Array.isArray(options.itemIds) && options.itemIds.length
    ? options.itemIds.filter((id) => id && id !== '__ez_pin_group__')
    : list.map((item) => item.id)
  const byId = new Map(list.map((item) => [item.id, item]))
  pinGroupRuntimeCache = {
    itemIds,
    entries: itemIds
      .map((id, sourceIndex) => ({
        type: PIN_GROUP_CACHE_ENTRY_TYPE,
        value: byId.get(id) || null,
        sourceIndex
      }))
      .filter((entry) => entry.value),
    cursor: Math.max(0, Number(options.cursor) || 0),
    updatedAt: Number(options.updatedAt) || Date.now()
  }
  return pinGroupRuntimeCache
}

export function clearQuickPastePinGroupCache() {
  pinGroupRuntimeCache = null
}

export function refreshQuickPastePinGroupCache(options = {}) {
  const db = options.db || window.db
  const group = options.group || getPinGroup()
  pinGroupRuntimeCache = buildCacheFromGroup(group, db)
  return pinGroupRuntimeCache
}

function getQuickPastePinGroupCache(db = window.db) {
  if (pinGroupRuntimeCache) return pinGroupRuntimeCache
  return refreshQuickPastePinGroupCache({ db })
}

const getPinnedItemsForContext = (context = getLastActiveContext(), db = window.db) => {
  const map = getPinnedMap()
  const ids = Object.keys(map).filter(Boolean)
  if (!ids.length) return []
  const items = resolvePinGroupItemsById(ids, {
    knownItems: getKnownItems(db),
    getItemById: (id) => getItemById(id, db)
  })
  return sortPinnedItems(
    items.filter((item) => itemMatchesContext(item, context, db)),
    map
  )
}

export function runQuickPasteAction(action, options = {}) {
  const db = window.db || options.db
  const code = typeof action === 'string' ? action : action?.code
  if (code !== QUICK_PASTE_TOP_CODE && code !== QUICK_PASTE_GROUP_CODE) return false
  if (quickPasteInFlight) return true

  quickPasteInFlight = true
  try {
    if (code === QUICK_PASTE_TOP_CODE) {
      const item = resolveQuickPastePinnedItem(getPinnedItemsForContext(getLastActiveContext(), db))
      if (!item) {
        hideQuickPasteWindow()
        return false
      }
      return copyAndPasteAndExit(item, QUICK_PASTE_OPTIONS)
    }

    const cache = getQuickPastePinGroupCache(db)
    const { item, nextIndex } = resolvePinGroupCacheCursorEntry(cache, { cursor: cache.cursor })
    if (!item) {
      hideQuickPasteWindow()
      return false
    }
    const ok = copyAndPasteAndExit(item, QUICK_PASTE_OPTIONS)
    if (ok) {
      const saved = savePinGroup(cache.itemIds, { cursor: nextIndex })
      cache.cursor = saved.cursor
      cache.updatedAt = saved.updatedAt
    } else {
      hideQuickPasteWindow()
    }
    return ok
  } catch (err) {
    console.warn('[quickPasteRuntime] runQuickPasteAction failed:', err)
    hideQuickPasteWindow()
    return false
  } finally {
    quickPasteInFlight = false
  }
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
