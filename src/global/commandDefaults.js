const LAYER_WHEN_MAP = {
  main: 'mainFocus',
  setting: 'settingFocus',
  'clear-dialog': 'clearDialogOpen',
  'clip-drawer': 'drawerOpen',
  'full-data-overlay': 'fullDataOpen',
  'tag-search': 'tagSearchOpen',
  'tag-edit': 'tagEditOpen',
  'pin-group-edit': 'pinGroupEditOpen'
}

export const PASTE_COMMAND_SETTLE_AFTER_MS = 180

const COMMAND_DEFINITIONS = [
  ['setting.scroll.up', 'setting-scroll-up', 'setting', 'Setting scroll up'],
  ['setting.scroll.down', 'setting-scroll-down', 'setting', 'Setting scroll down'],
  ['setting.tab.prev', 'setting-tab-prev', 'setting', 'Previous setting tab'],
  ['setting.tab.next', 'setting-tab-next', 'setting', 'Next setting tab'],

  ['dialog.clear.close', 'clear-dialog-close', 'dialog', 'Close clear dialog'],
  ['dialog.clear.confirm', 'clear-dialog-confirm', 'dialog', 'Confirm clear dialog', 'data-write'],
  ['dialog.clear.range.1h', 'clear-dialog-range-1h', 'dialog', 'Select clear range 1h'],
  ['dialog.clear.range.5h', 'clear-dialog-range-5h', 'dialog', 'Select clear range 5h'],
  ['dialog.clear.range.8h', 'clear-dialog-range-8h', 'dialog', 'Select clear range 8h'],
  ['dialog.clear.range.24h', 'clear-dialog-range-24h', 'dialog', 'Select clear range 24h'],
  ['dialog.clear.range.7d', 'clear-dialog-range-7d', 'dialog', 'Select clear range 7d'],
  ['dialog.clear.range.all', 'clear-dialog-range-all', 'dialog', 'Select clear range all'],
  ['dialog.clear.range.navigate', 'clear-dialog-arrow-nav', 'dialog', 'Navigate clear range'],
  ['dialog.clear.focus.next', 'clear-dialog-tab', 'dialog', 'Focus next clear option'],
  ['dialog.clear.blockUnhandled', 'clear-dialog-block', 'system', 'Block unhandled clear dialog keys'],

  ['drawer.close', 'drawer-close', 'drawer', 'Close drawer'],
  ['drawer.navigate.down', 'drawer-nav-down', 'drawer', 'Move drawer selection down'],
  ['drawer.navigate.up', 'drawer-nav-up', 'drawer', 'Move drawer selection up'],
  ['drawer.select', 'drawer-select', 'drawer', 'Select drawer item'],
  ['drawer.blockUnhandled', 'drawer-block', 'system', 'Block unhandled drawer keys'],

  ['preview.full.close', 'full-data-close', 'preview', 'Close full preview'],
  ['preview.full.scroll.up', 'full-data-scroll-up', 'preview', 'Scroll full preview up'],
  ['preview.full.scroll.down', 'full-data-scroll-down', 'preview', 'Scroll full preview down'],
  ['preview.full.blockUnhandled', 'full-data-block', 'system', 'Block unhandled full preview keys'],

  ['tag.search.open', 'tag-search', 'tag', 'Open tag search'],
  ['tag.search.close', 'tag-search-close', 'tag', 'Close tag search'],
  ['tag.search.blockUnhandled', 'tag-search-block', 'system', 'Block unhandled tag search keys'],
  ['tag.edit.close', 'tag-edit-close', 'tag', 'Close tag edit'],
  ['tag.edit.focus.next', 'tag-edit-focus-tab', 'tag', 'Focus next tag edit field'],
  ['tag.edit.save', 'tag-edit-save', 'tag', 'Save tag edit', 'data-write'],
  ['tag.edit.blockUnhandled', 'tag-edit-block', 'system', 'Block unhandled tag edit keys'],

  ['pin.group.edit.close', 'pin-group-edit-close', 'pin', 'Close pin group editor'],
  ['pin.group.edit.save', 'pin-group-edit-save', 'pin', 'Save pin group', 'data-write'],
  ['pin.group.edit.navigate.up', 'pin-group-edit-nav-up', 'pin', 'Move pin group cursor up'],
  ['pin.group.edit.navigate.down', 'pin-group-edit-nav-down', 'pin', 'Move pin group cursor down'],
  ['pin.group.edit.toggleSelect', 'pin-group-edit-toggle-select', 'pin', 'Toggle pin group selection'],
  ['pin.group.edit.moveUp', 'pin-group-edit-up', 'pin', 'Move pin group selection up'],
  ['pin.group.edit.moveDown', 'pin-group-edit-down', 'pin', 'Move pin group selection down'],
  ['pin.group.edit.clear', 'pin-group-edit-clear', 'pin', 'Clear pin group', 'data-write'],
  ['pin.group.edit.blockUnhandled', 'pin-group-edit-block', 'system', 'Block unhandled pin group edit keys'],

  ['search.results.delete', 'search-delete-normal', 'search', 'Delete search results', 'data-write'],
  ['search.results.forceDelete', 'search-delete-force', 'search', 'Force delete search results', 'data-write'],
  ['search.focus', 'main-focus-search', 'search', 'Focus search'],
  ['search.locked.toggle', 'main-toggle-locked-search', 'search', 'Toggle locked search filter'],

  ['main.tab.next', 'main-tab', 'main', 'Switch main tab'],
  ['main.tab.prev', 'main-tab-prev', 'main', 'Previous main tab'],
  ['main.tab.nextExplicit', 'main-tab-next', 'main', 'Next main tab'],
  ['main.collectSubTab.next', 'collect-sub-tab-next', 'main', 'Next collect sub tab'],
  ['main.collectSubTab.prev', 'collect-sub-tab-prev', 'main', 'Previous collect sub tab'],
  ['main.setting.open', 'main-open-setting', 'main', 'Open settings'],
  ['main.escape', 'main-escape', 'main', 'Handle main escape'],
  ['dialog.clear.open', 'open-clear-dialog', 'dialog', 'Open clear dialog'],
  ['pin.group.open', 'pin-group-open', 'pin', 'Open pin group editor'],

  ['list.navigate.up', 'list-nav-up', 'list', 'Move selection up'],
  ['list.navigate.down', 'list-nav-down', 'list', 'Move selection down'],
  ['list.navigate.pageUp', 'list-page-up', 'list', 'Move selection one page up'],
  ['list.navigate.pageDown', 'list-page-down', 'list', 'Move selection one page down'],
  ['list.navigate.left', 'list-nav-left', 'list', 'Move selection left'],
  ['list.navigate.top', 'list-scroll-to-top', 'list', 'Move selection to cached top'],
  ['list.navigate.bottom', 'list-scroll-to-bottom', 'list', 'Move selection to cached bottom'],
  ['list.preview.text.up', 'text-preview-scroll-up', 'list', 'Scroll text preview up'],
  ['list.preview.text.down', 'text-preview-scroll-down', 'list', 'Scroll text preview down'],
  ['list.preview.image.left', 'image-preview-scroll-left', 'list', 'Scroll image preview left'],
  ['list.preview.image.right', 'image-preview-scroll-right', 'list', 'Scroll image preview right'],
  ['list.item.openFull', 'list-view-full', 'list', 'Open full item view'],
  ['list.item.openDrawer', 'list-drawer-open', 'list', 'Open item drawer'],
  ['list.item.editTagOrAlias', 'list-tag-edit', 'list', 'Edit tag or alias', 'data-write'],
  ['list.item.copyPaste', 'list-enter', 'list', 'Copy and paste selected item', 'normal', { macroSettleAfterMs: PASTE_COMMAND_SETTLE_AFTER_MS }],
  ['list.item.copyPasteAndLock', 'list-ctrl-enter', 'list', 'Copy, paste, and lock selected item', 'data-write', { macroSettleAfterMs: PASTE_COMMAND_SETTLE_AFTER_MS }],
  ['list.item.aliasPaste', 'list-save-by-alias', 'list', 'Paste selected item using alias', 'normal', { macroSettleAfterMs: PASTE_COMMAND_SETTLE_AFTER_MS }],
  ['list.item.copyOnly', 'list-copy', 'list', 'Copy selected item'],
  ['list.item.pinToggle', 'list-pin-toggle', 'list', 'Toggle selected item pin', 'data-write'],
  ['list.item.collectToggle', 'list-collect', 'list', 'Toggle selected item collection', 'data-write'],
  ['list.item.lockToggle', 'list-lock', 'list', 'Toggle selected item lock', 'data-write'],
  ['list.item.delete', 'list-delete', 'list', 'Delete selected item', 'data-write'],
  ['list.item.forceDelete', 'list-force-delete', 'list', 'Force delete selected item', 'data-write'],
  ['list.multi.toggleCurrent', 'list-space', 'list', 'Toggle current item in multi select'],
  ['list.preview.shift', 'list-shift', 'list', 'Preview item while Shift is held']
]

