# 层级判断与快捷键映射全局统一

Tool: codex

将快捷键层级优先级从“动态栈顶 + when 权重补偿”收敛为“静态层优先级 + 明确上下文互斥 + 子层阻断”，修复 `mainFocus` 在弹层打开时仍为真的旧语义，并同步更新 resolver、legacy preview 与测试断言。

---

## 结论

原始方向正确，但必须补齐两类设计：

- `setting-shortcut-record` / `setting-when-edit` 不能只入优先级表；它们没有默认 binding，必须显式阻断 setting 层方向键穿透。
- 移除 `overlayScore` 前，必须让所有 resolver 调用都传入同一份层优先级栈，并把测试从“overlay 依赖 mainFocus fallback”迁移到“overlay 关闭 mainFocus”。

本方案只改快捷键层级与解析模型，不改业务 handler、快捷键录制 UI、SQLite 存储格式、when 表达式语法。最终实现要求 setting 子弹窗阻断使用内部 feature-only binding，运行时合并到 effective bindings，但不进入 command profile、设置页命令列表或持久化 override。

---

## 现状证据

| 问题 | 代码证据 | 影响 |
|---|---|---|
| `mainFocus` 只排除 setting | [src/global/hotkeyContext.js](../../../src/global/hotkeyContext.js:49) | 任意 main 内弹层打开时，main 绑定仍可通过 `when` |
| resolver 层顺序只取 `[top, main]` | [src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:160) | tag-edit inside drawer 等嵌套层无法表达完整优先级 |
| legacy preview 内联同一套 `[top, main]` | [src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:195) | shadow preview 与新 resolver 容易漂移 |
| `overlayScore` 用 when 字符串补偿 | [src/global/keybindingResolver.js](../../../src/global/keybindingResolver.js:34) | layerWeight 与 overlayScore 双重决策，规则来源分散 |
| setting 子弹窗只激活层，无阻断 binding | [src/views/Setting.vue](../../../src/views/Setting.vue:2672) | 录制/When 弹窗打开时，setting 层方向键仍可能命中 |
| 测试仍断言旧 overlay fallback | [test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2403) | 实施后必须同步改断言，否则测试表达旧设计 |

---

## 目标语义

### 层级优先级

数字越大优先级越高；同优先级按最近激活的层优先，作为显式 tie-breaker。

| 层名 | 优先级 | 说明 |
|---|---:|---|
| `main` | 10 | 基础层 |
| `setting` | 20 | 设置页全屏层 |
| `clip-drawer` | 30 | main 内抽屉 |
| `clear-dialog` | 35 | main 内确认弹窗，高于抽屉 |
| `full-data-overlay` | 35 | main 内全文浮层，高于抽屉 |
| `tag-search` | 35 | main 内标签搜索弹窗 |
| `tag-edit` | 40 | main 内编辑弹窗，高于普通浮层 |
| `pin-group-edit` | 40 | main 内置顶组合编辑弹窗 |
| `setting-shortcut-record` | 50 | setting 内快捷键录制弹窗 |
| `setting-when-edit` | 50 | setting 内 When 编辑弹窗 |

未知层默认优先级为 `0`，不自动压过已知层；新增层必须显式加入表，避免错误层名获得最高优先级。

### `mainFocus`

`mainFocus` 表示“主界面基础层可接收快捷键”，不是“当前不是 setting”。任意高于 main 的已知层激活时，`mainFocus=false`。

`settingFocus` 表示 setting 页面存在且没有被外部主界面替代；setting 子弹窗打开时 `settingFocus` 仍可为 true，但必须由更高优先级子层 binding 或阻断规则截获会穿透的键。

### 阻断优先级

Resolver 先按 layer priority 选层，再按 source/explicit weight/when specificity/wildcard penalty 选同层 binding。`when` 只决定候选是否可用，不再承担“弹层优先级加分”职责。

---

## 设计更新

### 1. `hotkeyLayers.js` 作为唯一层级来源

新增静态表与纯函数：

```js
const LAYER_PRIORITY = {
  main: 10,
  setting: 20,
  'clip-drawer': 30,
  'clear-dialog': 35,
  'full-data-overlay': 35,
  'tag-search': 35,
  'tag-edit': 40,
  'pin-group-edit': 40,
  'setting-shortcut-record': 50,
  'setting-when-edit': 50
}

export const getLayerPriority = (name) => LAYER_PRIORITY[name] ?? 0
export const getLayerPriorityStack = (layers = getActiveLayers()) => {
  const indexed = [...new Set([...(layers || []), 'main'])]
    .map((name, index) => ({ name, index }))
  return indexed
    .sort((a, b) => {
      const priorityDiff = getLayerPriority(b.name) - getLayerPriority(a.name)
      return priorityDiff || b.index - a.index
    })
    .map((item) => item.name)
}
```

