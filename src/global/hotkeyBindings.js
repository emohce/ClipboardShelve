/**
 * Central binding config: shortcutId + layer + optional state -> feature ids.
 * shortcutId uses compact semantics: c/s/a modifiers + key token (e.g. c-s-del).
 * Use state 'search' for main layer when search panel is active; 'multi-select' when multi-select is on.
 */

import { normalizeShortcutId } from "./shortcutKey.js";
import { toCommandAwareBindings } from "./commandDefaults.js";

export const HOTKEY_BINDINGS_VERSION = "2026-06-10-ui-interaction-hotkey-refresh";
export const HOTKEY_BINDINGS_UPDATED_EVENT = "ezclipboard:hotkey-bindings-updated";

/**
 * Unique key for a binding row (for overrides map).
 * @param {{ layer: string, state?: string, shortcutId: string, features: string[] }} b
 * @returns {string}
 */
export function bindingKey(b) {
  const state = b.state || "";
  const features = Array.isArray(b.features) ? b.features : [b.features];
  return `${b.layer}:${state}:${b.shortcutId}:${features.join(",")}`;
}

/**
 * Returns bindings with user overrides applied (from utools.dbStorage 'setting').
 * Override null = remove binding; override string = replace shortcutId.
 */
export function getEffectiveBindings() {
  return getConfiguredBindings().filter((b) => b.disabled !== true);
}

export function getConfiguredBindings(overrideSource = null) {
  let raw;
  try {
    raw =
      typeof utools !== "undefined" && utools?.dbStorage?.getItem?.("setting");
  } catch (_) {
    raw = null;
  }
  const setting = raw && typeof raw === "object" ? raw : {};
  let overrides = {};
  if (overrideSource && typeof overrideSource === "object") {
    overrides = overrideSource;
  } else if (setting.hotkeyOverrides && typeof setting.hotkeyOverrides === "object") {
    overrides = setting.hotkeyOverrides;
  }
  return HOTKEY_BINDINGS.map((b) => {
    const key = bindingKey(b);
    const ov = overrides[key];
    return applyHotkeyOverride(b, ov, key);
  });
}

export function getCommandAwareBindings(list = getEffectiveBindings()) {
  return toCommandAwareBindings(list);
}

export function applyHotkeyOverride(binding, overrideValue, overrideKey) {
  const defaultShortcutId = normalizeShortcutId(binding.shortcutId);
  const defaultWhen = binding.when;
  if (overrideValue === null) {
    return {
      ...binding,
      shortcutId: defaultShortcutId,
      defaultShortcutId,
      defaultWhen,
      overrideKey,
      source: "removed",
      disabled: true,
    };
  }
  if (overrideValue != null && typeof overrideValue === "string") {
    return {
      ...binding,
      shortcutId: normalizeShortcutId(overrideValue),
      defaultShortcutId,
      defaultWhen,
      overrideKey,
      source: "user",
    };
  }
  if (overrideValue && typeof overrideValue === "object") {
    return {
      ...binding,
      shortcutId: normalizeShortcutId(overrideValue.shortcutId || defaultShortcutId),
      when: typeof overrideValue.when === "string" ? overrideValue.when : binding.when,
      defaultShortcutId,
      defaultWhen,
      overrideKey,
      source: "user",
    };
  }
  return {
    ...binding,
    shortcutId: defaultShortcutId,
    defaultShortcutId,
    defaultWhen,
    overrideKey,
    source: "system",
  };
}

