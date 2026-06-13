import { registerPluginEnterHandler, consumePendingPluginEnterAction } from './pluginEnterHandlers'
import {
  getLastActiveContext,
  getPinGroup,
  getPinnedMap,
  savePinGroup,
  sortPinnedItems
} from '../storage/pinnedItems'
import {
  resolvePinGroupCursorEntry,
  resolvePinGroupItemsById,
  resolveQuickPastePinnedItem
} from './quickPasteSelection'
import { copyAndPasteAndExit, itemMatchesBodyKeyword } from '../utils'

const QUICK_PASTE_TOP_CODE = 'quick-paste-top'
const QUICK_PASTE_GROUP_CODE = 'quick-paste-pin-group'

let quickPasteInFlight = false
let disposeQuickPasteEnterHandler = null

export const isQuickPasteEnterAction = (action) =>
  action?.code === QUICK_PASTE_TOP_CODE || action?.code === QUICK_PASTE_GROUP_CODE

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
      return item ? copyAndPasteAndExit(item, { respectImageCopyGuard: true }) : false
    }

    const group = getPinGroup()
    const { item, nextIndex } = resolvePinGroupCursorEntry(group.itemIds, {
      cursor: group.cursor,
      knownItems: getKnownItems(db),
      getItemById: (id) => getItemById(id, db)
    })
    const ok = item ? copyAndPasteAndExit(item, { respectImageCopyGuard: true }) : false
    if (ok) savePinGroup(group.itemIds, { cursor: nextIndex })
    return ok
  } finally {
    quickPasteInFlight = false
  }
}

export function registerQuickPasteRuntime(options = {}) {
  if (disposeQuickPasteEnterHandler) return disposeQuickPasteEnterHandler
  const run = (action) => {
    if (!isQuickPasteEnterAction(action)) return false
    return runQuickPasteAction(action, options)
  }
  disposeQuickPasteEnterHandler = registerPluginEnterHandler(run)

  let pending = consumePendingPluginEnterAction(isQuickPasteEnterAction, { maxAgeMs: options.pendingMaxAgeMs || 5000 })
  while (pending) {
    run(pending)
    pending = consumePendingPluginEnterAction(isQuickPasteEnterAction, { maxAgeMs: options.pendingMaxAgeMs || 5000 })
  }

  return disposeQuickPasteEnterHandler
}