要求：

- `getLayerPriorityStack()` 默认读取当前 active layers，dispatch 可直接使用。
- `getLayerPriorityStack(activeLayers)` 支持 preview/test 传入快照，避免读取全局栈。
- `main` 永远作为兜底层加入排序，但只有 `when` 通过时才可命中。

### 2. `hotkeyContext.js` 修复 `mainFocus`

`buildHotkeyContextSnapshot()` 引入 `getLayerPriority`：

```js
const mainPriority = getLayerPriority('main')
const hasHigherLayer = [...layers].some((layer) => {
  return layer !== 'main' && getLayerPriority(layer) > mainPriority
})

mainFocus: !settingFocus && !hasHigherLayer
```

要求：

- `drawerOpen`、`fullDataOpen`、`tagSearchOpen`、`tagEditOpen`、`pinGroupEditOpen` 仍由 `LAYER_CONTEXT_KEY_MAP` 输出。
- `setting-shortcut-record`、`setting-when-edit` 不新增公开 when key，除非后续 UI 需要展示；本轮只通过 layer binding 阻断。
- `extra` 仍保留最后覆盖能力，便于测试和显式预览场景。

### 3. `hotkeyRegistry.js` 统一 dispatch 与 preview

所有解析入口使用同一层级快照：

```js
function getLayerPriorityOrder(activeLayers = getActiveLayers()) {
  return getLayerPriorityStack(activeLayers)
}
```

要求：

- `dispatch()` 先取一次 `activeLayers = getActiveLayers()`，context 和 resolver 都使用同一个数组。
- `previewKeybindingResolution()` 使用传入的 `activeLayers` 调 `getLayerPriorityOrder(activeLayers)`。
- `resolveLegacyBinding()` 增加 `activeLayers` 参数；没有传入时仍读取当前栈，避免 shadow mismatch。
- 可删除未使用的 `getEffectiveLayer()` / `findBinding()`，但不做额外重构。

### 4. `hotkeyBindings.js` 增加 setting 子层阻断

新增两个内部层的 wildcard binding，并标记为内部绑定：

```js
{ layer: 'setting-shortcut-record', shortcutId: '*', features: ['setting-overlay-block'], internal: true },
{ layer: 'setting-when-edit', shortcutId: '*', features: ['setting-overlay-block'], internal: true }
```

处理要求：

- `setting-overlay-block` handler 返回 `{ handled: true, preventDefault: false, stopPropagation: true }`，只阻止快捷键系统穿透，不破坏弹窗内输入控件的默认输入。
- 若录制弹窗已有独立 `keydown` 捕获逻辑，仍保留该逻辑；这里的 wildcard 只兜底阻断 setting 层滚动/Tab 切换。
- 不新增公开 command，不进入设置页可改键列表；`commandKeybindings` 跳过 `internal: true` binding，`shortcutStore` 在运行时把内部 feature-only binding 合并回 effective bindings。
- `keybindingResolver` 在传入 `layerPriority` 时过滤不在 active layer 列表中的非 main 层候选，避免 inactive wildcard 吞掉设置页未绑定按键。

### 5. `keybindingResolver.js` 移除 overlayScore

删除 `OVERLAY_CONTEXT_KEYS` 与 `overlayScore()`。`resolveWeight()` 只保留：

- `sourceWeight`
- explicit `weight`
- `whenSpecificity`
- wildcard penalty
- index tie-breaker

层优先级只由 `layerPriority` 决定；如果调用方未传 `layerPriority`，未知层候选权重应低于已知 active 层，避免测试直接调用时误以为 overlay 自动优先。

### 6. 测试迁移

更新 [test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2329)：

- `buildHotkeyContextSnapshot({ currentLayer: 'clip-drawer' })` 应断言 `mainFocus=false`、`drawerOpen=true`。
- `resolveKeybinding()` overlay 场景必须传 `layerPriority`，例如 `['clip-drawer', 'main']`。
- 新增 pin-group-edit 与 main 同键断言：`a-u` 解析到 `pin.group.edit.moveUp`，main `list.navigate.pageUp` 不命中。
- 新增 setting 子层断言：`setting-shortcut-record` 与 `setting-when-edit` 都保留 feature-only runtime binding；对应 active layers 下 `up` 解析到 `setting-overlay-block`，不是 `setting.scroll.up`。
- 新增 inactive wildcard 断言：active layers 只有 `['setting']` 时，未绑定键不被 setting 子层 wildcard 吞掉，`up` 仍解析到 `setting.scroll.up`。
- 新增 legacy 兼容断言：`resolveLegacyBinding('esc', { currentLayer: 'clip-drawer', bindingList })` 未传 `activeLayers` 时仍返回 drawer binding。
- 新增嵌套断言：active layers 为 `['clip-drawer', 'tag-edit']` 时，`esc` 解析到 `tag.edit.close`。

