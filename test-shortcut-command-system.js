const assert = require('assert')
const fs = require('fs')

async function main() {
  const {
    COMMANDS,
    FEATURE_COMMAND_MAP,
    getCommandById,
    getCommandIdForFeature,
    toCommandAwareBinding
  } = await import('./src/global/commandDefaults.js')
  const { evaluateWhenExpression } = await import('./src/global/whenExpression.js')
  const {
    buildWhenExpression,
    getWhenBuilderSummary,
    parseWhenToSelection
  } = await import('./src/global/whenBuilder.js')
  const { detectKeybindingConflicts, getShortcutCommandRowConflicts } = await import('./src/global/keybindingConflicts.js')
  const {
    applyShortcutOverrideValue,
    buildShortcutCommandRows,
    buildShortcutOverrideValue,
    disableShortcutOverride,
    filterShortcutCommandRows,
    findOperationShortcutRows,
    getOperationShortcutSummary,
    OPERATION_SHORTCUT_COMMANDS
  } = await import('./src/global/shortcutCommandRows.js')
  const {
    buildContextMenuDrawerOrderFromRows,
    buildContextMenuActionRows,
    buildDrawerMenuItems,
    getContextMenuActionByIndex,
    getContextMenuActionSummary
  } = await import('./src/global/contextMenuActions.js')
  const { eventLikeToShortcutId, isRecordableShortcutId } = await import('./src/global/shortcutRecorder.js')
  const {
    COMMAND_MACRO_MAX_DELAY_MS,
    buildCommandMacroCommand,
    buildCommandMacroDryRun,
    buildCommandMacroPlan,
    buildCommandMacroRunResult,
    executeCommandMacroPlan,
    normalizeCommandMacro,
    normalizeCommandMacroStepResult,
    validateCommandMacro,
    validateCommandMacroPlanExecutable
  } = await import('./src/global/commandMacro.js')
  const {
    COMMAND_MACRO_SCHEMA_SQL,
    CommandMacroRepository,
    buildCommandMacroRows,
    commandMacroRowsToDefinitions,
    createCommandMacroVersionHash
  } = await import('./src/storage/commandMacroRepository.js')
  const {
    COMMAND_MACRO_STORAGE_MODE_MEMORY,
    COMMAND_MACRO_STORAGE_MODE_SQLITE,
    getCommandMacroStorageBackend,
    getEffectiveCommandMacros,
    normalizeCommandMacroDrafts,
    saveCommandMacros
  } = await import('./src/global/commandMacroStore.js')
  const {
    getCommandMacroRuntimeState,
    getCommandMacroRuntimeSnapshot,
    isCommandMacroCancelRequested,
    requestCancelCommandMacroRun,
    setCommandMacroRuntimeState
  } = await import('./src/global/commandMacroRuntime.js')
  const { HOTKEY_BINDINGS, applyHotkeyOverride, getCommandAwareBindings } = await import('./src/global/hotkeyBindings.js')
  const {
    buildPinGroupRuntimeCache,
    composeQuickPasteTopItems,
    resolvePinGroupCacheCursorEntry,
    resolvePinGroupCursorEntry,
    resolvePinGroupCursorItem,
    resolvePinGroupItemsById,
    resolveQuickPastePinnedItem
  } = await import('./src/global/quickPasteSelection.js')
  const {
    SHORTCUT_STORAGE_MODE_SETTING,
    SHORTCUT_STORAGE_MODE_SQLITE,
    buildShortcutSettingsPayload,
    getEffectiveShortcutOverrides,
    getEffectiveShortcutBindings,
    getEffectiveShortcutCommandRows,
    getShortcutOverridesFromSetting,
    getShortcutStorageBackend,
    commandSnapshotRowsToMap,
    keybindingSnapshotRowsToBindings,
    normalizeShortcutOverrides,
    saveShortcutSettingsPayload
  } = await import('./src/global/shortcutStore.js')
  const {
    SHORTCUT_KEYBINDING_SCHEMA_SQL,
    buildShortcutCommandSnapshotRows,
    buildShortcutKeybindingSnapshotRows,
    buildShortcutOverrideRows,
    createShortcutOverrideMigrationHash,
    shortcutOverrideRowsToMap,
    SHORTCUT_OVERRIDE_MIGRATION_META_KEY,
    ShortcutKeybindingRepository
  } = await import('./src/storage/shortcutKeybindingRepository.js')
  const { resolveKeybinding } = await import('./src/global/keybindingResolver.js')
  const { buildHotkeyContextSnapshot, isEditableHotkeyTarget } = await import('./src/global/hotkeyContext.js')
  const {
    dispatch,
    getBindings,
    previewKeybindingResolution,
    registerCommand,
    registerCommandFeaturePair,
    registerCommandFeaturePairs,
    registerFeature,
    resolveLegacyBinding,
    setBindings,
    setMainState,
    unregisterCommand,
    unregisterFeature
  } = await import('./src/global/hotkeyRegistry.js')
  const { clearLayers } = await import('./src/global/hotkeyLayers.js')
  const initSqlJs = (await import('sql.js')).default

  let pluginEnterCallback = null
  globalThis.utools = {
    onPluginEnter: (callback) => {
      pluginEnterCallback = callback
    }
  }
  const {
    consumePendingPluginEnterAction,
    registerPluginEnterHandler
  } = await import(`./src/global/pluginEnterHandlers.js?test=${Date.now()}`)
  const pluginEnterCalls = []
  const disposePluginEnterA = registerPluginEnterHandler((action) => pluginEnterCalls.push(['a', action.code]))
  registerPluginEnterHandler((action) => pluginEnterCalls.push(['b', action.code]))
  assert.strictEqual(typeof pluginEnterCallback, 'function')
  pluginEnterCallback({ code: 'quick-paste-pin-group' })
  assert.deepStrictEqual(pluginEnterCalls, [
    ['a', 'quick-paste-pin-group'],
    ['b', 'quick-paste-pin-group']
  ])
  disposePluginEnterA()
  pluginEnterCallback({ code: 'quick-paste-top' })
  assert.deepStrictEqual(pluginEnterCalls, [
    ['a', 'quick-paste-pin-group'],
    ['b', 'quick-paste-pin-group'],
    ['b', 'quick-paste-top']
  ])
  assert.strictEqual(
    consumePendingPluginEnterAction((action) => action.code === 'clipboard'),
    null,
    'non quick-paste actions should not be pending'
  )
  assert.strictEqual(
    consumePendingPluginEnterAction((action) => action.code === 'quick-paste-top').code,
    'quick-paste-top',
    'quick-paste action should be consumable once by late handler'
  )
  assert.strictEqual(
    consumePendingPluginEnterAction((action) => action.code === 'quick-paste-top'),
    null,
    'consumed quick-paste action should not replay again'
  )
  assert.strictEqual(
    consumePendingPluginEnterAction((action) => action.code === 'quick-paste-pin-group').code,
    'quick-paste-pin-group',
    'older pending quick-paste action should remain available until consumed'
  )
  assert.strictEqual(
    consumePendingPluginEnterAction((action) => action.code === 'quick-paste-pin-group'),
    null,
    'pin group pending action should also consume once'
  )

  const { PASTE_COMMAND_SETTLE_AFTER_MS } = await import('./src/global/commandDefaults.js')
  assert.strictEqual(PASTE_COMMAND_SETTLE_AFTER_MS, 180, 'paste settle constant should be shared with macro commands')

  const nativePasteCalls = []
  globalThis.window = globalThis.window || {}
  globalThis.window.exports = {
    utools: {
      hideMainWindowPasteText: (text) => {
        nativePasteCalls.push(['text', text])
        return true
      },
      hideMainWindowPasteImage: (image) => {
        nativePasteCalls.push(['image', image])
        return true
      },
      hideMainWindowPasteFile: (paths) => {
        nativePasteCalls.push(['file', paths])
        return true
      },
      isMacOs: () => false
    },
    existsSync: () => false,
    sep: '/',
    Buffer: { from: (value) => value }
  }
  const { copyAndPasteAndExit } = await import(`./src/utils/index.js?nativePaste=${Date.now()}`)
  assert.strictEqual(
    copyAndPasteAndExit({ type: 'text', data: 'pinned-top' }, { useHideMainWindowPaste: true }),
    true,
    'quick paste should prefer hideMainWindowPasteText over simulateKeyboardTap'
  )
  assert.deepStrictEqual(nativePasteCalls, [['text', 'pinned-top']])

  let earlyMultiplexerCallback = null
  globalThis.utools = {
    onPluginEnter: (callback) => {
      earlyMultiplexerCallback = callback
    }
  }
  const earlyPluginEnterModule = await import(`./src/global/pluginEnterHandlers.js?early=${Date.now()}`)
  assert.strictEqual(earlyPluginEnterModule.installPluginEnterMultiplexer(), true)
  assert.strictEqual(typeof earlyMultiplexerCallback, 'function', 'early multiplexer should register onPluginEnter before handlers')
  earlyMultiplexerCallback({ code: 'quick-paste-top' })
  assert.strictEqual(
    earlyPluginEnterModule.consumePendingPluginEnterAction((action) => action.code === 'quick-paste-top').code,
    'quick-paste-top',
    'early multiplexer should queue quick-paste before runtime handler registers'
  )

  assert.ok(COMMANDS.length > 0, 'command defaults should not be empty')
  assert.strictEqual(getCommandIdForFeature('list-delete'), 'list.item.delete')
  assert.strictEqual(getCommandById('list.item.delete').risk, 'data-write')
  assert.strictEqual(getCommandIdForFeature('setting-scroll-up'), 'setting.scroll.up')
  assert.strictEqual(getCommandIdForFeature('setting-scroll-down'), 'setting.scroll.down')
  assert.strictEqual(getCommandIdForFeature('setting-tab-prev'), 'setting.tab.prev')
  assert.strictEqual(getCommandIdForFeature('setting-tab-next'), 'setting.tab.next')
  assert.strictEqual(getCommandIdForFeature('tag-edit-close'), 'tag.edit.close')
  assert.strictEqual(getCommandIdForFeature('tag-edit-focus-tab'), 'tag.edit.focus.next')
  assert.strictEqual(getCommandIdForFeature('tag-edit-block'), 'tag.edit.blockUnhandled')
  assert.strictEqual(getCommandById('tag.edit.save').risk, 'data-write')
  assert.strictEqual(getCommandIdForFeature('full-data-close'), 'preview.full.close')
  assert.strictEqual(getCommandIdForFeature('full-data-scroll-up'), 'preview.full.scroll.up')
  assert.strictEqual(getCommandIdForFeature('full-data-scroll-down'), 'preview.full.scroll.down')
  assert.strictEqual(getCommandIdForFeature('full-data-block'), 'preview.full.blockUnhandled')
  assert.strictEqual(getCommandIdForFeature('tag-search-close'), 'tag.search.close')
  assert.strictEqual(getCommandIdForFeature('tag-search-block'), 'tag.search.blockUnhandled')
  assert.strictEqual(getCommandIdForFeature('drawer-close'), 'drawer.close')
  assert.strictEqual(getCommandIdForFeature('drawer-nav-down'), 'drawer.navigate.down')
  assert.strictEqual(getCommandIdForFeature('drawer-nav-up'), 'drawer.navigate.up')
  assert.strictEqual(getCommandIdForFeature('drawer-select'), 'drawer.select')
  assert.strictEqual(getCommandIdForFeature('drawer-block'), 'drawer.blockUnhandled')
  for (let i = 1; i <= 9; i += 1) {
    assert.strictEqual(getCommandIdForFeature(`drawer-select-${i}`), `drawer.select.${i}`)
  }
  assert.strictEqual(getCommandIdForFeature('clear-dialog-close'), 'dialog.clear.close')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-1h'), 'dialog.clear.range.1h')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-5h'), 'dialog.clear.range.5h')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-8h'), 'dialog.clear.range.8h')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-24h'), 'dialog.clear.range.24h')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-7d'), 'dialog.clear.range.7d')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-range-all'), 'dialog.clear.range.all')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-arrow-nav'), 'dialog.clear.range.navigate')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-tab'), 'dialog.clear.focus.next')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-confirm'), 'dialog.clear.confirm')
  assert.strictEqual(getCommandIdForFeature('clear-dialog-block'), 'dialog.clear.blockUnhandled')
  assert.strictEqual(getCommandById('dialog.clear.confirm').risk, 'data-write')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-close'), 'pin.group.edit.close')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-nav-up'), 'pin.group.edit.navigate.up')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-nav-down'), 'pin.group.edit.navigate.down')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-toggle-select'), 'pin.group.edit.toggleSelect')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-up'), 'pin.group.edit.moveUp')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-down'), 'pin.group.edit.moveDown')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-clear'), 'pin.group.edit.clear')
  assert.strictEqual(getCommandIdForFeature('pin-group-edit-block'), 'pin.group.edit.blockUnhandled')
  assert.strictEqual(getCommandById('pin.group.edit.save').risk, 'data-write')
  assert.strictEqual(getCommandById('pin.group.edit.clear').risk, 'data-write')
  assert.strictEqual(getCommandIdForFeature('main-tab'), 'main.tab.next')
  assert.strictEqual(getCommandIdForFeature('main-tab-prev'), 'main.tab.prev')
  assert.strictEqual(getCommandIdForFeature('main-tab-next'), 'main.tab.nextExplicit')
  assert.strictEqual(getCommandIdForFeature('collect-sub-tab-next'), 'main.collectSubTab.next')
  assert.strictEqual(getCommandIdForFeature('collect-sub-tab-prev'), 'main.collectSubTab.prev')
  assert.strictEqual(getCommandIdForFeature('main-focus-search'), 'search.focus')
  assert.strictEqual(getCommandIdForFeature('main-open-setting'), 'main.setting.open')
  assert.strictEqual(getCommandIdForFeature('main-toggle-locked-search'), 'search.locked.toggle')
  assert.strictEqual(getCommandIdForFeature('main-escape'), 'main.escape')
  assert.strictEqual(getCommandIdForFeature('search-delete-normal'), 'search.results.delete')
  assert.strictEqual(getCommandIdForFeature('search-delete-force'), 'search.results.forceDelete')
  assert.strictEqual(getCommandIdForFeature('open-clear-dialog'), 'dialog.clear.open')
  assert.strictEqual(getCommandIdForFeature('tag-search'), 'tag.search.open')
  assert.strictEqual(getCommandIdForFeature('pin-group-open'), 'pin.group.open')
  assert.strictEqual(getCommandIdForFeature('list-nav-up'), 'list.navigate.up')
  assert.strictEqual(getCommandIdForFeature('list-nav-down'), 'list.navigate.down')
  assert.strictEqual(getCommandIdForFeature('list-page-up'), 'list.navigate.pageUp')
  assert.strictEqual(getCommandIdForFeature('list-page-down'), 'list.navigate.pageDown')
  assert.strictEqual(getCommandIdForFeature('list-nav-left'), 'list.navigate.left')
  assert.strictEqual(getCommandIdForFeature('list-scroll-to-top'), 'list.navigate.top')
  assert.strictEqual(getCommandIdForFeature('list-scroll-to-bottom'), 'list.navigate.bottom')
  assert.strictEqual(getCommandIdForFeature('text-preview-scroll-up'), 'list.preview.text.up')
  assert.strictEqual(getCommandIdForFeature('text-preview-scroll-down'), 'list.preview.text.down')
  assert.strictEqual(getCommandIdForFeature('image-preview-scroll-left'), 'list.preview.image.left')
  assert.strictEqual(getCommandIdForFeature('image-preview-scroll-right'), 'list.preview.image.right')
  assert.strictEqual(getCommandIdForFeature('list-view-full'), 'list.item.openFull')
  assert.strictEqual(getCommandIdForFeature('list-drawer-open'), 'list.item.openDrawer')
  assert.strictEqual(getCommandIdForFeature('list-shift'), 'list.preview.shift')
  assert.strictEqual(getCommandIdForFeature('list-space'), 'list.multi.toggleCurrent')
  assert.strictEqual(getCommandIdForFeature('list-copy'), 'list.item.copyOnly')
  assert.strictEqual(getCommandIdForFeature('list-enter'), 'list.item.copyPaste')
  assert.strictEqual(getCommandIdForFeature('list-save-by-alias'), 'list.item.aliasPaste')
  assert.strictEqual(getCommandIdForFeature('list-tag-edit'), 'list.item.editTagOrAlias')
  assert.strictEqual(getCommandIdForFeature('list-ctrl-enter'), 'list.item.copyPasteAndLock')
  assert.strictEqual(getCommandIdForFeature('list-pin-toggle'), 'list.item.pinToggle')
  assert.strictEqual(getCommandIdForFeature('list-collect'), 'list.item.collectToggle')
  assert.strictEqual(getCommandIdForFeature('list-lock'), 'list.item.lockToggle')
  assert.strictEqual(getCommandIdForFeature('list-delete'), 'list.item.delete')
  assert.strictEqual(getCommandIdForFeature('list-force-delete'), 'list.item.forceDelete')
  for (let i = 1; i <= 9; i += 1) {
    assert.strictEqual(getCommandIdForFeature(`list-quick-copy-${i}`), `list.quickCopy.${i}`)
    assert.strictEqual(getCommandIdForFeature(`list-drawer-sub-${i}`), `list.drawerSub.${i}`)
  }
  const quickPasteCurrent = { id: 'current', type: 'text', data: 'current' }
  const quickPastePinned = { id: 'pinned', type: 'text', data: 'pinned' }
  const quickPasteBase = { id: 'base', type: 'text', data: 'base' }
  assert.deepStrictEqual(
    composeQuickPasteTopItems({
      baseItems: [quickPasteCurrent, quickPasteBase],
      pinnedItems: [quickPastePinned],
    }).map((item) => item.id),
    ['pinned', 'current', 'base'],
    'visible top composition should prefer pinned items, then base items without duplicates'
  )
  assert.strictEqual(resolveQuickPastePinnedItem([quickPastePinned, quickPasteBase]).id, 'pinned')
  assert.strictEqual(resolveQuickPastePinnedItem([]), null)
  assert.strictEqual(resolveQuickPastePinnedItem([null, quickPasteBase]).id, 'base')
  assert.strictEqual(resolvePinGroupCursorItem([quickPastePinned, quickPasteBase], 99).item.id, 'base')
  assert.strictEqual(resolvePinGroupCursorItem([quickPastePinned, quickPasteBase], -1).item.id, 'pinned')
  assert.strictEqual(resolvePinGroupCursorItem([], 0).item, null)
  const pinGroupCursorEntry = resolvePinGroupCursorEntry(['missing', 'pinned', 'base'], {
    cursor: 0,
    knownItems: [quickPastePinned, quickPasteBase]
  })
  assert.strictEqual(pinGroupCursorEntry.item.id, 'pinned')
  assert.strictEqual(pinGroupCursorEntry.index, 1)
  assert.strictEqual(pinGroupCursorEntry.nextIndex, 2)
  const wrappedPinGroupCursorEntry = resolvePinGroupCursorEntry(['missing', 'pinned', 'base'], {
    cursor: 99,
    knownItems: [quickPastePinned, quickPasteBase]
  })
  assert.strictEqual(wrappedPinGroupCursorEntry.item.id, 'pinned')
  assert.strictEqual(wrappedPinGroupCursorEntry.nextIndex, 2)
  assert.deepStrictEqual(
    resolvePinGroupItemsById(['missing-cache', '__ez_pin_group__', 'pinned', 'missing-cache'], {
      knownItems: [quickPastePinned],
      getItemById: (id) => (id === 'missing-cache' ? { id, type: 'text', data: 'from-repository' } : null)
    }).map((item) => item.id),
    ['missing-cache', 'pinned'],
    'pin group should resolve ids from repository fallback and ignore synthetic group rows'
  )
  let pinGroupCacheFallbackReads = 0
  const pinGroupRuntimeCache = buildPinGroupRuntimeCache(['missing-cache', 'unsupported', 'pinned', 'base'], {
    cursor: 1,
    knownItems: [{ id: 'unsupported', type: 'unknown', data: 'skip' }, quickPastePinned, quickPasteBase],
    getItemById: (id) => {
      pinGroupCacheFallbackReads += 1
      return id === 'missing-cache' ? { id, type: 'text', data: 'cached-from-repository' } : null
    }
  })
  assert.strictEqual(pinGroupCacheFallbackReads, 1)
  assert.deepStrictEqual(
    pinGroupRuntimeCache.entries.map((entry) => [entry.type, entry.value.id, entry.sourceIndex]),
    [
      ['clipboard-item', 'missing-cache', 0],
      ['clipboard-item', 'pinned', 2],
      ['clipboard-item', 'base', 3]
    ],
    'pin group runtime cache should store one pasteable clipboard item per entry'
  )
  assert.deepStrictEqual(
    [
      resolvePinGroupCacheCursorEntry(pinGroupRuntimeCache, { cursor: 1 }),
      resolvePinGroupCacheCursorEntry(pinGroupRuntimeCache, { cursor: 2 }),
      resolvePinGroupCacheCursorEntry(pinGroupRuntimeCache, { cursor: 99 })
    ].map((entry) => [entry.item.id, entry.index, entry.nextIndex]),
    [
      ['pinned', 2, 3],
      ['pinned', 2, 3],
      ['missing-cache', 0, 2]
    ],
    'pin group runtime cache should cycle without resolving items again'
  )
  assert.strictEqual(pinGroupCacheFallbackReads, 1)
  const expectedDataWriteCommands = [
    'dialog.clear.confirm',
    'tag.edit.save',
    'pin.group.edit.save',
    'pin.group.edit.clear',
    'search.results.delete',
    'search.results.forceDelete',
    'list.item.editTagOrAlias',
    'list.item.copyPasteAndLock',
    'list.item.pinToggle',
    'list.item.collectToggle',
    'list.item.lockToggle',
    'list.item.delete',
    'list.item.forceDelete'
  ]
  assert.deepStrictEqual(
    COMMANDS.filter((command) => command.risk === 'data-write').map((command) => command.id).sort(),
    expectedDataWriteCommands.slice().sort(),
    'data-write command set should stay explicit'
  )
  assert.deepStrictEqual(
    normalizeCommandMacro({
      id: ' macro.open ',
      title: ' Open ',
      mode: 'parallel',
      steps: [
        { command: ' main.setting.open ', delayMs: 8.8, args: { source: 'test' } },
        { command: 'setting.tab.next', delayMs: COMMAND_MACRO_MAX_DELAY_MS + 1 },
        { command: 'ignored.extra', delayMs: 1 },
        { command: 'ignored.extra.2', delayMs: 1 },
        { command: 'ignored.extra.3', delayMs: 1 },
        { command: 'ignored.extra.4', delayMs: 1 },
        { command: 'ignored.extra.5', delayMs: 1 },
        { command: 'ignored.extra.6', delayMs: 1 },
        { command: 'ignored.extra.7', delayMs: 1 },
        { command: 'ignored.extra.8', delayMs: 1 },
        { command: 'ignored.extra.9', delayMs: 1 },
        { command: 'ignored.extra.10', delayMs: 1 },
        { command: 'ignored.extra.11', delayMs: 1 }
      ]
    }),
    {
      id: 'macro.open',
      title: 'Open',
      shortcutId: '',
      when: 'mainFocus',
      mode: 'sequence',
      steps: [
        { command: 'main.setting.open', delayMs: 9, args: { source: 'test' } },
        { command: 'setting.tab.next', delayMs: COMMAND_MACRO_MAX_DELAY_MS, args: {} },
        { command: 'ignored.extra', delayMs: 1, args: {} },
        { command: 'ignored.extra.2', delayMs: 1, args: {} },
        { command: 'ignored.extra.3', delayMs: 1, args: {} },
        { command: 'ignored.extra.4', delayMs: 1, args: {} },
        { command: 'ignored.extra.5', delayMs: 1, args: {} },
        { command: 'ignored.extra.6', delayMs: 1, args: {} },
        { command: 'ignored.extra.7', delayMs: 1, args: {} },
        { command: 'ignored.extra.8', delayMs: 1, args: {} },
        { command: 'ignored.extra.9', delayMs: 1, args: {} },
        { command: 'ignored.extra.10', delayMs: 1, args: {} }
      ]
    },
    'command macro normalization should trim ids, force sequence mode, clamp delay and cap step count'
  )
  assert.deepStrictEqual(
    validateCommandMacro({ id: 'bad', steps: [{ command: 'unknown.command' }] }).errors.map((error) => error.field),
    ['id', 'steps.0.command'],
    'command macro validation should reject invalid ids and unknown commands'
  )
  assert.strictEqual(
    validateCommandMacro({ id: 'macro.delete', steps: [{ command: 'list.item.delete' }] }).ok,
    false,
    'command macro validation should reject data-write commands by default'
  )
  const macroCommandResult = buildCommandMacroCommand({
    id: 'macro.openSetting',
    steps: [{ command: 'main.setting.open' }, { command: 'setting.tab.next', delayMs: 120 }]
  })
  assert.strictEqual(macroCommandResult.ok, true)
  assert.strictEqual(macroCommandResult.command.id, 'macro.openSetting')
  assert.strictEqual(macroCommandResult.command.category, 'macro')
  assert.strictEqual(macroCommandResult.command.risk, 'macro')
  assert.deepStrictEqual(
    buildCommandMacroPlan({
      id: 'macro.openSetting',
      steps: [{ command: 'main.setting.open', delayMs: 10 }, { command: 'setting.tab.next', delayMs: 120 }]
    }).plan,
    {
      id: 'macro.openSetting',
      mode: 'sequence',
      totalDelayMs: 130,
      hasDataWrite: false,
      risks: ['normal'],
      steps: [
        {
          index: 0,
          commandId: 'main.setting.open',
          title: 'Open settings',
          risk: 'normal',
          delayMs: 10,
          settleAfterMs: 0,
          elapsedMs: 10,
          args: {}
        },
        {
          index: 1,
          commandId: 'setting.tab.next',
          title: 'Next setting tab',
          risk: 'normal',
          delayMs: 120,
          settleAfterMs: 0,
          elapsedMs: 130,
          args: {}
        }
      ]
    },
    'command macro plan should include ordered steps, elapsed delay and risk summary'
  )
  const pasteMacroPlan = buildCommandMacroPlan({
    id: 'macro.pasteThenMove',
    steps: [{ command: 'list.item.copyPaste' }, { command: 'list.navigate.down' }]
  })
  assert.deepStrictEqual(
    pasteMacroPlan.plan.steps.map((step) => [step.commandId, step.delayMs, step.settleAfterMs]),
    [
      ['list.item.copyPaste', 0, 180],
      ['list.navigate.down', 0, 0]
    ],
    'paste-like macro steps should include a post-run settle delay before the next step'
  )
  const dataWriteMacroPlan = buildCommandMacroPlan(
    { id: 'macro.deleteAllowed', steps: [{ command: 'list.item.delete', delayMs: 5 }] },
    { allowDataWrite: true }
  )
  assert.strictEqual(dataWriteMacroPlan.ok, true)
  assert.strictEqual(dataWriteMacroPlan.plan.hasDataWrite, true)
  assert.deepStrictEqual(dataWriteMacroPlan.plan.risks, ['data-write'])
  assert.deepStrictEqual(
    validateCommandMacroPlanExecutable(macroCommandResult, {
      hasCommandHandler: (commandId) => commandId === 'main.setting.open'
    }).errors.map((error) => error.field),
    ['plan.id', 'steps'],
    'macro command metadata alone should not be treated as an execution plan'
  )
  assert.deepStrictEqual(
    validateCommandMacroPlanExecutable(buildCommandMacroPlan({
      id: 'macro.openSetting',
      steps: [{ command: 'main.setting.open' }, { command: 'setting.tab.next' }]
    }), {
      hasCommandHandler: (commandId) => commandId === 'main.setting.open'
    }).errors.map((error) => error.field),
    ['steps.1.commandId'],
    'macro executable validation should report missing command handlers by step'
  )
  assert.strictEqual(
    validateCommandMacroPlanExecutable(buildCommandMacroPlan({
      id: 'macro.openSetting',
      steps: [{ command: 'main.setting.open' }, { command: 'setting.tab.next' }]
    }), {
      hasCommandHandler: () => true
    }).ok,
    true,
    'macro executable validation should pass when all step handlers are registered'
  )
  const macroDryRunPlan = buildCommandMacroPlan({
    id: 'macro.openSetting',
    steps: [
      { command: 'main.setting.open', delayMs: 10, args: { via: 'macro' } },
      { command: 'setting.tab.next', delayMs: 120 }
    ]
  })
  const macroDryRun = buildCommandMacroDryRun(macroDryRunPlan, {
    startAtMs: 1000,
    hasCommandHandler: (commandId) => commandId === 'main.setting.open'
  })
  assert.strictEqual(macroDryRun.ok, false)
  assert.deepStrictEqual(macroDryRun.dryRun.steps.map((step) => [step.commandId, step.scheduledAtMs, step.status, step.reason]), [
    ['main.setting.open', 1010, 'scheduled', ''],
    ['setting.tab.next', 1130, 'blocked', 'missing-handler']
  ])
  assert.deepStrictEqual(macroDryRun.dryRun.steps[0].args, { via: 'macro' })
  assert.strictEqual(
    buildCommandMacroDryRun(macroDryRunPlan, { hasCommandHandler: () => true }).ok,
    true,
    'macro dry-run should pass when every planned step is executable'
  )
  assert.deepStrictEqual(
    normalizeCommandMacroStepResult({
      index: 2,
      commandId: 'main.setting.open',
      status: 'unknown',
      handled: true,
      error: new Error('ignored'),
      startedAtMs: '10',
      endedAtMs: '18'
    }),
    {
      index: 2,
      commandId: 'main.setting.open',
      status: 'completed',
      handled: true,
      error: 'Error: ignored',
      startedAtMs: 10,
      endedAtMs: 18
    },
    'macro step result normalization should use stable status and numeric timing'
  )
  assert.deepStrictEqual(
    buildCommandMacroRunResult(macroDryRunPlan, [
      { index: 0, commandId: 'main.setting.open', status: 'completed', handled: true, startedAtMs: 100, endedAtMs: 110 },
      { index: 1, commandId: 'setting.tab.next', status: 'failed', error: 'missing state', startedAtMs: 220, endedAtMs: 225 }
    ]),
    {
      id: 'macro.openSetting',
      status: 'failed',
      handled: true,
      failedAt: 1,
      cancelledAt: -1,
      startedAtMs: 100,
      endedAtMs: 225,
      durationMs: 125,
      steps: [
        { index: 0, commandId: 'main.setting.open', status: 'completed', handled: true, error: '', startedAtMs: 100, endedAtMs: 110 },
        { index: 1, commandId: 'setting.tab.next', status: 'failed', handled: false, error: 'missing state', startedAtMs: 220, endedAtMs: 225 }
      ]
    },
    'macro run result should aggregate failed status, handled flag and timing'
  )
  assert.strictEqual(
    buildCommandMacroRunResult(macroDryRunPlan, [
      { index: 0, commandId: 'main.setting.open', status: 'cancelled', startedAtMs: 10, endedAtMs: 10 }
    ]).status,
    'cancelled',
    'macro run result should surface cancelled status when no step failed'
  )
  const macroExecutionTrace = []
  let macroNow = 100
  const successfulMacroExecution = await executeCommandMacroPlan(macroDryRunPlan, {
    hasCommandHandler: () => true,
    now: () => {
      macroNow += 5
      return macroNow
    },
    wait: async (delayMs, step) => {
      macroExecutionTrace.push(['wait', step.commandId, delayMs])
    },
    runCommand: async (commandId, args, step) => {
      macroExecutionTrace.push(['run', commandId, args, step.index])
      return { handled: commandId === 'main.setting.open' }
    }
  })
  assert.strictEqual(successfulMacroExecution.ok, true)
  assert.deepStrictEqual(macroExecutionTrace, [
    ['wait', 'main.setting.open', 10],
    ['run', 'main.setting.open', { via: 'macro' }, 0],
    ['wait', 'setting.tab.next', 120],
    ['run', 'setting.tab.next', {}, 1]
  ])
  assert.deepStrictEqual(
    successfulMacroExecution.result.steps.map((step) => [step.commandId, step.status, step.handled]),
    [
      ['main.setting.open', 'completed', true],
      ['setting.tab.next', 'completed', false]
    ],
    'macro executor should run injected handlers sequentially and aggregate results'
  )
  const pasteMacroExecutionTrace = []
  const successfulPasteMacroExecution = await executeCommandMacroPlan(pasteMacroPlan, {
    hasCommandHandler: () => true,
    now: () => 1,
    wait: async (delayMs, step, phase) => {
      pasteMacroExecutionTrace.push(['wait', step.commandId, delayMs, phase])
    },
    runCommand: async (commandId) => {
      pasteMacroExecutionTrace.push(['run', commandId])
      return { handled: true }
    }
  })
  assert.strictEqual(successfulPasteMacroExecution.ok, true)
  assert.deepStrictEqual(
    pasteMacroExecutionTrace,
    [
      ['run', 'list.item.copyPaste'],
      ['wait', 'list.item.copyPaste', 180, 'settle'],
      ['run', 'list.navigate.down']
    ],
    'macro executor should wait after paste-like steps so the next command does not race clipboard paste'
  )
  const failedMacroExecution = await executeCommandMacroPlan(macroDryRunPlan, {
    hasCommandHandler: () => true,
    now: () => 1,
    runCommand: async (commandId) => {
      if (commandId === 'setting.tab.next') throw new Error('boom')
      return { handled: true }
    }
  })
  assert.strictEqual(failedMacroExecution.ok, false)
  assert.strictEqual(failedMacroExecution.result.status, 'failed')
  assert.strictEqual(failedMacroExecution.result.failedAt, 1)
  assert.strictEqual(failedMacroExecution.result.steps[1].error, 'boom')
  const stepCallbacks = []
  const cancelledMacroExecution = await executeCommandMacroPlan(macroDryRunPlan, {
    hasCommandHandler: () => true,
    now: () => 10,
    shouldCancel: (step) => step.index === 1,
    onStepStart: (step) => stepCallbacks.push(['start', step.index]),
    onStepEnd: (stepResult) => stepCallbacks.push(['end', stepResult.index, stepResult.status]),
    runCommand: async () => ({ handled: true })
  })
  assert.strictEqual(cancelledMacroExecution.ok, false)
  assert.strictEqual(cancelledMacroExecution.result.status, 'cancelled')
  assert.deepStrictEqual(
    cancelledMacroExecution.result.steps.map((step) => [step.index, step.status]),
    [[0, 'completed'], [1, 'cancelled']],
    'macro executor should support cancellation between serial steps'
  )
  assert.deepStrictEqual(stepCallbacks, [['start', 0], ['end', 0, 'completed']])
  const missingHandlerMacroExecution = await executeCommandMacroPlan(macroDryRunPlan, {
    hasCommandHandler: (commandId) => commandId === 'main.setting.open',
    runCommand: async () => {
      throw new Error('unexpected run')
    }
  })
  assert.strictEqual(missingHandlerMacroExecution.ok, false)
  assert.deepStrictEqual(
    missingHandlerMacroExecution.result.steps.map((step) => [step.commandId, step.status, step.error]),
    [
      ['main.setting.open', 'skipped', ''],
      ['setting.tab.next', 'failed', 'missing-handler']
    ],
    'macro executor should not run when executable validation fails'
  )
  assert.ok(
    COMMAND_MACRO_SCHEMA_SQL.includes('command_macro_definitions') &&
      COMMAND_MACRO_SCHEMA_SQL.includes('command_macro_steps'),
    'macro repository should declare independent definition and step tables'
  )
  const macroRowsResult = buildCommandMacroRows(
    [
      {
        id: 'macro.openSetting',
        title: 'Open settings flow',
        shortcutId: 'ctrl+shift+o',
        when: 'mainFocus && !inputFocus',
        steps: [
          { command: 'main.setting.open', delayMs: 10, args: { source: 'test', nested: { stable: true } } },
          { command: 'setting.tab.next', delayMs: 120 }
        ]
      },
      {
        id: 'macro.bad',
        steps: [{ command: 'unknown.command' }]
      }
    ],
    { timestamp: 1234 }
  )
  assert.strictEqual(macroRowsResult.ok, false)
  assert.deepStrictEqual(
    macroRowsResult.rows.definitions.map((row) => [row.macroId, row.title, row.shortcutId, row.when, row.mode, row.enabled, row.updatedAt]),
    [['macro.openSetting', 'Open settings flow', 'ctrl+shift+o', 'mainFocus && !inputFocus', 'sequence', 1, 1234]],
    'macro row builder should persist only valid macro definitions and keep invalid macros in errors'
  )
  assert.deepStrictEqual(
    macroRowsResult.rows.steps.map((row) => [row.macroId, row.stepIndex, row.commandId, row.delayMs, row.argsJson]),
    [
      ['macro.openSetting', 0, 'main.setting.open', 10, '{"source":"test","nested":{"stable":true}}'],
      ['macro.openSetting', 1, 'setting.tab.next', 120, '{}']
    ],
    'macro row builder should persist ordered steps and args json'
  )
  assert.strictEqual(macroRowsResult.errors[0].id, 'macro.bad')
  assert.deepStrictEqual(
    commandMacroRowsToDefinitions(
      macroRowsResult.rows.definitions,
      [
        macroRowsResult.rows.steps[1],
        macroRowsResult.rows.steps[0],
        { macroId: 'macro.openSetting', stepIndex: 99, commandId: '', argsJson: '{broken' },
        { macroId: '', stepIndex: 0, commandId: 'ignored' }
      ]
    ),
    [
      {
        id: 'macro.openSetting',
        title: 'Open settings flow',
        shortcutId: 'ctrl+shift+o',
        when: 'mainFocus && !inputFocus',
        mode: 'sequence',
        steps: [
          { command: 'main.setting.open', delayMs: 10, args: { source: 'test', nested: { stable: true } } },
          { command: 'setting.tab.next', delayMs: 120, args: {} },
          { command: '', delayMs: 0, args: {} }
        ]
      }
    ],
    'macro row reader should restore sorted steps and tolerate broken args json'
  )
  assert.strictEqual(
    createCommandMacroVersionHash({
      id: 'macro.hash',
      steps: [{ command: 'main.setting.open', args: { b: 2, a: 1 } }]
    }),
    createCommandMacroVersionHash({
      steps: [{ args: { a: 1, b: 2 }, command: 'main.setting.open' }],
      id: 'macro.hash'
    }),
    'macro version hash should be stable across object key order'
  )
  function createFakeCommandMacroDb() {
    const store = {
      runs: [],
      definitions: [],
      steps: []
    }
    return {
      store,
      run(sql, params = {}) {
        store.runs.push({ sql, params })
        if (sql.includes('INSERT OR REPLACE INTO command_macro_definitions')) {
          const row = {
            macro_id: params.$macro_id,
            title: params.$title,
            shortcut_id: params.$shortcut_id,
            when_expr: params.$when_expr,
            mode: params.$mode,
            enabled: params.$enabled,
            version_hash: params.$version_hash,
            updated_at: params.$updated_at
          }
          const index = store.definitions.findIndex((item) => item.macro_id === row.macro_id)
          if (index >= 0) store.definitions[index] = row
          else store.definitions.push(row)
        }
        if (sql.includes('INSERT OR REPLACE INTO command_macro_steps')) {
          const row = {
            macro_id: params.$macro_id,
            step_index: params.$step_index,
            command_id: params.$command_id,
            delay_ms: params.$delay_ms,
            args_json: params.$args_json
          }
          const index = store.steps.findIndex(
            (item) => item.macro_id === row.macro_id && item.step_index === row.step_index
          )
          if (index >= 0) store.steps[index] = row
          else store.steps.push(row)
        }
        if (sql.includes('DELETE FROM command_macro_steps')) {
          store.steps = params.$macro_id
            ? store.steps.filter((row) => row.macro_id !== params.$macro_id)
            : []
        }
        if (sql.includes('DELETE FROM command_macro_definitions')) {
          store.definitions = params.$macro_id
            ? store.definitions.filter((row) => row.macro_id !== params.$macro_id)
            : []
        }
      },
      prepare(sql) {
        let rows = []
        let initialized = false
        return {
          step() {
            if (!initialized) {
              if (sql.includes('FROM command_macro_definitions')) {
                rows = store.definitions.slice().sort((a, b) => a.macro_id.localeCompare(b.macro_id))
              } else if (sql.includes('FROM command_macro_steps')) {
                rows = store.steps.slice().sort((a, b) => {
                  const macroSort = a.macro_id.localeCompare(b.macro_id)
                  return macroSort || a.step_index - b.step_index
                })
              }
              initialized = true
            }
            return rows.length > 0
          },
          getAsObject() {
            return rows.shift() || {}
          },
          free() {}
        }
      }
    }
  }
  const fakeMacroDb = createFakeCommandMacroDb()
  const fakeMacroRepository = new CommandMacroRepository(fakeMacroDb)
  fakeMacroRepository.ensureSchema()
  assert.deepStrictEqual(fakeMacroDb.store.runs.map((item) => item.sql), [
    COMMAND_MACRO_SCHEMA_SQL,
    "ALTER TABLE command_macro_definitions ADD COLUMN shortcut_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE command_macro_definitions ADD COLUMN when_expr TEXT NOT NULL DEFAULT 'mainFocus'"
  ])
  assert.strictEqual(fakeMacroRepository.upsertMacroRows(macroRowsResult.rows), true)
  assert.deepStrictEqual(
    fakeMacroRepository.getMacroDefinitions(),
    [
      {
        id: 'macro.openSetting',
        title: 'Open settings flow',
        shortcutId: 'ctrl+shift+o',
        when: 'mainFocus && !inputFocus',
        mode: 'sequence',
        steps: [
          { command: 'main.setting.open', delayMs: 10, args: { source: 'test', nested: { stable: true } } },
          { command: 'setting.tab.next', delayMs: 120, args: {} }
        ]
      }
    ],
    'macro repository should read fake DB rows back as normalized macro definitions'
  )
  assert.strictEqual(fakeMacroRepository.deleteMacro('macro.openSetting'), true)
  assert.deepStrictEqual(fakeMacroRepository.getMacroDefinitions(), [])
  assert.strictEqual(getCommandMacroStorageBackend({}), null)
  assert.strictEqual(getCommandMacroStorageBackend({ commandMacros: fakeMacroRepository }), fakeMacroRepository)
  assert.deepStrictEqual(
    normalizeCommandMacroDrafts([{ id: 'macro.keep', steps: [] }, null, 'ignored']),
    [{ id: 'macro.keep', steps: [] }],
    'macro store should keep only object drafts for fallback state'
  )
  assert.strictEqual(getCommandMacroRuntimeState('macro.runtime'), null)
  setCommandMacroRuntimeState('macro.runtime', {
    runId: 'run-1',
    title: 'Runtime macro',
    status: 'running',
    currentStep: 0,
    totalSteps: 2
  })
  assert.strictEqual(getCommandMacroRuntimeState('macro.runtime').status, 'running')
  assert.strictEqual(requestCancelCommandMacroRun('macro.runtime'), true)
  assert.strictEqual(isCommandMacroCancelRequested('macro.runtime', 'run-1'), true)
  assert.strictEqual(isCommandMacroCancelRequested('macro.runtime', 'old-run'), true)
  assert.deepStrictEqual(
    getCommandMacroRuntimeSnapshot().filter((state) => state.macroId === 'macro.runtime').map((state) => state.status),
    ['cancelling'],
    'macro runtime state should expose cancellable running status'
  )
  fakeMacroRepository.upsertMacroRows(macroRowsResult.rows)
  assert.deepStrictEqual(
    getEffectiveCommandMacros({
      fallbackMacros: [{ id: 'macro.fallback', steps: [] }],
      backend: fakeMacroRepository,
      warn: () => {}
    }),
    {
      macros: [
        {
          id: 'macro.openSetting',
          title: 'Open settings flow',
          shortcutId: 'ctrl+shift+o',
          when: 'mainFocus && !inputFocus',
          mode: 'sequence',
          steps: [
            { command: 'main.setting.open', delayMs: 10, args: { source: 'test', nested: { stable: true } } },
            { command: 'setting.tab.next', delayMs: 120, args: {} }
          ]
        }
      ],
      storageMode: COMMAND_MACRO_STORAGE_MODE_SQLITE
    },
    'macro store should prefer SQLite backend definitions when readable'
  )
  assert.deepStrictEqual(
    getEffectiveCommandMacros({
      fallbackMacros: [{ id: 'macro.fallback', steps: [] }],
      backend: {
        getMacroDefinitions() {
          throw new Error('read failed')
        },
        replaceMacroRows() {},
        deleteMacro() {}
      },
      warn: () => {}
    }),
    {
      macros: [{ id: 'macro.fallback', steps: [] }],
      storageMode: COMMAND_MACRO_STORAGE_MODE_MEMORY
    },
    'macro store should fallback to memory drafts when SQLite read fails'
  )
  const macroPersistCalls = []
  const saveMacroResult = saveCommandMacros([
    {
      id: 'macro.saved',
      steps: [{ command: 'main.setting.open' }]
    }
  ], {
    backend: fakeMacroRepository,
    storageTarget: {
      queuePersist() {
        macroPersistCalls.push('persist')
      }
    },
    warn: () => {}
  })
  assert.strictEqual(saveMacroResult.ok, true)
  assert.strictEqual(saveMacroResult.storageMode, COMMAND_MACRO_STORAGE_MODE_SQLITE)
  assert.strictEqual(saveMacroResult.sqliteSaved, true)
  assert.deepStrictEqual(macroPersistCalls, ['persist'])
  assert.deepStrictEqual(fakeMacroRepository.getMacroDefinitions().map((macro) => macro.id), ['macro.saved'])
  const invalidMacroSaveResult = saveCommandMacros([
    { id: 'macro.invalid', steps: [{ command: 'unknown.command' }] }
  ], {
    backend: fakeMacroRepository,
    storageTarget: {
      queuePersist() {
        macroPersistCalls.push('unexpected')
      }
    },
    warn: () => {}
  })
  assert.strictEqual(invalidMacroSaveResult.ok, false)
  assert.strictEqual(invalidMacroSaveResult.sqliteSaved, false)
  assert.deepStrictEqual(fakeMacroRepository.getMacroDefinitions().map((macro) => macro.id), ['macro.saved'])
  assert.deepStrictEqual(macroPersistCalls, ['persist'])
  const failedMacroSaveResult = saveCommandMacros([
    { id: 'macro.memory', steps: [{ command: 'main.setting.open' }] }
  ], {
    backend: {
      replaceMacroRows() {
        throw new Error('write failed')
      },
      getMacroDefinitions() {
        return []
      },
      deleteMacro() {}
    },
    storageTarget: {
      queuePersist() {
        macroPersistCalls.push('unexpected')
      }
    },
    warn: () => {}
  })
  assert.strictEqual(failedMacroSaveResult.ok, true)
  assert.strictEqual(failedMacroSaveResult.storageMode, COMMAND_MACRO_STORAGE_MODE_MEMORY)
  assert.strictEqual(failedMacroSaveResult.sqliteSaved, false)
  assert.deepStrictEqual(macroPersistCalls, ['persist'])

  assert.ok(FEATURE_COMMAND_MAP['drawer-close'], 'existing drawer feature should map to a command')
  assert.ok(FEATURE_COMMAND_MAP['search-delete-normal'], 'existing search feature should map to a command')
  const hotkeyBindingsSource = fs.readFileSync('src/global/hotkeyBindings.js', 'utf8')
  const featureIds = new Set()
  for (const match of hotkeyBindingsSource.matchAll(/features:\s*\[([^\]]+)\]/g)) {
    for (const stringMatch of match[1].matchAll(/["']([^"']+)["']/g)) {
      featureIds.add(stringMatch[1])
    }
  }
  const missingFeatureMappings = [...featureIds].filter((featureId) => !FEATURE_COMMAND_MAP[featureId])
  assert.deepStrictEqual(missingFeatureMappings, [], 'all default feature ids should map to command ids')

  const deleteBinding = toCommandAwareBinding({
    layer: 'main',
    shortcutId: 'Delete',
    features: ['list-delete']
  })
  assert.ok(deleteBinding.commands.includes('list.item.delete'))
  assert.strictEqual(deleteBinding.when, 'mainFocus')
  const searchDeleteBinding = toCommandAwareBinding({
    layer: 'main',
    state: 'search',
    shortcutId: 'ctrl+Delete',
    features: ['search-delete-normal']
  })
  assert.strictEqual(searchDeleteBinding.when, 'mainFocus && searchActive')
  const drawerBinding = toCommandAwareBinding({
    layer: 'clip-drawer',
    shortcutId: 'Escape',
    features: ['drawer-close']
  })
  assert.strictEqual(drawerBinding.when, 'drawerOpen')

  assert.strictEqual(
    evaluateWhenExpression('mainFocus && !inputFocus', { mainFocus: true, inputFocus: false }),
    true
  )
  assert.strictEqual(
    evaluateWhenExpression('mainFocus && (searchActive || multiSelect)', {
      mainFocus: true,
      searchActive: false,
      multiSelect: true
    }),
    true
  )
  assert.strictEqual(
    evaluateWhenExpression("previewKind == 'image' && !inputFocus", {
      previewKind: 'text',
      inputFocus: false
    }),
    false
  )
  assert.throws(() => evaluateWhenExpression('mainFocus &&& inputFocus', {}), /Unexpected/)
  assert.deepStrictEqual(
    parseWhenToSelection('mainFocus && !inputFocus'),
    {
      ok: true,
      mode: 'builder',
      selection: {
        operator: '&&',
        states: {
          mainFocus: 'include',
          inputFocus: 'exclude'
        }
      }
    },
    'when builder should parse simple conjunctions into graphical state'
  )
  assert.strictEqual(
    buildWhenExpression({
      operator: '||',
      states: {
        drawerOpen: 'include',
        fullDataOpen: 'include'
      }
    }),
    'drawerOpen || fullDataOpen',
    'when builder should generate parser-compatible OR expressions'
  )
  assert.strictEqual(getWhenBuilderSummary('mainFocus && !inputFocus'), '主界面 且 非输入框聚焦')
  assert.strictEqual(parseWhenToSelection("previewKind == 'image'").mode, 'text')
  assert.deepStrictEqual(
    getShortcutCommandRowConflicts(
      { id: 'macro.openSetting', shortcutId: 'ctrl+shift+o', when: 'mainFocus', commandTitle: 'Open flow' },
      [
        { id: 'main.setting.open', shortcutId: 'ctrl+shift+o', when: 'mainFocus && !inputFocus', commandTitle: 'Open settings' },
        { id: 'setting.tab.next', shortcutId: 'ctrl+shift+o', when: 'settingFocus', commandTitle: 'Setting tab' }
      ]
    ).map((row) => row.id),
    ['main.setting.open'],
    'macro shortcut candidates should conflict with overlapping command rows and ignore mutually exclusive rows'
  )

  const conflicts = detectKeybindingConflicts(
    { id: 'user.delete', key: 'Delete', when: 'mainFocus && !inputFocus', source: 'user' },
    [
      { id: 'system.delete', key: 'Delete', when: 'mainFocus && !inputFocus', source: 'system' },
      { id: 'setting.deleteText', key: 'Delete', when: 'settingFocus && inputFocus', source: 'system' },
      { id: 'search.delete', key: 'Delete', when: 'mainFocus && searchActive', source: 'system' }
    ]
  )
  assert.deepStrictEqual(
    conflicts.map((item) => item.id),
    ['system.delete', 'search.delete'],
    'conflicts should include only keybindings whose when clauses can overlap'
  )

  const impossibleConflict = detectKeybindingConflicts(
    { id: 'user.combined', key: 'Enter', when: 'mainFocus && (searchActive || multiSelect)' },
    [
      { id: 'main.normal', key: 'Enter', when: 'mainFocus && !searchActive && !multiSelect' }
    ]
  )
  assert.deepStrictEqual(impossibleConflict, [], 'or branches should not conflict with an impossible opposite state')
  assert.deepStrictEqual(
    detectKeybindingConflicts(
      { id: 'setting.arrow', key: 'ArrowRight', when: 'settingFocus && !inputFocus' },
      [{ id: 'dialog.arrow', key: 'ArrowRight', when: 'clearDialogOpen' }]
    ),
    [],
    'setting focus should not conflict with overlay-only keybindings'
  )

  const commandRows = buildShortcutCommandRows([
    {
      layer: 'main',
      shortcutId: 'Delete',
      features: ['list-delete'],
      commands: ['list.item.delete'],
      when: 'mainFocus',
      source: 'system'
    },
    {
      layer: 'main',
      state: 'search',
      shortcutId: 'ctrl+Delete',
      features: ['search-delete-normal'],
      commands: ['search.results.delete'],
      when: 'mainFocus && searchActive',
      source: 'system'
    }
  ])
  assert.strictEqual(commandRows.length, 2)
  assert.strictEqual(commandRows[0].commandId, 'list.item.delete')
  assert.strictEqual(commandRows[0].scopeLabel, '主界面')
  assert.strictEqual(commandRows[0].sourceLabel, '系统')
  assert.strictEqual(commandRows[1].scopeLabel, '主界面（搜索中）')

  const disabledRows = buildShortcutCommandRows([
    {
      layer: 'main',
      shortcutId: 'Delete',
      defaultShortcutId: 'Delete',
      overrideKey: 'main::Delete:list-delete',
      features: ['list-delete'],
      commands: ['list.item.delete'],
      when: 'mainFocus',
      source: 'removed',
      disabled: true
    }
  ])
  assert.strictEqual(disabledRows[0].disabled, true)
  assert.strictEqual(disabledRows[0].sourceLabel, '已禁用')
  assert.strictEqual(disabledRows[0].defaultShortcutId, 'Delete')
  assert.strictEqual(disabledRows[0].overrideKey, 'main::Delete:list-delete')

  const allShortcutRows = buildShortcutCommandRows(getCommandAwareBindings(HOTKEY_BINDINGS))
  assert.ok(
    allShortcutRows.some((row) => row.commandId === 'setting.scroll.up'),
    'settings shortcut table should include setting-page command bindings'
  )
  assert.ok(
    allShortcutRows.some((row) => row.commandId === 'list.navigate.up'),
    'settings shortcut table should include base list navigation command bindings'
  )
  assert.ok(
    filterShortcutCommandRows(allShortcutRows, {
      keyword: 'setting.scroll',
      scope: 'all',
      formatShortcut: (shortcutId) => shortcutId
    }).some((row) => row.commandId === 'setting.scroll.up'),
    'keyword filtering should find setting-page command ids'
  )
  assert.deepStrictEqual(
    filterShortcutCommandRows(disabledRows, { scope: 'user' }).map((row) => row.commandId),
    ['list.item.delete'],
    'modified scope should include disabled shortcut rows'
  )
  assert.deepStrictEqual(
    findOperationShortcutRows('remove', allShortcutRows).map((row) => row.commandId),
    ['list.item.delete', 'list.item.delete'],
    'feature settings should map remove operation to all delete shortcut command rows'
  )
  const removeShortcutSummary = getOperationShortcutSummary('remove', allShortcutRows, (shortcutId) => shortcutId)
  assert.strictEqual(removeShortcutSummary.query, 'list.item.delete')
  assert.strictEqual(removeShortcutSummary.count, 2)
  assert.strictEqual(removeShortcutSummary.label, 'Delete / Backspace')
  assert.strictEqual(removeShortcutSummary.hint, '点击查看或修改对应 command 快捷键')
  for (const [operationId, commandIds] of Object.entries(OPERATION_SHORTCUT_COMMANDS)) {
    assert.ok(commandIds.length, `operation ${operationId} should map to at least one shortcut command`)
    for (const commandId of commandIds) {
      assert.ok(getCommandById(commandId), `operation ${operationId} maps to an unknown command ${commandId}`)
    }
  }
  const editTagsShortcutSummary = getOperationShortcutSummary('edit-tags', allShortcutRows, (shortcutId) => shortcutId)
  assert.strictEqual(editTagsShortcutSummary.query, 'list.item.editTagOrAlias')
  assert.strictEqual(editTagsShortcutSummary.label, 'F2')
  assert.deepStrictEqual(
    getOperationShortcutSummary('word-break', allShortcutRows, (shortcutId) => shortcutId),
    {
      count: 0,
      activeCount: 0,
      label: '无直接快捷键',
      query: '',
      hint: '可通过功能按钮或动态抽屉序号执行'
    },
    'feature settings should keep operations without shortcut commands explicit'
  )
  assert.deepStrictEqual(
    getOperationShortcutSummary('save-file', allShortcutRows, (shortcutId) => shortcutId),
    {
      count: 0,
      activeCount: 0,
      label: '无直接快捷键',
      query: '',
      hint: '可通过功能按钮或动态抽屉序号执行'
    },
    'feature settings should not claim save-file uses copy-only shortcut'
  )
  assert.deepStrictEqual(
    getOperationShortcutSummary('open-folder', allShortcutRows, (shortcutId) => shortcutId),
    {
      count: 0,
      activeCount: 0,
      label: '无直接快捷键',
      query: '',
      hint: '可通过功能按钮或动态抽屉序号执行'
    },
    'feature settings should keep drawer-only operations separate from direct shortcut bindings'
  )

  const contextMenuOperations = [
    { id: 'copy', title: '复制', icon: 'C' },
    { id: 'collect', title: '收藏', icon: 'S' },
    { id: 'remove', title: '删除', icon: 'D' }
  ]
  const visibleContextMenuItems = buildDrawerMenuItems({
    item: { id: 'clip-1', type: 'text' },
    operations: contextMenuOperations,
    filterOperate: (operation) => operation.id !== 'remove',
    drawerOrder: ['collect', 'copy']
  })
  assert.deepStrictEqual(
    visibleContextMenuItems.map((item) => item.id),
    ['collect', 'edit-alias', 'copy'],
    'drawer menu should keep user order, filter invisible operations and insert alias action at position 2'
  )
  assert.strictEqual(visibleContextMenuItems[1].commandId, 'list.item.editTagOrAlias')
  assert.strictEqual(visibleContextMenuItems[1].orderable, false)
  assert.deepStrictEqual(
    getContextMenuActionByIndex(visibleContextMenuItems, 2),
    { ok: true, action: visibleContextMenuItems[1], index: 1, number: 2 },
    'context menu model should resolve one-based number selection to the same action object'
  )
  assert.deepStrictEqual(
    getContextMenuActionByIndex(visibleContextMenuItems, 4),
    { ok: false, action: null, index: 3, number: 4, reason: 'out-of-range' },
    'context menu model should report out-of-range number selection consistently'
  )
  assert.deepStrictEqual(
    buildDrawerMenuItems({ item: null, operations: contextMenuOperations }).map((item) => item.id),
    [],
    'drawer menu should be empty without an active item'
  )

  const contextMenuActionRows = buildContextMenuActionRows({
    operations: contextMenuOperations,
    drawerOrder: ['collect', 'copy'],
    shortcutRows: allShortcutRows
  })
  assert.deepStrictEqual(
    contextMenuActionRows.map((row) => `${row.currentIndex}:${row.id}`),
    ['1:collect', '2:edit-alias', '3:copy', '4:remove'],
    'context menu setting rows should expose the same ordered action model as the drawer'
  )
  assert.strictEqual(contextMenuActionRows.find((row) => row.id === 'remove').risk, 'data-write')
  assert.strictEqual(contextMenuActionRows.find((row) => row.id === 'edit-alias').shortcutSummary.query, 'list.item.editTagOrAlias')
  assert.strictEqual(getContextMenuActionSummary(contextMenuActionRows), '右键菜单 4 项，4 项可直接跳转到 command 快捷键。')
  assert.deepStrictEqual(
    buildContextMenuDrawerOrderFromRows([
      { id: 'remove', orderable: true },
      { id: 'edit-alias', orderable: false },
      { id: 'copy', orderable: true }
    ]),
    ['remove', 'copy'],
    'context menu drawer order should persist only orderable operation ids and keep alias fixed by insertion rule'
  )

  const commandRowConflicts = getShortcutCommandRowConflicts(
    {
      id: 'main:normal:Delete:list.item.delete',
      shortcutId: 'Delete',
      when: 'mainFocus && !searchActive',
      commandId: 'list.item.delete'
    },
    [
      {
        id: 'main:search:Delete:search.results.delete',
        shortcutId: 'Delete',
        when: 'mainFocus && searchActive',
        commandId: 'search.results.delete'
      },
      {
        id: 'main:normal:Delete:list.item.forceDelete',
        shortcutId: 'Delete',
        when: 'mainFocus && !searchActive',
        commandId: 'list.item.forceDelete'
      },
      {
        id: 'main:disabled:Delete:list.item.copyOnly',
        shortcutId: 'Delete',
        when: 'mainFocus && !searchActive',
        commandId: 'list.item.copyOnly',
        disabled: true
      }
    ]
  )
  assert.deepStrictEqual(
    commandRowConflicts.map((row) => row.commandId),
    ['list.item.forceDelete'],
    'command row conflict helper should ignore disabled and mutually exclusive when rows'
  )

  const overrideRow = {
    shortcutId: 'Delete',
    when: 'mainFocus',
    defaultShortcutId: 'Delete',
    defaultWhen: 'mainFocus'
  }
  assert.deepStrictEqual(
    buildShortcutOverrideValue(overrideRow, { shortcutId: 'ctrl+d' }),
    { shortcutId: 'ctrl+d' },
    'shortcut override should store only non-default key'
  )
  assert.deepStrictEqual(
    buildShortcutOverrideValue(overrideRow, { when: ' mainFocus && !inputFocus ' }),
    { when: 'mainFocus && !inputFocus' },
    'when override should trim and store only non-default when'
  )
  assert.deepStrictEqual(
    buildShortcutOverrideValue(
      { ...overrideRow, shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' },
      { shortcutId: 'Delete', when: 'mainFocus' }
    ),
    undefined,
    'restoring key and when to defaults should remove override'
  )
  const overrideKeyRow = { ...overrideRow, overrideKey: 'main::Delete:list-delete' }
  assert.deepStrictEqual(
    applyShortcutOverrideValue({ other: 'keep' }, overrideKeyRow, { shortcutId: 'ctrl+d' }),
    { other: 'keep', 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } },
    'override map helper should set row override by overrideKey'
  )
  assert.deepStrictEqual(
    applyShortcutOverrideValue({ other: 'keep', 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } }, overrideKeyRow, undefined),
    { other: 'keep' },
    'override map helper should delete row override when value is undefined'
  )
  assert.deepStrictEqual(
    disableShortcutOverride({ other: 'keep' }, overrideKeyRow),
    { other: 'keep', 'main::Delete:list-delete': null },
    'disable helper should store null override for row'
  )
  assert.deepStrictEqual(
    applyShortcutOverrideValue({ other: 'keep' }, { ...overrideRow, overrideKey: '' }, { shortcutId: 'ctrl+d' }),
    { other: 'keep' },
    'override map helper should ignore rows without overrideKey'
  )
  assert.deepStrictEqual(
    normalizeShortcutOverrides({
      'main::Delete:list-delete': null,
      'setting::ArrowUp:setting-scroll-up': 'ctrl+u',
      'main::Enter:list-enter': { shortcutId: 'ctrl+Enter', when: 'mainFocus && !inputFocus' },
      ignoredUndefined: undefined,
      ignoredArray: ['ctrl+x']
    }),
    {
      'main::Delete:list-delete': null,
      'setting::ArrowUp:setting-scroll-up': 'ctrl+u',
      'main::Enter:list-enter': { shortcutId: 'ctrl+Enter', when: 'mainFocus && !inputFocus' }
    },
    'shortcut store should preserve supported override shapes and drop invalid values'
  )
  assert.deepStrictEqual(
    getShortcutOverridesFromSetting({ hotkeyOverrides: { 'main::Delete:list-delete': null } }),
    { 'main::Delete:list-delete': null },
    'shortcut store should read overrides from current setting shape'
  )
  assert.strictEqual(getShortcutStorageBackend({}), null)
  const inMemoryShortcutBackend = {
    map: {
      'main::Delete:list-delete': null
    },
    upserts: [],
    replaces: [],
    deletes: [],
    getOverridesMap() {
      return this.map
    },
    upsertOverrideRows(rows) {
      this.upserts.push(rows)
      this.map = shortcutOverrideRowsToMap(rows)
    },
    replaceOverrideRows(rows) {
      this.replaces.push(rows)
      this.map = shortcutOverrideRowsToMap(rows)
      return true
    },
    deleteOverride(overrideKey) {
      this.deletes.push(overrideKey)
      delete this.map[overrideKey]
      return true
    }
  }
  assert.strictEqual(
    getShortcutStorageBackend({ shortcutKeybindings: inMemoryShortcutBackend }),
    inMemoryShortcutBackend
  )
  assert.deepStrictEqual(
    getEffectiveShortcutOverrides({
      setting: { hotkeyOverrides: { settingFallback: 'ctrl+f' } },
      backend: inMemoryShortcutBackend,
      warn: () => {}
    }),
    {
      hotkeyOverrides: { 'main::Delete:list-delete': null },
      storageMode: SHORTCUT_STORAGE_MODE_SQLITE
    },
    'shortcut store should prefer SQLite backend overrides when available'
  )
  assert.deepStrictEqual(
    getEffectiveShortcutOverrides({
      setting: { hotkeyOverrides: { settingFallback: 'ctrl+f' } },
      backend: {
        getOverridesMap() {
          throw new Error('read failed')
        }
      },
      warn: () => {}
    }),
    {
      hotkeyOverrides: { settingFallback: 'ctrl+f' },
      storageMode: SHORTCUT_STORAGE_MODE_SETTING
    },
    'shortcut store should fallback to setting overrides when SQLite read fails'
  )
  assert.strictEqual(
    getEffectiveShortcutBindings({
      setting: { hotkeyOverrides: {} },
      backend: {
        getOverridesMap() {
          return { 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } }
        },
        upsertOverrideRows() {},
        deleteOverride() {}
      },
      warn: () => {}
    }).find((binding) => binding.overrideKey === 'main::Delete:list-delete')?.shortcutId,
    'ctrl+d',
    'runtime bindings should use SQLite override map when backend is available'
  )
  assert.strictEqual(
    getEffectiveShortcutBindings({
      setting: { hotkeyOverrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+s' } } },
      backend: {
        getOverridesMap() {
          throw new Error('read failed')
        },
        upsertOverrideRows() {},
        deleteOverride() {}
      },
      warn: () => {}
    }).find((binding) => binding.overrideKey === 'main::Delete:list-delete')?.shortcutId,
    'ctrl+s',
    'runtime bindings should fallback to setting overrides when SQLite read fails'
  )
  const snapshotBindingRows = [
    {
      overrideKey: 'main::Delete:list-delete',
      commandId: 'list.item.delete',
      featureId: 'list-delete',
      layer: 'main',
      state: '',
      defaultShortcutId: 'Delete',
      defaultWhen: 'mainFocus && !inputFocus',
      weight: 0
    },
    {
      overrideKey: 'setting::ArrowUp:setting-scroll-up',
      commandId: 'setting.scroll.up',
      featureId: 'setting-scroll-up',
      layer: 'setting',
      state: '',
      defaultShortcutId: 'ArrowUp',
      defaultWhen: 'settingFocus',
      weight: 1
    }
  ]
  assert.deepStrictEqual(
    keybindingSnapshotRowsToBindings(snapshotBindingRows, {
      'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && multiSelect' },
      'setting::ArrowUp:setting-scroll-up': null
    }).map((binding) => ({
      shortcutId: binding.shortcutId,
      when: binding.when,
      source: binding.source,
      disabled: binding.disabled,
      commands: binding.commands
    })),
    [
      {
        shortcutId: 'ctrl+d',
        when: 'mainFocus && multiSelect',
        source: 'user',
        disabled: false,
        commands: ['list.item.delete']
      },
      {
        shortcutId: 'ArrowUp',
        when: 'settingFocus',
        source: 'removed',
        disabled: true,
        commands: ['setting.scroll.up']
      }
    ],
    'snapshot rows should be converted to command-aware bindings with overrides applied'
  )
  const sqliteCommandRowsResult = getEffectiveShortcutCommandRows({
    backend: {
      getOverridesMap() {
        return { 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } }
      },
      getCommandSnapshotRows() {
        return [
          {
            commandId: 'list.item.delete',
            title: 'SQLite delete title',
            category: 'sqlite-list',
            description: 'SQLite delete description',
            risk: 'data-write',
            source: 'defaultSnapshot'
          },
          {
            commandId: 'setting.scroll.up',
            title: 'SQLite setting up',
            category: 'sqlite-setting',
            description: 'SQLite setting description',
            risk: 'normal',
            source: 'defaultSnapshot'
          }
        ]
      },
      getKeybindingSnapshotRows() {
        return snapshotBindingRows
      },
      upsertOverrideRows() {},
      deleteOverride() {}
    },
    getFeatureLabel: (featureId) => `feature:${featureId}`,
    warn: () => {}
  })
  assert.strictEqual(sqliteCommandRowsResult.storageMode, SHORTCUT_STORAGE_MODE_SQLITE)
  assert.strictEqual(
    commandSnapshotRowsToMap([{ commandId: 'list.item.delete', title: 'mapped' }]).get('list.item.delete')?.title,
    'mapped',
    'command snapshot rows should be keyed by command id'
  )
  assert.strictEqual(
    sqliteCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.shortcutId,
    'ctrl+d',
    'setting command table rows should prefer SQLite snapshot rows when available'
  )
  assert.deepStrictEqual(
    {
      title: sqliteCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.commandTitle,
      description: sqliteCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.commandDescription,
      category: sqliteCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.category,
      risk: sqliteCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.risk
    },
    {
      title: 'feature:list-delete',
      description: 'SQLite delete description',
      category: 'sqlite-list',
      risk: 'data-write'
    },
    'setting command table rows should use SQLite command snapshot metadata when available'
  )
  assert.strictEqual(
    sqliteCommandRowsResult.rows.find((row) => row.commandId === 'setting.scroll.up')?.disabled,
    false,
    'unset SQLite snapshot rows should stay enabled'
  )
  const commandSnapshotFailureResult = getEffectiveShortcutCommandRows({
    backend: {
      getOverridesMap() {
        return { 'main::Delete:list-delete': { shortcutId: 'ctrl+alt+d' } }
      },
      getCommandSnapshotRows() {
        throw new Error('command snapshot read failed')
      },
      getKeybindingSnapshotRows() {
        return snapshotBindingRows
      },
      upsertOverrideRows() {},
      deleteOverride() {}
    },
    warn: () => {}
  })
  assert.strictEqual(commandSnapshotFailureResult.storageMode, SHORTCUT_STORAGE_MODE_SQLITE)
  assert.strictEqual(
    commandSnapshotFailureResult.rows.find((row) => row.commandId === 'list.item.delete')?.shortcutId,
    'ctrl+alt+d',
    'command snapshot failures should not discard SQLite keybinding snapshot rows'
  )
  assert.strictEqual(
    commandSnapshotFailureResult.rows.find((row) => row.commandId === 'list.item.delete')?.risk,
    'data-write',
    'command snapshot failures should fallback to code command metadata'
  )
  const fallbackCommandRowsResult = getEffectiveShortcutCommandRows({
    setting: { hotkeyOverrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+s' } } },
    backend: {
      getOverridesMap() {
        return {}
      },
      getKeybindingSnapshotRows() {
        throw new Error('snapshot read failed')
      },
      upsertOverrideRows() {},
      deleteOverride() {}
    },
    warn: () => {}
  })
  assert.strictEqual(fallbackCommandRowsResult.storageMode, SHORTCUT_STORAGE_MODE_SQLITE)
  assert.strictEqual(
    fallbackCommandRowsResult.rows.find((row) => row.commandId === 'list.item.delete')?.shortcutId,
    'Delete',
    'snapshot fallback should use backend overrides when override read still succeeds'
  )
  assert.deepStrictEqual(
    buildShortcutSettingsPayload({ database: { maxage: null }, hotkeyOverrides: { old: 'ctrl+o' } }, { next: null }),
    { database: { maxage: null }, hotkeyOverrides: { next: null } },
    'shortcut store should merge a normalized override draft into the settings payload'
  )
  const shortcutEvents = []
  const savedShortcutPayloads = []
  const shortcutSaveResult = saveShortcutSettingsPayload(
    { database: { maxage: 30 }, hotkeyOverrides: { old: 'ctrl+o' } },
    {
      overrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } },
      saveSetting(payload) {
        savedShortcutPayloads.push(payload)
        return payload
      },
      eventTarget: {
        dispatchEvent(event) {
          shortcutEvents.push(event.type)
        }
      }
    }
  )
  assert.strictEqual(shortcutSaveResult.storageMode, SHORTCUT_STORAGE_MODE_SETTING)
  assert.strictEqual(shortcutSaveResult.settingSaved, true)
  assert.strictEqual(shortcutSaveResult.sqliteSaved, false)
  assert.deepStrictEqual(savedShortcutPayloads, [
    {
      database: { maxage: 30 },
      hotkeyOverrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } }
    }
  ])
  assert.deepStrictEqual(shortcutEvents, ['ezclipboard:hotkey-bindings-updated'])
  const sqliteSaveEvents = []
  const sqliteSavePayloads = []
  const sqlitePersistCalls = []
  inMemoryShortcutBackend.map = {
    'main::Delete:list-delete': null,
    'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u' }
  }
  inMemoryShortcutBackend.upserts = []
  inMemoryShortcutBackend.replaces = []
  inMemoryShortcutBackend.deletes = []
  const sqliteSaveResult = saveShortcutSettingsPayload(
    { hotkeyOverrides: inMemoryShortcutBackend.map },
    {
      overrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } },
      backend: inMemoryShortcutBackend,
      saveSetting(payload) {
        sqliteSavePayloads.push(payload)
        return payload
      },
      eventTarget: {
        dispatchEvent(event) {
          sqliteSaveEvents.push(event.type)
        }
      },
      storageTarget: {
        queuePersist() {
          sqlitePersistCalls.push('save')
        }
      }
    }
  )
  assert.strictEqual(sqliteSaveResult.storageMode, SHORTCUT_STORAGE_MODE_SQLITE)
  assert.strictEqual(sqliteSaveResult.settingSaved, true)
  assert.strictEqual(sqliteSaveResult.sqliteSaved, true)
  assert.deepStrictEqual(sqlitePersistCalls, ['save'])
  assert.deepStrictEqual(inMemoryShortcutBackend.deletes, [])
  assert.deepStrictEqual(inMemoryShortcutBackend.upserts, [])
  assert.strictEqual(inMemoryShortcutBackend.replaces.length, 1)
  assert.deepStrictEqual(shortcutOverrideRowsToMap(inMemoryShortcutBackend.replaces[0]), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d' }
  })
  assert.deepStrictEqual(sqliteSavePayloads, [
    {
      hotkeyOverrides: {
        'main::Delete:list-delete': { shortcutId: 'ctrl+d' }
      }
    }
  ])
  assert.deepStrictEqual(sqliteSaveEvents, ['ezclipboard:hotkey-bindings-updated'])
  const saveSettingThrowEvents = []
  const saveSettingThrowPersistCalls = []
  inMemoryShortcutBackend.upserts = []
  inMemoryShortcutBackend.replaces = []
  inMemoryShortcutBackend.deletes = []
  assert.throws(
    () =>
      saveShortcutSettingsPayload(
        { hotkeyOverrides: {} },
        {
          overrides: { 'main::Delete:list-delete': { shortcutId: 'ctrl+x' } },
          backend: inMemoryShortcutBackend,
          saveSetting() {
            throw new Error('setting write failed')
          },
          eventTarget: {
            dispatchEvent(event) {
              saveSettingThrowEvents.push(event.type)
            }
          },
          storageTarget: {
            queuePersist() {
              saveSettingThrowPersistCalls.push('unexpected')
            }
          }
        }
      ),
    /setting write failed/,
    'shortcut store should surface setting save failures before SQLite writes'
  )
  assert.deepStrictEqual(inMemoryShortcutBackend.replaces, [])
  assert.deepStrictEqual(inMemoryShortcutBackend.upserts, [])
  assert.deepStrictEqual(inMemoryShortcutBackend.deletes, [])
  assert.deepStrictEqual(saveSettingThrowPersistCalls, [])
  assert.deepStrictEqual(saveSettingThrowEvents, [])
  inMemoryShortcutBackend.map = {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d' },
    'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u' }
  }
  inMemoryShortcutBackend.upserts = []
  inMemoryShortcutBackend.replaces = []
  inMemoryShortcutBackend.deletes = []
  sqlitePersistCalls.length = 0
  const sqliteResetResult = saveShortcutSettingsPayload(
    { hotkeyOverrides: inMemoryShortcutBackend.map },
    {
      overrides: {},
      backend: inMemoryShortcutBackend,
      saveSetting(payload) {
        return payload
      },
      eventTarget: { dispatchEvent() {} },
      storageTarget: {
        queuePersist() {
          sqlitePersistCalls.push('reset')
        }
      }
    }
  )
  assert.strictEqual(sqliteResetResult.storageMode, SHORTCUT_STORAGE_MODE_SQLITE)
  assert.deepStrictEqual(sqlitePersistCalls, ['reset'])
  assert.deepStrictEqual(inMemoryShortcutBackend.deletes, [])
  assert.deepStrictEqual(inMemoryShortcutBackend.upserts, [])
  assert.deepStrictEqual(inMemoryShortcutBackend.replaces, [[]])
  assert.deepStrictEqual(sqliteResetResult.hotkeyOverrides, {})
  sqlitePersistCalls.length = 0
  const failedSqliteSaveResult = saveShortcutSettingsPayload(
    { hotkeyOverrides: {} },
    {
      overrides: { 'main::Delete:list-delete': null },
      backend: {
        getOverridesMap() {
          throw new Error('write read failed')
        },
        upsertOverrideRows() {
          throw new Error('write failed')
        },
        deleteOverride() {}
      },
      saveSetting(payload) {
        return payload
      },
      eventTarget: { dispatchEvent() {} },
      storageTarget: {
        queuePersist() {
          sqlitePersistCalls.push('unexpected')
        }
      },
      warn: () => {}
    }
  )
  assert.strictEqual(failedSqliteSaveResult.storageMode, SHORTCUT_STORAGE_MODE_SETTING)
  assert.strictEqual(failedSqliteSaveResult.settingSaved, true)
  assert.strictEqual(failedSqliteSaveResult.sqliteSaved, false)
  assert.deepStrictEqual(failedSqliteSaveResult.hotkeyOverrides, { 'main::Delete:list-delete': null })
  assert.deepStrictEqual(sqlitePersistCalls, [])

  assert.ok(
    SHORTCUT_KEYBINDING_SCHEMA_SQL.includes('shortcut_command_snapshot') &&
      SHORTCUT_KEYBINDING_SCHEMA_SQL.includes('shortcut_keybinding_snapshot') &&
      SHORTCUT_KEYBINDING_SCHEMA_SQL.includes('shortcut_keybinding_overrides'),
    'shortcut SQLite schema should define command, keybinding and override tables'
  )
  const snapshotTimestamp = 1700000000000
  const commandSnapshots = buildShortcutCommandSnapshotRows(COMMANDS, snapshotTimestamp)
  assert.strictEqual(commandSnapshots.length, COMMANDS.length)
  assert.deepStrictEqual(
    commandSnapshots.find((row) => row.commandId === 'list.item.delete'),
    {
      commandId: 'list.item.delete',
      title: 'Delete selected item',
      category: 'list',
      description: 'Delete selected item',
      risk: 'data-write',
      source: 'system',
      defaultWhen: '',
      versionHash: commandSnapshots.find((row) => row.commandId === 'list.item.delete').versionHash,
      updatedAt: snapshotTimestamp
    },
    'command snapshot should preserve command metadata for SQLite seeding'
  )
  const keybindingSnapshots = buildShortcutKeybindingSnapshotRows(HOTKEY_BINDINGS, snapshotTimestamp)
  assert.strictEqual(keybindingSnapshots.length, allShortcutRows.length)
  const deleteSnapshot = keybindingSnapshots.find((row) => row.overrideKey === 'main::Delete:list-delete')
  assert.strictEqual(deleteSnapshot.commandId, 'list.item.delete')
  assert.strictEqual(deleteSnapshot.defaultShortcutId, 'Delete')
  assert.strictEqual(deleteSnapshot.defaultWhen, 'mainFocus')
  assert.strictEqual(deleteSnapshot.updatedAt, snapshotTimestamp)
  const overrideRows = buildShortcutOverrideRows(
    {
      'main::Delete:list-delete': null,
      'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u', when: 'settingFocus && !inputFocus' },
      unknown: { shortcutId: 'ctrl+x' }
    },
    keybindingSnapshots,
    snapshotTimestamp
  )
  assert.deepStrictEqual(
    overrideRows.map((row) => row.overrideKey).sort(),
    ['main::Delete:list-delete', 'setting::ArrowUp:setting-scroll-up'],
    'override migration should skip rows that no longer map to default keybindings'
  )
  assert.deepStrictEqual(
    shortcutOverrideRowsToMap(overrideRows),
    {
      'main::Delete:list-delete': null,
      'setting::ArrowUp:setting-scroll-up': {
        shortcutId: 'ctrl+shift+u',
        when: 'settingFocus && !inputFocus'
      }
    },
    'SQLite override rows should round-trip to the existing hotkeyOverrides map shape'
  )
  assert.strictEqual(
    createShortcutOverrideMigrationHash({ a: { when: 'x', shortcutId: 'y' }, b: null }),
    createShortcutOverrideMigrationHash({ b: null, a: { shortcutId: 'y', when: 'x' } }),
    'override migration hash should be stable across object key order'
  )
  const schemaRuns = []
  const shortcutRepository = new ShortcutKeybindingRepository({
    run(sql) {
      schemaRuns.push(sql)
    }
  })
  shortcutRepository.ensureSchema()
  assert.deepStrictEqual(schemaRuns, [SHORTCUT_KEYBINDING_SCHEMA_SQL])
  assert.strictEqual(
    shortcutRepository.seedDefaultSnapshots({ timestamp: snapshotTimestamp }).keybindings.length,
    keybindingSnapshots.length
  )
  assert.deepStrictEqual(
    shortcutRepository.migrateOverridesFromSetting({ 'main::Delete:list-delete': null }, {
      bindingRows: keybindingSnapshots,
      timestamp: snapshotTimestamp
    }).rows.map((row) => row.overrideKey),
    ['main::Delete:list-delete']
  )
  function createFakeShortcutDb() {
    const store = {
      runs: [],
      meta: {},
      overrides: []
    }
    return {
      store,
      run(sql, params = {}) {
        store.runs.push({ sql, params })
        if (sql.includes('INSERT OR REPLACE INTO meta')) {
          store.meta[params.$key] = params.$value
        }
        if (sql.includes('INSERT OR REPLACE INTO shortcut_keybinding_overrides')) {
          const nextRow = {
            override_key: params.$override_key,
            command_id: params.$command_id,
            shortcut_id: params.$shortcut_id,
            when_expr: params.$when_expr,
            disabled: params.$disabled,
            source: params.$source,
            updated_at: params.$updated_at
          }
          const index = store.overrides.findIndex((row) => row.override_key === params.$override_key)
          if (index >= 0) store.overrides[index] = nextRow
          else store.overrides.push(nextRow)
        }
        if (sql.includes('DELETE FROM shortcut_keybinding_overrides')) {
          store.overrides = store.overrides.filter((row) => row.override_key !== params.$override_key)
        }
      },
      prepare(sql) {
        let rows = []
        let initialized = false
        return {
          bind(params = {}) {
            if (sql.includes('SELECT value FROM meta')) {
              const value = store.meta[params.$key]
              rows = value === undefined ? [] : [{ value }]
              initialized = true
            }
          },
          step() {
            if (sql.includes('FROM shortcut_keybinding_overrides') && !initialized) {
              rows = store.overrides.slice().sort((a, b) => a.override_key.localeCompare(b.override_key))
              initialized = true
            }
            return rows.length > 0
          },
          getAsObject() {
            return rows.shift() || {}
          },
          free() {}
        }
      }
    }
  }
  const fakeDb = createFakeShortcutDb()
  const writeRepository = new ShortcutKeybindingRepository(fakeDb)
  writeRepository.seedDefaultSnapshots({ timestamp: snapshotTimestamp, write: true })
  assert.ok(
    fakeDb.store.runs.some((item) => item.sql.includes('shortcut_command_snapshot')) &&
      fakeDb.store.runs.some((item) => item.sql.includes('shortcut_keybinding_snapshot')),
    'write seed should upsert command and keybinding snapshots'
  )
  fakeDb.store.runs = []
  const settingOverridesForMigration = {
    'main::Delete:list-delete': null,
    'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u' }
  }
  const firstMigration = writeRepository.migrateOverridesFromSetting(settingOverridesForMigration, {
    bindingRows: keybindingSnapshots,
    timestamp: snapshotTimestamp,
    write: true
  })
  assert.strictEqual(fakeDb.store.meta[SHORTCUT_OVERRIDE_MIGRATION_META_KEY], firstMigration.migrationHash)
  assert.strictEqual(fakeDb.store.overrides.length, 2)
  assert.deepStrictEqual(
    writeRepository.getOverridesMap(),
    {
      'main::Delete:list-delete': null,
      'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u' }
    },
    'repository should read SQLite override rows as the existing override map shape'
  )
  fakeDb.store.runs = []
  writeRepository.migrateOverridesFromSetting(settingOverridesForMigration, {
    bindingRows: keybindingSnapshots,
    timestamp: snapshotTimestamp,
    write: true
  })
  assert.deepStrictEqual(
    fakeDb.store.runs.filter((item) => item.sql.includes('shortcut_keybinding_overrides')),
    [],
    'same migration hash should not re-import override rows'
  )
  writeRepository.migrateOverridesFromSetting({ 'main::Delete:list-delete': { shortcutId: 'ctrl+d' } }, {
    bindingRows: keybindingSnapshots,
    timestamp: snapshotTimestamp + 1,
    write: true
  })
  assert.deepStrictEqual(writeRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d' },
    'setting::ArrowUp:setting-scroll-up': { shortcutId: 'ctrl+shift+u' }
  })
  assert.strictEqual(writeRepository.deleteOverride('setting::ArrowUp:setting-scroll-up'), true)
  assert.deepStrictEqual(writeRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d' }
  })
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') })
  const realSqlDb = new SQL.Database()
  realSqlDb.run('CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT)')
  const realSqlRepository = new ShortcutKeybindingRepository(realSqlDb)
  realSqlRepository.ensureSchema()
  realSqlRepository.seedDefaultSnapshots({ timestamp: snapshotTimestamp, write: true })
  const realCommandSnapshots = realSqlRepository.getCommandSnapshotRows()
  const realKeybindingSnapshots = realSqlRepository.getKeybindingSnapshotRows()
  assert.strictEqual(realCommandSnapshots.length, COMMANDS.length)
  assert.ok(
    realCommandSnapshots.some((row) => row.commandId === 'list.item.delete' && row.risk === 'data-write'),
    'repository should query command snapshots from SQLite'
  )
  assert.strictEqual(realKeybindingSnapshots.length, buildShortcutKeybindingSnapshotRows().length)
  assert.ok(
    realKeybindingSnapshots.some(
      (row) =>
        row.overrideKey === 'main::Delete:list-delete' &&
        row.commandId === 'list.item.delete' &&
        row.defaultShortcutId === 'Delete'
    ),
    'repository should query keybinding snapshots from SQLite'
  )
  realSqlRepository.migrateOverridesFromSetting({
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' },
    'setting::ArrowUp:setting-scroll-up': null
  }, {
    timestamp: snapshotTimestamp,
    write: true
  })
  assert.deepStrictEqual(realSqlRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' },
    'setting::ArrowUp:setting-scroll-up': null
  })
  assert.strictEqual(realSqlRepository.deleteOverride('setting::ArrowUp:setting-scroll-up'), true)
  assert.deepStrictEqual(realSqlRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' }
  })
  const persistedSqlBytes = realSqlDb.export()
  realSqlDb.close()
  const reloadedSqlDb = new SQL.Database(persistedSqlBytes)
  const reloadedSqlRepository = new ShortcutKeybindingRepository(reloadedSqlDb)
  assert.deepStrictEqual(reloadedSqlRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' }
  }, 'shortcut overrides should survive sql.js export and reload')
  assert.throws(() => reloadedSqlRepository.replaceOverrideRows([
    {
      overrideKey: 'broken::row',
      commandId: null,
      shortcutId: 'ctrl+x',
      whenExpr: null,
      disabled: 0,
      source: 'user',
      updatedAt: snapshotTimestamp
    }
  ]), /NOT NULL|constraint/i)
  assert.deepStrictEqual(reloadedSqlRepository.getOverridesMap(), {
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' }
  }, 'failed replaceOverrideRows should rollback and preserve previous overrides')
  assert.strictEqual(reloadedSqlRepository.replaceOverrideRows([]), true)
  assert.deepStrictEqual(reloadedSqlRepository.getOverridesMap(), {}, 'replaceOverrideRows should atomically clear overrides')
  const macroSqlDb = new SQL.Database()
  const macroSqlRepository = new CommandMacroRepository(macroSqlDb)
  macroSqlRepository.ensureSchema()
  const macroSqlRows = buildCommandMacroRows([
    {
      id: 'macro.realSql',
      title: 'Real SQL macro',
      shortcutId: 'ctrl+shift+r',
      when: 'mainFocus',
      steps: [
        { command: 'main.setting.open', delayMs: 1, args: { via: 'sql' } },
        { command: 'setting.tab.next', delayMs: 2 }
      ]
    }
  ], { timestamp: snapshotTimestamp })
  assert.strictEqual(macroSqlRows.ok, true)
  assert.strictEqual(macroSqlRepository.replaceMacroRows(macroSqlRows.rows), true)
  assert.deepStrictEqual(macroSqlRepository.getMacroDefinitions(), [
    {
      id: 'macro.realSql',
      title: 'Real SQL macro',
      shortcutId: 'ctrl+shift+r',
      when: 'mainFocus',
      mode: 'sequence',
      steps: [
        { command: 'main.setting.open', delayMs: 1, args: { via: 'sql' } },
        { command: 'setting.tab.next', delayMs: 2, args: {} }
      ]
    }
  ])
  assert.throws(() => macroSqlRepository.replaceMacroRows({
    definitions: [{
      macroId: 'macro.broken',
      title: 'Broken macro',
      mode: 'sequence',
      enabled: 1,
      versionHash: '',
      updatedAt: snapshotTimestamp
    }],
    steps: [{
      macroId: 'macro.broken',
      stepIndex: 0,
      commandId: null,
      delayMs: 0,
      argsJson: '{}'
    }]
  }), /NOT NULL|constraint/i)
  assert.deepStrictEqual(
    macroSqlRepository.getMacroDefinitions().map((macro) => macro.id),
    ['macro.realSql'],
    'failed macro replace should rollback and preserve previous macro definitions'
  )
  const macroPersistedBytes = macroSqlDb.export()
  macroSqlDb.close()
  const macroReloadedDb = new SQL.Database(macroPersistedBytes)
  const macroReloadedRepository = new CommandMacroRepository(macroReloadedDb)
  assert.strictEqual(macroReloadedRepository.getMacroDefinitions()[0]?.id, 'macro.realSql')
  assert.strictEqual(macroReloadedRepository.deleteMacro('macro.realSql'), true)
  assert.deepStrictEqual(macroReloadedRepository.getMacroDefinitions(), [])
  macroReloadedDb.close()
  const reloadedRunsBefore = reloadedSqlDb.getRowsModified()
  reloadedSqlRepository.migrateOverridesFromSetting({
    'main::Delete:list-delete': { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' },
    'setting::ArrowUp:setting-scroll-up': null
  }, {
    timestamp: snapshotTimestamp,
    write: true
  })
  assert.strictEqual(
    reloadedSqlDb.getRowsModified(),
    reloadedRunsBefore,
    'same migration hash should not write rows after sql.js reload'
  )
  reloadedSqlDb.close()

  assert.strictEqual(eventLikeToShortcutId({ ctrlKey: true, shiftKey: true, key: 'F', code: 'KeyF' }), 'ctrl+shift+f')
  assert.strictEqual(eventLikeToShortcutId({ altKey: true, key: 'å', code: 'KeyU' }), 'alt+u')
  assert.strictEqual(isRecordableShortcutId('shift'), false)
  assert.strictEqual(isRecordableShortcutId('ctrl+shift+f'), true)
  assert.strictEqual(isRecordableShortcutId('Delete'), true)

  const overriddenBinding = applyHotkeyOverride(
    { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
    { shortcutId: 'ctrl+d', when: 'mainFocus && !inputFocus' },
    'main::Delete:list-delete'
  )
  assert.strictEqual(overriddenBinding.shortcutId, 'ctrl+d')
  assert.strictEqual(overriddenBinding.when, 'mainFocus && !inputFocus')
  assert.strictEqual(overriddenBinding.source, 'user')
  const commandAwareOverride = getCommandAwareBindings([overriddenBinding])[0]
  assert.strictEqual(commandAwareOverride.when, 'mainFocus && !inputFocus')
  assert.strictEqual(commandAwareOverride.defaultWhen, 'mainFocus')

  const stringOverrideBinding = applyHotkeyOverride(
    { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
    'ctrl+d',
    'main::Delete:list-delete'
  )
  assert.strictEqual(stringOverrideBinding.shortcutId, 'ctrl+d')
  assert.strictEqual(stringOverrideBinding.when, undefined)

  const globalWhenOverride = getCommandAwareBindings([
    applyHotkeyOverride(
      { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
      { when: '' },
      'main::Delete:list-delete'
    )
  ])[0]
  assert.strictEqual(globalWhenOverride.when, '')
  assert.strictEqual(globalWhenOverride.defaultWhen, 'mainFocus')

  const removedBinding = applyHotkeyOverride(
    { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
    null,
    'main::Delete:list-delete'
  )
  assert.strictEqual(removedBinding.disabled, true)
  assert.strictEqual(removedBinding.source, 'removed')

  const resolverBindings = getCommandAwareBindings([
    { layer: 'main', shortcutId: 'ctrl+Delete', features: ['list-force-delete'] },
    { layer: 'main', state: 'search', shortcutId: 'ctrl+Delete', features: ['search-delete-normal'] },
    { layer: 'clip-drawer', shortcutId: 'ctrl+Delete', features: ['drawer-close'] },
    { layer: 'clip-drawer', shortcutId: '*', features: ['drawer-block'] }
  ])
  assert.strictEqual(
    resolveKeybinding(resolverBindings, 'ctrl+Delete', { mainFocus: true, searchActive: false })?.commands?.[0],
    'list.item.forceDelete'
  )
  assert.strictEqual(
    resolveKeybinding(resolverBindings, 'ctrl+Delete', { mainFocus: true, searchActive: true })?.commands?.[0],
    'search.results.delete'
  )
  assert.strictEqual(
    resolveKeybinding(resolverBindings, 'ctrl+Delete', { mainFocus: true, drawerOpen: true })?.commands?.[0],
    'drawer.close'
  )
  assert.strictEqual(
    resolveKeybinding(resolverBindings, 'alt+x', { mainFocus: true, drawerOpen: true })?.commands?.[0],
    'drawer.blockUnhandled'
  )
  assert.strictEqual(
    resolveKeybinding([{ key: 'Delete', commands: ['disabled'], when: 'mainFocus', disabled: true }], 'Delete', { mainFocus: true }),
    null
  )
  assert.strictEqual(
    resolveKeybinding(
      [
        { shortcutId: 'ctrl+d', commands: ['system.delete'], when: 'mainFocus', source: 'system' },
        { shortcutId: 'ctrl+d', commands: ['user.delete'], when: 'mainFocus', source: 'user' }
      ],
      'ctrl+d',
      { mainFocus: true }
    )?.commands?.[0],
    'user.delete'
  )

  assert.deepStrictEqual(
    buildHotkeyContextSnapshot({ mainState: 'normal' }),
    {
      appFocus: true,
      mainFocus: true,
      settingFocus: false,
      searchActive: false,
      inputFocus: false,
      searchInputFocus: false,
      clearDialogOpen: false,
      drawerOpen: false,
      fullDataOpen: false,
      tagSearchOpen: false,
      tagEditOpen: false,
      pinGroupEditOpen: false
    },
    'normal main state should produce a main-focused context'
  )
  assert.strictEqual(buildHotkeyContextSnapshot({ mainState: 'search' }).searchActive, true)
  const settingContext = buildHotkeyContextSnapshot({
    currentLayer: 'setting',
    target: {
      isContentEditable: false,
      closest(selector) {
        return selector.includes('input') ? {} : null
      }
    }
  })
  assert.strictEqual(settingContext.mainFocus, false)
  assert.strictEqual(settingContext.settingFocus, true)
  assert.strictEqual(settingContext.inputFocus, true)
  const drawerContext = buildHotkeyContextSnapshot({
    currentLayer: 'clip-drawer',
    activeLayers: ['clip-drawer'],
    mainState: 'normal'
  })
  assert.strictEqual(drawerContext.mainFocus, true, 'overlay contexts still allow resolver fallback to main bindings')
  assert.strictEqual(drawerContext.drawerOpen, true)
  assert.strictEqual(
    resolveKeybinding(resolverBindings, 'ctrl+Delete', drawerContext)?.commands?.[0],
    'drawer.close',
    'overlay-specific resolver weight should beat main fallback'
  )
  assert.strictEqual(
    buildHotkeyContextSnapshot({
      activeLayers: ['full-data-overlay', 'tag-search', 'tag-edit', 'pin-group-edit', 'clear-dialog']
    }).fullDataOpen,
    true
  )
  assert.strictEqual(
    buildHotkeyContextSnapshot({
      activeLayers: ['full-data-overlay', 'tag-search', 'tag-edit', 'pin-group-edit', 'clear-dialog']
    }).clearDialogOpen,
    true
  )
  assert.strictEqual(isEditableHotkeyTarget({ closest: () => null, isContentEditable: true }), true)
  assert.strictEqual(isEditableHotkeyTarget({ closest: () => null, isContentEditable: false }), false)

  const legacyBindings = [
    { layer: 'main', state: 'search', shortcutId: 'ctrl+Delete', features: ['search-delete-normal'] },
    { layer: 'main', shortcutId: 'ctrl+Delete', features: ['list-force-delete'] },
    { layer: 'clip-drawer', shortcutId: 'ctrl+Delete', features: ['drawer-close'] },
    { layer: 'clip-drawer', shortcutId: '*', features: ['drawer-block'] }
  ]
  assert.deepStrictEqual(
    resolveLegacyBinding('ctrl+Delete', {
      currentLayer: null,
      mainState: 'search',
      bindingList: legacyBindings
    }).binding.features,
    ['search-delete-normal']
  )
  assert.strictEqual(
    previewKeybindingResolution('ctrl+Delete', {
      currentLayer: null,
      mainState: 'search',
      bindingList: legacyBindings
    }).matches,
    true,
    'shadow resolver should match legacy search binding'
  )
  assert.strictEqual(
    previewKeybindingResolution('ctrl+Delete', {
      currentLayer: 'clip-drawer',
      activeLayers: ['clip-drawer'],
      mainState: 'normal',
      bindingList: legacyBindings
    }).matches,
    true,
    'shadow resolver should match legacy overlay binding before main fallback'
  )
  assert.deepStrictEqual(
    previewKeybindingResolution('alt+x', {
      currentLayer: 'clip-drawer',
      activeLayers: ['clip-drawer'],
      mainState: 'normal',
      bindingList: legacyBindings
    }).commandBinding.features,
    ['drawer-block'],
    'shadow resolver should preserve legacy wildcard overlay block behavior'
  )

  const matrixMismatches = []
  for (const binding of HOTKEY_BINDINGS) {
    const isMain = binding.layer === 'main'
    const shortcutId = binding.shortcutId === '*' ? '__unbound_probe__' : binding.shortcutId
    const preview = previewKeybindingResolution(shortcutId, {
      currentLayer: isMain ? null : binding.layer,
      activeLayers: isMain ? [] : [binding.layer],
      mainState: binding.state || 'normal',
      bindingList: HOTKEY_BINDINGS
    })
    if (!preview.matches) {
      matrixMismatches.push({
        layer: binding.layer,
        state: binding.state || '',
        shortcutId: binding.shortcutId,
        legacy: preview.legacy.binding?.features || [],
        command: preview.commandBinding?.features || [],
        context: preview.context
      })
    }
  }
  assert.deepStrictEqual(matrixMismatches, [], 'default hotkey matrix should resolve identically in legacy and command shadow modes')

  clearLayers()
  setMainState('normal')
  setBindings([
    {
      layer: 'main',
      shortcutId: 'ctrl+x',
      features: ['shadow-user-command'],
      when: 'mainFocus && !inputFocus',
      source: 'user'
    },
    {
      layer: 'main',
      shortcutId: 'ctrl+x',
      features: ['shadow-system-command'],
      source: 'system'
    }
  ])
  assert.strictEqual(getBindings()[0].when, 'mainFocus && !inputFocus')
  assert.strictEqual(getBindings()[0].source, 'user')
  const dispatched = []
  registerFeature('shadow-user-command', (event, ctx) => {
    dispatched.push({ feature: 'user', layer: ctx.layer, context: ctx.context })
    return true
  })
  registerFeature('shadow-system-command', () => {
    dispatched.push({ feature: 'system' })
    return true
  })
  const event = {
    key: 'x',
    code: 'KeyX',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    repeat: false,
    isComposing: false,
    target: { closest: () => null, isContentEditable: false },
    preventDefault() {
      this.defaultPrevented = true
    },
    stopPropagation() {
      this.propagationStopped = true
    }
  }
  assert.strictEqual(dispatch(event), true)
  assert.deepStrictEqual(dispatched.map((item) => item.feature), ['user'])
  assert.strictEqual(dispatched[0].layer, 'main')
  assert.strictEqual(dispatched[0].context.mainFocus, true)
  assert.strictEqual(event.defaultPrevented, true)
  assert.strictEqual(event.__hotkeyHandled, true)
  unregisterFeature('shadow-user-command')
  unregisterFeature('shadow-system-command')

  const commandDispatches = []
  clearLayers()
  setMainState('normal')
  setBindings([
    {
      layer: 'main',
      shortcutId: 'ctrl+y',
      commands: ['test.command.primary'],
      features: ['test-feature-fallback'],
      when: 'mainFocus'
    },
    {
      layer: 'main',
      shortcutId: 'ctrl+z',
      commands: ['test.command.fallback'],
      features: ['test-feature-fallback'],
      when: 'mainFocus'
    },
    {
      layer: 'main',
      shortcutId: 'ctrl+q',
      commands: ['test.command.only'],
      when: 'mainFocus'
    }
  ])
  registerCommand('test.command.primary', (event, ctx) => {
    commandDispatches.push({ type: 'command', commandId: ctx.commandId, featureId: ctx.featureId })
    return true
  })
  registerFeature('test-feature-fallback', (event, ctx) => {
    commandDispatches.push({ type: 'feature', commandId: ctx.commandId, featureId: ctx.featureId })
    return true
  })
  registerCommand('test.command.only', (event, ctx) => {
    commandDispatches.push({ type: 'command-only', commandId: ctx.commandId, featureId: ctx.featureId })
    return true
  })
  assert.strictEqual(dispatch({ ...event, key: 'y', code: 'KeyY', __hotkeyHandled: false, defaultPrevented: false }), true)
  assert.strictEqual(dispatch({ ...event, key: 'z', code: 'KeyZ', __hotkeyHandled: false, defaultPrevented: false }), true)
  assert.strictEqual(dispatch({ ...event, key: 'q', code: 'KeyQ', __hotkeyHandled: false, defaultPrevented: false }), true)
  assert.deepStrictEqual(commandDispatches, [
    { type: 'command', commandId: 'test.command.primary', featureId: 'test-feature-fallback' },
    { type: 'feature', commandId: 'test.command.fallback', featureId: 'test-feature-fallback' },
    { type: 'command-only', commandId: 'test.command.only', featureId: 'test.command.only' }
  ])
  unregisterCommand('test.command.primary')
  unregisterCommand('test.command.only')
  unregisterFeature('test-feature-fallback')

  const deleteCommandDispatches = []
  clearLayers()
  setMainState('normal')
  setBindings(
    getCommandAwareBindings([
      applyHotkeyOverride(
        { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
        { shortcutId: 'ctrl+shift+d' },
        'main::Delete:list-delete'
      )
    ])
  )
  registerCommand('list.item.delete', (event, ctx) => {
    deleteCommandDispatches.push({
      commandId: ctx.commandId,
      featureId: ctx.featureId,
      shortcutId: ctx.commandBinding.shortcutId,
      source: ctx.commandBinding.source,
      defaultShortcutId: ctx.commandBinding.defaultShortcutId
    })
    return true
  })
  assert.strictEqual(
    dispatch({
      ...event,
      key: 'Delete',
      code: 'Delete',
      ctrlKey: false,
      shiftKey: false,
      __hotkeyHandled: false,
      defaultPrevented: false
    }),
    false,
    'data-write override should remove the old Delete shortcut from dispatch'
  )
  assert.strictEqual(
    dispatch({
      ...event,
      key: 'd',
      code: 'KeyD',
      ctrlKey: true,
      shiftKey: true,
      __hotkeyHandled: false,
      defaultPrevented: false
    }),
    true,
    'data-write override should dispatch from the new shortcut'
  )
  assert.deepStrictEqual(deleteCommandDispatches, [
    {
      commandId: 'list.item.delete',
      featureId: 'list-delete',
      shortcutId: 'ctrl+shift+d',
      source: 'user',
      defaultShortcutId: 'Delete'
    }
  ])
  unregisterCommand('list.item.delete')

  const disabledDeleteDispatches = []
  clearLayers()
  setMainState('normal')
  setBindings(
    getCommandAwareBindings([
      applyHotkeyOverride(
        { layer: 'main', shortcutId: 'Delete', features: ['list-delete'] },
        null,
        'main::Delete:list-delete'
      )
    ])
  )
  registerCommand('list.item.delete', () => {
    disabledDeleteDispatches.push('unexpected')
    return true
  })
  assert.strictEqual(
    dispatch({
      ...event,
      key: 'Delete',
      code: 'Delete',
      ctrlKey: false,
      shiftKey: false,
      __hotkeyHandled: false,
      defaultPrevented: false
    }),
    false,
    'disabled data-write command should not dispatch from its default shortcut'
  )
  assert.deepStrictEqual(disabledDeleteDispatches, [])
  unregisterCommand('list.item.delete')

  const pairDispatches = []
  clearLayers()
  setMainState('normal')
  setBindings([
    {
      layer: 'main',
      shortcutId: 'ctrl+r',
      commands: ['test.command.pair'],
      features: ['test-feature-pair'],
      when: 'mainFocus'
    }
  ])
  const disposePair = registerCommandFeaturePair('test-feature-pair', 'test.command.pair', (event, ctx) => {
    pairDispatches.push(ctx.commandId)
    return true
  })
  assert.strictEqual(dispatch({ ...event, key: 'r', code: 'KeyR', __hotkeyHandled: false, defaultPrevented: false }), true)
  assert.deepStrictEqual(pairDispatches, ['test.command.pair'])
  disposePair()
  assert.strictEqual(dispatch({ ...event, key: 'r', code: 'KeyR', __hotkeyHandled: false, defaultPrevented: false }), false)
  assert.deepStrictEqual(pairDispatches, ['test.command.pair'])

  const noopPairDispose = registerCommandFeaturePair('', 'test.command.invalid', () => true)
  noopPairDispose()
  setBindings([
    {
      layer: 'main',
      shortcutId: 'ctrl+i',
      commands: ['test.command.invalid'],
      features: ['test-feature-invalid'],
      when: 'mainFocus'
    }
  ])
  assert.strictEqual(dispatch({ ...event, key: 'i', code: 'KeyI', __hotkeyHandled: false, defaultPrevented: false }), false)
  const batchDispatches = []
  const disposeBatch = registerCommandFeaturePairs([
    null,
    { featureId: 'test-feature-batch-missing-command', handler: () => true },
    {
      featureId: 'test-feature-batch',
      commandId: 'test.command.batch',
      handler: () => {
        batchDispatches.push('handled')
        return true
      }
    }
  ])
  setBindings([
    {
      layer: 'main',
      shortcutId: 'ctrl+b',
      commands: ['test.command.batch'],
      features: ['test-feature-batch'],
      when: 'mainFocus'
    }
  ])
  assert.strictEqual(dispatch({ ...event, key: 'b', code: 'KeyB', __hotkeyHandled: false, defaultPrevented: false }), true)
  assert.deepStrictEqual(batchDispatches, ['handled'])
  disposeBatch()
  assert.strictEqual(dispatch({ ...event, key: 'b', code: 'KeyB', __hotkeyHandled: false, defaultPrevented: false }), false)

  console.log('shortcut command system tests passed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