export const HOTKEY_BINDINGS = [
  // ---- setting ----
  { layer: "setting", shortcutId: "up", features: ["setting-scroll-up"] },
  { layer: "setting", shortcutId: "down", features: ["setting-scroll-down"] },
  { layer: "setting", shortcutId: "left", features: ["setting-tab-prev"] },
  { layer: "setting", shortcutId: "right", features: ["setting-tab-next"] },

  // ---- setting 子弹窗：wildcard 阻断，防止方向键/Tab 穿透到 setting 层 ----
  { layer: "setting-shortcut-record", shortcutId: "*", features: ["setting-overlay-block"], internal: true },
  { layer: "setting-when-edit", shortcutId: "*", features: ["setting-overlay-block"], internal: true },

  // ---- clear-dialog ----
  {
    layer: "clear-dialog",
    shortcutId: "esc",
    features: ["clear-dialog-close"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "cr",
    features: ["clear-dialog-confirm"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "1",
    features: ["clear-dialog-range-1h"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "2",
    features: ["clear-dialog-range-5h"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "3",
    features: ["clear-dialog-range-8h"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "4",
    features: ["clear-dialog-range-24h"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "5",
    features: ["clear-dialog-range-7d"],
  },
  {
    layer: "clear-dialog",
    shortcutId: "6",
    features: ["clear-dialog-range-all"],
  },
  { layer: "clear-dialog", shortcutId: "up", features: ["clear-dialog-arrow-nav"] },
  { layer: "clear-dialog", shortcutId: "down", features: ["clear-dialog-arrow-nav"] },
  { layer: "clear-dialog", shortcutId: "left", features: ["clear-dialog-arrow-nav"] },
  { layer: "clear-dialog", shortcutId: "right", features: ["clear-dialog-arrow-nav"] },
  { layer: "clear-dialog", shortcutId: "tab", features: ["clear-dialog-tab"] },
  {
    layer: "clear-dialog",
    shortcutId: "s-tab",
    features: ["clear-dialog-tab"],
  },
  { layer: "clear-dialog", shortcutId: "*", features: ["clear-dialog-block"] },

  // ---- clip-drawer ----
  { layer: "clip-drawer", shortcutId: "esc", features: ["drawer-close"] },
  { layer: "clip-drawer", shortcutId: "left", features: ["drawer-close"] },
  { layer: "clip-drawer", shortcutId: "c-left", features: ["drawer-close"] },
  {
    layer: "clip-drawer",
    shortcutId: "down",
    features: ["drawer-nav-down"],
  },
  { layer: "clip-drawer", shortcutId: "up", features: ["drawer-nav-up"] },
  { layer: "clip-drawer", shortcutId: "cr", features: ["drawer-select"] },
  {
    layer: "clip-drawer",
    shortcutId: "c-cr",
    features: ["drawer-select"],
  },
  { layer: "clip-drawer", shortcutId: "c-1", features: ["drawer-select-1"] },
  { layer: "clip-drawer", shortcutId: "c-2", features: ["drawer-select-2"] },
  { layer: "clip-drawer", shortcutId: "c-3", features: ["drawer-select-3"] },
  { layer: "clip-drawer", shortcutId: "c-4", features: ["drawer-select-4"] },
  { layer: "clip-drawer", shortcutId: "c-5", features: ["drawer-select-5"] },
  { layer: "clip-drawer", shortcutId: "c-6", features: ["drawer-select-6"] },
  { layer: "clip-drawer", shortcutId: "c-7", features: ["drawer-select-7"] },
  { layer: "clip-drawer", shortcutId: "c-8", features: ["drawer-select-8"] },
  { layer: "clip-drawer", shortcutId: "c-9", features: ["drawer-select-9"] },
  { layer: "clip-drawer", shortcutId: "*", features: ["drawer-block"] },

  // ---- full-data-overlay ----
  {
    layer: "full-data-overlay",
    shortcutId: "esc",
    features: ["full-data-close"],
  },
  {
    layer: "full-data-overlay",
    shortcutId: "right",
    features: ["full-data-close"],
  },
  {
    layer: "full-data-overlay",
    shortcutId: "c-right",
    features: ["full-data-close"],
  },
  {
    layer: "full-data-overlay",
    shortcutId: "up",
    features: ["full-data-scroll-up"],
  },
  {
    layer: "full-data-overlay",
    shortcutId: "down",
    features: ["full-data-scroll-down"],
  },
  {
    layer: "full-data-overlay",
    shortcutId: "*",
    features: ["full-data-block"],
  },

  // ---- tag-search ----
  {
    layer: "tag-search",
    shortcutId: "esc",
    features: ["tag-search-close"],
  },
  {
    layer: "tag-search",
    shortcutId: "*",
    features: ["tag-search-block"],
  },

  // ---- tag-edit ----
  {
    layer: "tag-edit",
    shortcutId: "esc",
    features: ["tag-edit-close"],
  },
  {
    layer: "tag-edit",
    shortcutId: "tab",
    features: ["tag-edit-focus-tab"],
  },
  {
    layer: "tag-edit",
    shortcutId: "s-tab",
    features: ["tag-edit-focus-tab"],
  },
  {
    layer: "tag-edit",
    shortcutId: "c-s",
    features: ["tag-edit-save"],
  },
  {
    layer: "tag-edit",
    shortcutId: "*",
    features: ["tag-edit-block"],
  },

  // ---- pin-group-edit ----
  { layer: "pin-group-edit", shortcutId: "esc", features: ["pin-group-edit-close"] },
  { layer: "pin-group-edit", shortcutId: "cr", features: ["pin-group-edit-save"] },
  { layer: "pin-group-edit", shortcutId: "up", features: ["pin-group-edit-nav-up"] },
  { layer: "pin-group-edit", shortcutId: "down", features: ["pin-group-edit-nav-down"] },
  { layer: "pin-group-edit", shortcutId: "space", features: ["pin-group-edit-toggle-select"] },
  { layer: "pin-group-edit", shortcutId: "a-u", features: ["pin-group-edit-up"] },
  { layer: "pin-group-edit", shortcutId: "a-e", features: ["pin-group-edit-down"] },
  { layer: "pin-group-edit", shortcutId: "a-g", features: ["pin-group-edit-clear"] },
  { layer: "pin-group-edit", shortcutId: "c-del", features: ["pin-group-edit-clear"] },
  { layer: "pin-group-edit", shortcutId: "c-backspace", features: ["pin-group-edit-clear"] },
  { layer: "pin-group-edit", shortcutId: "*", features: ["pin-group-edit-block"] },

  // ---- main: search state (search panel expanded + filter) ----
  {
    layer: "main",
    state: "search",
    shortcutId: "c-del",
    features: ["search-delete-normal"],
  },
  {
    layer: "main",
    state: "search",
    shortcutId: "c-backspace",
    features: ["search-delete-normal"],
  },
  {
    layer: "main",
    state: "search",
    shortcutId: "c-s-del",
    features: ["search-delete-force"],
  },

  // ---- main: global ----
  { layer: "main", shortcutId: "tab", features: ["main-tab"] },
  { layer: "main", shortcutId: "s-tab", features: ["main-tab"] },
  { layer: "main", shortcutId: "c-tab", features: ["collect-sub-tab-next"] },
  { layer: "main", shortcutId: "c-s-tab", features: ["collect-sub-tab-prev"] },
  { layer: "main", shortcutId: "c-a-s", features: ["main-open-setting"] },
  { layer: "main", shortcutId: "c-f", features: ["main-focus-search"] },
  {
    layer: "main",
    shortcutId: "c-s-u",
    features: ["main-toggle-locked-search"],
  },
  { layer: "main", shortcutId: "c-1", features: ["main-alt-tab-1"] },
  { layer: "main", shortcutId: "c-2", features: ["main-alt-tab-2"] },
  { layer: "main", shortcutId: "c-3", features: ["main-alt-tab-3"] },
  { layer: "main", shortcutId: "c-4", features: ["main-alt-tab-4"] },
  { layer: "main", shortcutId: "c-5", features: ["main-alt-tab-5"] },
  { layer: "main", shortcutId: "c-6", features: ["main-alt-tab-6"] },
  { layer: "main", shortcutId: "c-7", features: ["main-alt-tab-7"] },
  { layer: "main", shortcutId: "c-8", features: ["main-alt-tab-8"] },
  { layer: "main", shortcutId: "c-9", features: ["main-alt-tab-9"] },
  { layer: "main", shortcutId: "esc", features: ["main-escape"] },
  { layer: "main", shortcutId: "up", features: ["list-nav-up"] },
  { layer: "main", shortcutId: "c-k", features: ["list-nav-up"] },
  { layer: "main", shortcutId: "down", features: ["list-nav-down"] },
  { layer: "main", shortcutId: "c-j", features: ["list-nav-down"] },
  { layer: "main", shortcutId: "c-up", features: ["list-page-up"] },
  { layer: "main", shortcutId: "c-down", features: ["list-page-down"] },
  { layer: "main", shortcutId: "a-u", features: ["list-page-up"] },
  { layer: "main", shortcutId: "a-e", features: ["list-page-down"] },
  { layer: "main", shortcutId: "pageup", features: ["list-page-up"] },
  { layer: "main", shortcutId: "pagedown", features: ["list-page-down"] },
  { layer: "main", shortcutId: "left", features: ["main-tab-prev"] },
  { layer: "main", shortcutId: "right", features: ["main-tab-next"] },
  { layer: "main", shortcutId: "c-left", features: ["list-view-full"] },
  { layer: "main", shortcutId: "c-right", features: ["list-drawer-open"] },
  { layer: "main", shortcutId: "c-s-left", features: ["list-scroll-to-top"] },
  { layer: "main", shortcutId: "c-s-right", features: ["list-scroll-to-bottom"] },
  { layer: "main", shortcutId: "s-up", features: ["text-preview-scroll-up"] },
  { layer: "main", shortcutId: "s-down", features: ["text-preview-scroll-down"] },
  { layer: "main", shortcutId: "s-left", features: ["image-preview-scroll-left"] },
  { layer: "main", shortcutId: "s-right", features: ["image-preview-scroll-right"] },
  { layer: "main", shortcutId: "f2", features: ["list-tag-edit"] },
  { layer: "main", shortcutId: "s-f2", features: ["list-view-full"] },
  { layer: "main", shortcutId: "cr", features: ["list-enter"] },
  { layer: "main", shortcutId: "c-cr", features: ["list-ctrl-enter"] },
  { layer: "main", shortcutId: "s-cr", features: ["list-save-by-alias"] },
  { layer: "main", shortcutId: "c-c", features: ["list-copy"] },
  { layer: "main", shortcutId: "c-s-,", features: ["list-line-join"], when: "mainFocus && !inputFocus" },
  { layer: "main", shortcutId: "a-p", features: ["list-pin-toggle"] },
  { layer: "main", shortcutId: "a-g", features: ["pin-group-open"] },
  { layer: "main", shortcutId: "c-s", features: ["list-collect"] },
  { layer: "main", shortcutId: "c-u", features: ["list-lock"] },
  {
    layer: "main",
    shortcutId: "s-del",
    features: ["open-clear-dialog"],
  },
  {
    layer: "main",
    shortcutId: "s-backspace",
    features: ["open-clear-dialog"],
  },
  { layer: "main", shortcutId: "del", features: ["list-delete"] },
  { layer: "main", shortcutId: "backspace", features: ["list-delete"] },
  { layer: "main", shortcutId: "c-del", features: ["list-force-delete"] },
  {
    layer: "main",
    shortcutId: "c-backspace",
    features: ["list-force-delete"],
  },
  { layer: "main", shortcutId: "space", features: ["list-space"] },
  { layer: "main", shortcutId: "mod-s", features: ["list-shift"] },
  { layer: "main", shortcutId: "a-1", features: ["list-quick-copy-1"] },
  { layer: "main", shortcutId: "a-2", features: ["list-quick-copy-2"] },
  { layer: "main", shortcutId: "a-3", features: ["list-quick-copy-3"] },
  { layer: "main", shortcutId: "a-4", features: ["list-quick-copy-4"] },
  { layer: "main", shortcutId: "a-5", features: ["list-quick-copy-5"] },
  { layer: "main", shortcutId: "a-6", features: ["list-quick-copy-6"] },
  { layer: "main", shortcutId: "a-7", features: ["list-quick-copy-7"] },
  { layer: "main", shortcutId: "a-8", features: ["list-quick-copy-8"] },
  { layer: "main", shortcutId: "a-9", features: ["list-quick-copy-9"] },
  {
    layer: "main",
    shortcutId: "c-a-1",
    features: ["list-drawer-sub-1"],
  },
  {
    layer: "main",
    shortcutId: "c-a-2",
    features: ["list-drawer-sub-2"],
  },
  {
    layer: "main",
    shortcutId: "c-a-3",
    features: ["list-drawer-sub-3"],
  },
  {
    layer: "main",
    shortcutId: "c-a-4",
    features: ["list-drawer-sub-4"],
  },
  {
    layer: "main",
    shortcutId: "c-a-5",
    features: ["list-drawer-sub-5"],
  },
  {
    layer: "main",
    shortcutId: "c-a-6",
    features: ["list-drawer-sub-6"],
  },
  {
    layer: "main",
    shortcutId: "c-a-7",
    features: ["list-drawer-sub-7"],
  },
  {
    layer: "main",
    shortcutId: "c-a-8",
    features: ["list-drawer-sub-8"],
  },
  {
    layer: "main",
    shortcutId: "c-a-9",
    features: ["list-drawer-sub-9"],
  },
  { layer: "main", shortcutId: "c-a-f", features: ["tag-search"] },
  { layer: "main", shortcutId: "c-s-f", features: ["tag-search"] },
];