---

## 文件变更范围

| 文件 | 变更内容 |
|---|---|
| [src/global/hotkeyLayers.js](../../../src/global/hotkeyLayers.js:1) | 新增优先级表、`getLayerPriority()`、支持快照参数的 `getLayerPriorityStack()` |
| [src/global/hotkeyContext.js](../../../src/global/hotkeyContext.js:33) | `mainFocus` 改为排除所有高于 main 的已知 active layer |
| [src/global/hotkeyRegistry.js](../../../src/global/hotkeyRegistry.js:160) | dispatch、preview、legacy 统一使用 `getLayerPriorityStack(activeLayers)` |
| [src/global/keybindingResolver.js](../../../src/global/keybindingResolver.js:34) | 删除 `overlayScore`，同层才比较 source/weight/specificity |
| [src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js:94) | 增加 setting 子弹窗内部 wildcard 阻断 binding |
| [src/global/commandKeybindings.js](../../../src/global/commandKeybindings.js:133) | command profile 跳过内部 binding，避免阻断项进入设置页命令模型 |
| [src/global/shortcutStore.js](../../../src/global/shortcutStore.js:45) | runtime effective bindings 合并内部 feature-only binding |
| [src/views/Setting.vue](../../../src/views/Setting.vue:2648) | 注册 `setting-overlay-block` feature handler，阻断子弹窗快捷键穿透 |
| [test-shortcut-command-system.js](../../../test-shortcut-command-system.js:2329) | 迁移旧 overlay fallback 断言，新增层级优先级回归用例 |

---

## 验收标准

- 主界面无弹层时：`mainFocus=true`，`a-u` / `a-e` 仍执行主列表翻页。
- `pin-group-edit` 打开时：`mainFocus=false`，`pinGroupEditOpen=true`，`a-u` / `a-e` 只执行置顶组合编辑移动。
- `clip-drawer` 打开时：`mainFocus=false`，drawer 自身绑定和 wildcard block 高于 main。
- `tag-edit` 在 drawer 上打开时：`tag-edit` 高于 `clip-drawer`，`esc` 关闭 tag-edit，不关闭 drawer。
- `setting-shortcut-record` 或 `setting-when-edit` 打开时：方向键、Tab 等不触发 setting 页面滚动或 tab 切换；弹窗输入默认行为不被 `preventDefault` 破坏。
- 移除 `overlayScore` 后，resolver 仍通过 layer priority 决定弹层优先级。
- `node test-shortcut-command-system.js` 通过；`pnpm run build` 通过。

---

## 翻页失效排查顺序

主界面 `a-u` / `a-e` / `PageUp` / `PageDown` 失效时，先区分“默认能力不可用”与“运行期用户配置覆盖”：

1. 先查运行期覆盖：设置页快捷键记录、SQLite `cmd:list.navigate.pageUp` / `cmd:list.navigate.pageDown`、fallback `setting.hotkeyOverrides` 是否禁用或改键。
2. 再查默认映射：默认 binding 是否仍由 [src/global/hotkeyBindings.js](../../../src/global/hotkeyBindings.js:324) 指向 `list-page-up` / `list-page-down`，command 是否由 [src/global/commandDefaults.js](../../../src/global/commandDefaults.js:78) 合并为 `list.navigate.pageUp` / `list.navigate.pageDown`。
3. 再查 dispatcher：`eventLikeToShortcutId()`、`resolveKeybinding()`、`dispatch()` 是否能在 `mainFocus=true`、active layers 为空或仅 `main` 时命中。
4. 最后查业务 handler 与滚动路径：[src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:2146) 的 page handler、[src/hooks/useVirtualListScroll.js](../../../src/hooks/useVirtualListScroll.js:364) 的 page target、真实滚动容器 `scrollParentRef`。

2026-06-14 复核结论：一次主界面翻页失效由用户快捷键覆盖导致；默认映射、dispatch、层级与 handler 链路均可用。后续不要在未排除用户 override 前把该类问题归因到层级阻断或滚动函数。

---

## 风险与边界

- 这是行为语义变更：用户自定义 `when: mainFocus` 的宏在弹层打开时将不再触发，符合新的“主界面基础层”定义。
- 若存在未登记的 active layer，默认优先级为 `0`，不会压过 main；实现时必须在新增层时同步更新优先级表。
- 不改 conflict 检测的互斥组；如后续需要让 `mainFocus` 与 overlay key 在冲突检测中完全互斥，可另开任务同步 [src/global/whenBuilder.js](../../../src/global/whenBuilder.js:45)。
- 不改存储迁移；历史用户 override 的 `when` 文本保持原样，由新的上下文语义自然生效。