for (let i = 1; i <= 9; i += 1) {
  COMMAND_DEFINITIONS.push(
    [`drawer.select.${i}`, `drawer-select-${i}`, 'drawer', `Select drawer item ${i}`],
    [`main.tab.${i}`, `main-alt-tab-${i}`, 'main', `Switch to main tab ${i}`],
    [`list.quickCopy.${i}`, `list-quick-copy-${i}`, 'list', `Quick copy item ${i}`, 'normal', { macroSettleAfterMs: PASTE_COMMAND_SETTLE_AFTER_MS }],
    [`list.drawerSub.${i}`, `list-drawer-sub-${i}`, 'list', `Run drawer sub action ${i}`]
  )
}

export const COMMANDS = COMMAND_DEFINITIONS.map(([id, featureId, category, description, risk = 'normal', meta = {}]) => ({
  id,
  title: description,
  category,
  description,
  handler: featureId,
  source: 'system',
  risk,
  macroSettleAfterMs: Number.isFinite(Number(meta.macroSettleAfterMs))
    ? Math.max(0, Math.round(Number(meta.macroSettleAfterMs)))
    : 0
}))

export const FEATURE_COMMAND_MAP = COMMANDS.reduce((map, command) => {
  map[command.handler] = command.id
  return map
}, {})

