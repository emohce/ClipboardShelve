/**
 * Central binding config: shortcutId + layer + optional state -> feature ids.
 * Modifiers in shortcutId use lowercase (e.g. ctrl+shift+Delete).
 * Use state 'search' for main layer when search panel is active; 'multi-select' when multi-select is on.
 */

import { normalizeShortcutId } from './shortcutKey'

/**
 * Unique key for a binding row (for overrides map).
 * @param {{ layer: string, state?: string, shortcutId: string, features: string[] }} b
 * @returns {string}
 */
export function bindingKey(b) {
  const state = b.state || ''
  const features = Array.isArray(b.features) ? b.features : [b.features]
  return `${b.layer}:${state}:${b.shortcutId}:${features.join(',')}`
}

/**
 * Returns bindings with user overrides applied (from utools.dbStorage 'setting').
 * Override null = remove binding; override string = replace shortcutId.
 */
export function getEffectiveBindings() {
  let raw
  try {
    raw = typeof utools !== 'undefined' && utools?.dbStorage?.getItem?.('setting')
  } catch (_) {
    raw = null
  }
  const setting = raw && typeof raw === 'object' ? raw : {}
  const overrides = setting.hotkeyOverrides && typeof setting.hotkeyOverrides === 'object' ? setting.hotkeyOverrides : {}
  return HOTKEY_BINDINGS.filter((b) => {
    const key = bindingKey(b)
    const ov = overrides[key]
    if (ov === null) return false
    return true
  }).map((b) => {
    const key = bindingKey(b)
    const ov = overrides[key]
    if (ov != null && typeof ov === 'string') {
      return { ...b, shortcutId: normalizeShortcutId(ov) }
    }
    return { ...b, shortcutId: normalizeShortcutId(b.shortcutId) }
  })
}

