import { eventToShortcutId, normalizeShortcutId } from './shortcutKey.js'
import {
  NON_CONFIGURABLE_SHORTCUT_IDS,
  SETTING_PAGE_FIXED_SHORTCUTS,
  isNonConfigurableShortcutId,
  isRecordableShortcutId as isRecordableShortcutIdWithContext
} from './shortcutReservations.js'

export { NON_CONFIGURABLE_SHORTCUT_IDS, SETTING_PAGE_FIXED_SHORTCUTS, isNonConfigurableShortcutId }
export { isShortcutAssignable, getShortcutReservationRows } from './shortcutReservations.js'

export function eventLikeToShortcutId(eventLike) {
  return eventToShortcutId(eventLike)
}

export function isRecordableShortcutId(shortcutId, context = null) {
  return isRecordableShortcutIdWithContext(shortcutId, context)
}