const COMMAND_BY_ID = COMMANDS.reduce((map, command) => {
  map[command.id] = command
  return map
}, {})

export function getCommandById(commandId) {
  return COMMAND_BY_ID[commandId] || null
}

export function getCommandIdForFeature(featureId) {
  return FEATURE_COMMAND_MAP[featureId] || null
}

export function getDefaultWhenForBinding(binding) {
  if (!binding || typeof binding !== 'object') return ''
  if (Object.prototype.hasOwnProperty.call(binding, 'when') && typeof binding.when === 'string') return binding.when
  if (binding.layer === 'main' && binding.state === 'search') return 'mainFocus && searchActive'
  return LAYER_WHEN_MAP[binding.layer] || ''
}

export function toCommandAwareBinding(binding) {
  const features = Array.isArray(binding?.features) ? binding.features : [binding?.features].filter(Boolean)
  const commands = Array.isArray(binding?.commands) ? binding.commands : [binding?.commands].filter(Boolean)
  const defaultWhen = getDefaultWhenForBinding({ ...binding, when: binding?.defaultWhen })
  return {
    ...binding,
    commands: commands.length ? commands : features.map((featureId) => getCommandIdForFeature(featureId)).filter(Boolean),
    when: getDefaultWhenForBinding(binding),
    defaultWhen,
    source: binding?.source || 'system',
    weight: Number.isFinite(binding?.weight) ? binding.weight : 100
  }
}

export function toCommandAwareBindings(bindings) {
  return (bindings || []).map((binding) => toCommandAwareBinding(binding))
}