export const HOTKEY_BINDINGS = [
  // ---- clear-dialog ----
  { layer: 'clear-dialog', shortcutId: 'Escape', features: ['clear-dialog-close'] },
  { layer: 'clear-dialog', shortcutId: 'Enter', features: ['clear-dialog-confirm'] },
  { layer: 'clear-dialog', shortcutId: '1', features: ['clear-dialog-range-1h'] },
  { layer: 'clear-dialog', shortcutId: '2', features: ['clear-dialog-range-5h'] },
  { layer: 'clear-dialog', shortcutId: '3', features: ['clear-dialog-range-8h'] },
  { layer: 'clear-dialog', shortcutId: '4', features: ['clear-dialog-range-24h'] },
  { layer: 'clear-dialog', shortcutId: '5', features: ['clear-dialog-range-all'] },
  { layer: 'clear-dialog', shortcutId: 'Tab', features: ['clear-dialog-tab'] },
  { layer: 'clear-dialog', shortcutId: 'shift+Tab', features: ['clear-dialog-tab'] },
  { layer: 'clear-dialog', shortcutId: '*', features: ['clear-dialog-block'] },

  // ---- clip-drawer ----
  { layer: 'clip-drawer', shortcutId: 'Escape', features: ['drawer-close'] },
  { layer: 'clip-drawer', shortcutId: 'ArrowLeft', features: ['drawer-close'] },
  { layer: 'clip-drawer', shortcutId: 'ArrowDown', features: ['drawer-nav-down'] },
  { layer: 'clip-drawer', shortcutId: 'ArrowUp', features: ['drawer-nav-up'] },
  { layer: 'clip-drawer', shortcutId: 'Enter', features: ['drawer-select'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+Enter', features: ['drawer-select'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+1', features: ['drawer-select-1'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+2', features: ['drawer-select-2'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+3', features: ['drawer-select-3'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+4', features: ['drawer-select-4'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+5', features: ['drawer-select-5'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+6', features: ['drawer-select-6'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+7', features: ['drawer-select-7'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+8', features: ['drawer-select-8'] },
  { layer: 'clip-drawer', shortcutId: 'ctrl+9', features: ['drawer-select-9'] },
  { layer: 'clip-drawer', shortcutId: '*', features: ['drawer-block'] },

  // ---- full-data-overlay ----
  { layer: 'full-data-overlay', shortcutId: 'Escape', features: ['full-data-close'] },
  { layer: 'full-data-overlay', shortcutId: 'ArrowRight', features: ['full-data-close'] },
  { layer: 'full-data-overlay', shortcutId: '*', features: ['full-data-block'] },

  // ---- main: search state (search panel expanded + filter) ----
  { layer: 'main', state: 'search', shortcutId: 'ctrl+Delete', features: ['search-delete-normal'] },
  { layer: 'main', state: 'search', shortcutId: 'ctrl+Backspace', features: ['search-delete-normal'] },
  { layer: 'main', state: 'search', shortcutId: 'ctrl+shift+Delete', features: ['search-delete-force'] },

  // ---- main: global ----
  { layer: 'main', shortcutId: 'Tab', features: ['main-tab'] },
  { layer: 'main', shortcutId: 'shift+Tab', features: ['main-tab'] },
  { layer: 'main', shortcutId: 'ctrl+f', features: ['main-focus-search'] },
  { layer: 'main', shortcutId: 'ctrl+1', features: ['main-alt-tab-1'] },
  { layer: 'main', shortcutId: 'ctrl+2', features: ['main-alt-tab-2'] },
  { layer: 'main', shortcutId: 'ctrl+3', features: ['main-alt-tab-3'] },
  { layer: 'main', shortcutId: 'ctrl+4', features: ['main-alt-tab-4'] },
  { layer: 'main', shortcutId: 'ctrl+5', features: ['main-alt-tab-5'] },
  { layer: 'main', shortcutId: 'ctrl+6', features: ['main-alt-tab-6'] },
  { layer: 'main', shortcutId: 'ctrl+7', features: ['main-alt-tab-7'] },
  { layer: 'main', shortcutId: 'ctrl+8', features: ['main-alt-tab-8'] },
  { layer: 'main', shortcutId: 'ctrl+9', features: ['main-alt-tab-9'] },
  { layer: 'main', shortcutId: 'Escape', features: ['main-escape'] },
  { layer: 'main', shortcutId: 'ArrowUp', features: ['list-nav-up'] },
  { layer: 'main', shortcutId: 'ctrl+k', features: ['list-nav-up'] },
  { layer: 'main', shortcutId: 'ArrowDown', features: ['list-nav-down'] },
  { layer: 'main', shortcutId: 'ctrl+j', features: ['list-nav-down'] },
  { layer: 'main', shortcutId: 'ArrowLeft', features: ['list-view-full'] },
  { layer: 'main', shortcutId: 'ArrowRight', features: ['list-drawer-open'] },
  { layer: 'main', shortcutId: 'Enter', features: ['list-enter'] },
  { layer: 'main', shortcutId: 'ctrl+Enter', features: ['list-ctrl-enter'] },
  { layer: 'main', shortcutId: 'ctrl+c', features: ['list-copy'] },
  { layer: 'main', shortcutId: 'ctrl+s', features: ['list-collect'] },
  { layer: 'main', shortcutId: 'ctrl+u', features: ['list-lock'] },
  { layer: 'main', shortcutId: 'shift+Delete', features: ['open-clear-dialog'] },
  { layer: 'main', shortcutId: 'shift+Backspace', features: ['open-clear-dialog'] },
  { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
  { layer: 'main', shortcutId: 'Backspace', features: ['list-delete'] },
  { layer: 'main', shortcutId: 'ctrl+Delete', features: ['list-force-delete'] },
  { layer: 'main', shortcutId: 'ctrl+Backspace', features: ['list-force-delete'] },
  { layer: 'main', shortcutId: 'Space', features: ['list-space'] },
  { layer: 'main', shortcutId: 'Shift', features: ['list-shift'] },
  { layer: 'main', shortcutId: 'alt+1', features: ['list-quick-copy-1'] },
  { layer: 'main', shortcutId: 'alt+2', features: ['list-quick-copy-2'] },
  { layer: 'main', shortcutId: 'alt+3', features: ['list-quick-copy-3'] },
  { layer: 'main', shortcutId: 'alt+4', features: ['list-quick-copy-4'] },
  { layer: 'main', shortcutId: 'alt+5', features: ['list-quick-copy-5'] },
  { layer: 'main', shortcutId: 'alt+6', features: ['list-quick-copy-6'] },
  { layer: 'main', shortcutId: 'alt+7', features: ['list-quick-copy-7'] },
  { layer: 'main', shortcutId: 'alt+8', features: ['list-quick-copy-8'] },
  { layer: 'main', shortcutId: 'alt+9', features: ['list-quick-copy-9'] },
  { layer: 'main', shortcutId: 'ctrl+shift+1', features: ['list-drawer-sub-1'] },
  { layer: 'main', shortcutId: 'ctrl+shift+2', features: ['list-drawer-sub-2'] },
  { layer: 'main', shortcutId: 'ctrl+shift+3', features: ['list-drawer-sub-3'] },
  { layer: 'main', shortcutId: 'ctrl+shift+4', features: ['list-drawer-sub-4'] },
  { layer: 'main', shortcutId: 'ctrl+shift+5', features: ['list-drawer-sub-5'] },
  { layer: 'main', shortcutId: 'ctrl+shift+6', features: ['list-drawer-sub-6'] },
  { layer: 'main', shortcutId: 'ctrl+shift+7', features: ['list-drawer-sub-7'] },
  { layer: 'main', shortcutId: 'ctrl+shift+8', features: ['list-drawer-sub-8'] },
  { layer: 'main', shortcutId: 'ctrl+shift+9', features: ['list-drawer-sub-9'] }
]
