# Error Memory Rules

## 目标
- 在实现前先检索仓库内已知错误经验，减少同类问题上的重复试错。
- 在失败后把高价值结论沉淀到仓库，而不是留在聊天记录里。
- 把“症状 -> 证伪路径 -> 已确认通路 -> 决策规则”结构化，供后续 AI 自动复用。

## 阅读顺序
1. 先读本文件。
2. 按“路径 / 模块 / 症状 / 关键 API / 运行环境”检索索引表。
3. 命中记录时，先读对应正文，再进入 `spec`、`plan` 或实现阶段。

## 错误类型
- `root-cause-misread`: 误判根因，把表象当根因。
- `framework-misuse`: 错用框架、库、组件或 API 能力。
- `runtime-path-mismatch`: 错认真实运行通路、真实滚动祖先、真实事件链、真实数据源。
- `invalid-verification`: 验证方式无效，导致结论失真。
- `repeated-trial`: 已证伪路径被重复尝试。
- `over-abstraction`: 过早抽象或过度重构，偏离最短可证实路径。
- `environment-assumption`: 对 `uTools`、浏览器、打包或插件运行环境假设错误。

## 检索触发规则
- 按路径或模块匹配，例如 `src/cpns/ClipItemList.vue`、`src/global/`、`public/preload.js`。
- 按症状匹配，例如“`active` 正常但自动滚动无效”“用户手动可用但程序调用无效”“只在插件环境异常”。
- 按关键 API 或关键逻辑匹配，例如 `scrollIntoView`、`scrollTop`、`scrollToIndex`、热键分发、窗口焦点。
- 按运行环境匹配，例如浏览器、`uTools` 插件、开发服务、构建产物。

## 强制行为
- 进入实现前，必须先按“路径 + 症状 + API + 环境”检索索引表。
- 命中记录时，必须先阅读正文，再决定方案。
- 若连续两次修复都未命中真实通路，禁止继续同方向微调，必须回到“确认真实运行通路”。
- 已证伪方案除非有新证据，否则禁止重复尝试。
- 发现新的失败模式时，必须补充或更新 `vibe/vibe-doc/ai-error-memory/` 的记录与索引。
- 如果本次任务命中了历史记录，`plan`、`verify`、最终说明都要写明“采用 / 规避了什么”。

## 处理优先级
1. 先确认是否已有同类记录。
2. 有记录时，优先采用“已确认通路”或“推荐优先策略”。
3. 无记录时，先验证真实运行通路，再做策略微调。
4. 如果验证路径本身可能失真，先修正验证路径，不继续实现。

## 记录索引
| id | type | symptoms | affected_paths | trigger_keywords | wrong_paths | confirmed_path | decision_rule | record_link |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EM-2026-04-06-hideMainWindow-showMainWindow-api-race | `runtime-path-mismatch`, `environment-assumption` | `hideMainWindow` 后主窗口再次弹出、自动粘贴落点错误 | `src/cpns/ClipItemList.vue`, `src/utils/index.js` | `hideMainWindow`, `showMainWindow`, `closeExternalPreview`, `blur`, `simulateKeyboardTap`, `paste` | 未确认 `showMainWindow` 调用栈即调粘贴时机或延迟 | `blur` → `stopImagePreview` → `closeExternalPreview`；仅在实际关闭外部预览后再 `focusUtoolsMainWindow` | 若出现 hide 后立即 show，先用 trace 查是否 `closeExternalPreview` 无条件聚焦 | [EM-2026-04-06-hideMainWindow-showMainWindow-api-race](../vibe-doc/ai-error-memory/2026-04-06-hideMainWindow-showMainWindow-api-race.md) |
| EM-2026-04-06-scroll-path | `runtime-path-mismatch`, `framework-misuse`, `repeated-trial` | `active` 正常、鼠标滚轮正常、程序性自动滚动无效 | `src/cpns/ClipItemList.vue`, `src/hooks/useVirtualListScroll.js`, `src/style/cpns/clip-item-list.less` | `scroll`, `active`, `scrollTop`, `scrollToIndex`, `scrollIntoView`, `uTools` | 虚拟列表 `scrollToIndex(center)`、手动 `scrollTop`、阈值微调 | 普通列表 + 目标节点原生 `scrollIntoView()` | 若“用户手动滚动正常但程序滚动异常”，优先检查真实滚动祖先和原生 DOM 通路，不先调策略阈值 | [EM-2026-04-06-scroll-path](../vibe-doc/ai-error-memory/2026-04-06-scroll-path.md) |
| EM-2026-04-06-json-db-debounce-persist | `framework-misuse` | 删除/改库后会话内正确，重进插件后数据回退 | `src/global/initPlugin.js` | `updateDataBaseLocal`, `debouncedWriteLocal`, `writeFileSync`, 重启, JSON | 误以为内存变更即已持久化 | 防抖到期时 `updateDataBaseLocal(undefined, { immediate: true })` 真正写盘 | 若“界面已更新但重进丢失”，先查 JSON 防抖落盘是否进入 `immediate` 分支 | [EM-2026-04-06-json-db-debounce-persist](../vibe-doc/ai-error-memory/2026-04-06-json-db-debounce-persist.md) |
| EM-2026-04-08-clipboard-nav-scroll-search-layout | `runtime-path-mismatch`, `environment-assumption`, `framework-misuse` | 首项滚没、上移顶行裁切、搜索误退、IME Enter 误触、顶栏下大块空白 | `Main.vue`, `ClipItemList.vue`, `ClipSearch.vue`, `useVirtualListScroll.js`, `hotkeyRegistry.js` | `clip-break`, `scrollIntoView`, `scrollTop`, `isComposing`, `preferItemId`, `list-nav-up` | 仅调 center 阈值；首项 `scrollIntoView(start)`；盲增 `clip-break` | 近顶用 end 对齐；首项 `scrollTop=0`；composition/搜索焦点短路；`preferItemId`∈保留集；`.clip-break` 匹配顶栏 | 顶栏留白或首项异常时读本条再改滚动/布局 | [EM-2026-04-08-clipboard-nav-scroll-search-layout](../vibe-doc/ai-error-memory/2026-04-08-clipboard-nav-scroll-search-layout.md) |
| EM-2026-04-09-alias-prompt-hotkey-layer | `environment-assumption`, `framework-misuse`, `runtime-path-mismatch` | F2 已触发但别名编辑不可见；弹窗输入态与主层 Enter/Escape 快捷键冲突（Esc 误退插件）；抽屉无别名入口且 `ctrl+alt+num` 仅开抽屉不执行；IDEA 文件树粘贴别名不稳定 | `src/cpns/ClipItemList.vue`, `src/views/Main.vue`, `src/utils/index.js`, `src/global/hotkeyRegistry.js` | `window.prompt`, `ElMessageBox.prompt`, `list-enter`, `list-save-by-alias`, `main-escape`, `list-drawer-sub-*`, `ctrl+alt+num`, `copyFile`, `uTools` | 在插件容器内继续使用 `window.prompt` 并忽略热键层级冲突；把序号快捷实现成“仅开抽屉”；假设改文件字节可改变粘贴名 | 使用 `ElMessageBox.prompt` + 弹窗打开态短路 Enter 类快捷键 + `main-escape` 弹窗态优先取消并消费事件 + `list-drawer-sub-*` 直接执行序号操作 + 别名文件唯一临时子目录/写盘校验 + 图片别名双轨回退 | 若“按键触发但无可见交互、Esc 误退插件、c-a-num 未自动执行或 IDEA 落名异常”，先验热键层级与 `copyFile` 路径对象是否真正命中目标动作 | [EM-2026-04-09-alias-prompt-hotkey-layer](../vibe-doc/ai-error-memory/2026-04-09-alias-prompt-hotkey-layer.md) |
| EM-2026-04-10-selected-item-render-update-delay | `runtime-path-mismatch`, `framework-misuse` | 选中item进行加锁/别名编辑等操作，处于选中时不能快速更新图标等渲染效果，移动后可以快速触发 | `src/cpns/ClipItemList.vue` | `selected-item`, `lock`, `alias`, `collect`, `render-update`, `isItemCollected`, `getItemAlias` | 强制刷新 selectItemList、更新 item.updateTime、v-memo 依赖、forceUpdate、listKey 重新渲染等 | 修改 `isItemCollected` 和 `getItemAlias` 函数优先检查 item 对象属性；操作后直接修改 showList 中对应 item 的属性（locked/collected/alias） | 若"选中状态下操作不立即更新渲染"，先检查渲染数据源是 showList 还是 selectItemList，并确认读取函数是否优先检查 item 对象属性 | [EM-2026-04-10-selected-item-render-update-delay](../vibe-doc/ai-error-memory/2026-04-10-selected-item-render-update-delay.md) |
| EM-2026-04-10-alias-material-lifecycle | `framework-misuse`, `environment-assumption` | 别名粘贴每次写 `temp` 随机目录、无法复用、改别名/删条目后磁盘孤儿文件堆积 | `src/utils/index.js`, `src/cpns/ClipItemList.vue`, `src/global/initPlugin.js` | `alias-material`, `userData`, `item.alias.map`, `removeItemViaId`, `writeAliasMaterialFile`, `meta.json` | 仅靠随机 `temp` 子目录承载别名文件且不挂清理 | `userData/.../alias-material/<itemId>/` + 内容指纹复用 + 别名变更清缓存 + 删除条目清目录与映射 | 若讨论「别名文件放哪、是否复用、何时删」，先读本条再改路径策略 | [EM-2026-04-10-alias-material-lifecycle](../vibe-doc/ai-error-memory/2026-04-10-alias-material-lifecycle.md) |
| EM-2026-04-10-utools-runtime-assets | `runtime-path-mismatch`, `environment-assumption` | Electron 报 `Unable to load preload script: dist/preload.js`，随后 `window.exports` 为 `undefined` | `vite.config.js`, `package.json`, `scripts/utools-runtime-assets.mjs`, `dist/preload.js` | `preload.js`, `plugin.json`, `dist`, `public`, `window.exports`, `pnpm run serve`, `uTools` | 从历史提交恢复 `public/` 或只改 `plugin.json` 路径 | 入口源已迁到脚本生成：`serve` 前先生成 `dist` 运行时资产，`build` 在 Vite `closeBundle` 后生成 | 若 `dist/preload.js` 缺失，先查 `prepare:utools` 与 Vite 资产生成链路，不回滚旧 `public/` | [EM-2026-04-10-utools-runtime-assets](../vibe-doc/ai-error-memory/2026-04-10-utools-runtime-assets.md) |
| EM-2026-04-16-utools-default-window-list-visibility | `environment-assumption`, `invalid-verification`, `runtime-path-mismatch` | 默认窗连续下移多步后高亮不在列表可视区；上移时顶部漏一条；误用 6 条/12 行口径 | `src/hooks/useVirtualListScroll.js`, `src/cpns/ClipItemList.vue`, `src/views/Main.vue` | `uTools`, `applyScrollToItemIndex`, `submitNavigationAction`, `runNavigationScroll`, `list-nav-up`, `scrollIntoView`, `scrollParentRef`, `NAVIGATION_PRIORITIES`, 图片 tab | 先调 inset/容器/阈值却绕开 `scrollIntoView` 主通路；把上移下移都压成 `nearest`；大视口验证 | 目标节点存在时优先原生 `scrollIntoView()`；首项 `scrollTop=0`；上移需要滚动时用 `edge-align + end`；直接改 `activeIndex` 的旁路要补可见性同步 | 若“默认窗+图片 tab”出现长距离不跟滚或上移漏一条，先读 EM-2026-04-06 与 EM-2026-04-08，再按本条恢复 DOM 主通路和上移 `end` reveal 语义 | [EM-2026-04-16-utools-default-window-list-visibility](../vibe-doc/ai-error-memory/2026-04-16-utools-default-window-list-visibility.md) |
| EM-2026-04-16-lock-action-refresh-path | `runtime-path-mismatch`, `root-cause-misread`, `invalid-verification` | `ctrl+u` / `ctrl+Enter` 后锁图标反馈慢；加锁后紧接移动发涩；误判成监听丢失或持久化慢 | `src/cpns/ClipItemList.vue`, `src/views/Main.vue`, `src/global/initPlugin.js` | `ctrl+u`, `ctrl+Enter`, `setLock`, `setLocks`, `queuePersist`, `onDataRemove`, `handleDataRemove`, `updateShowList`, `copyAndPasteAndExit`, `lockFilter` | 先查热键监听；为立即反馈无条件 `emit("onDataRemove")`；把慢点都归因到 `setLock` 写盘 | 即时锁态应直接同步 `showList` 并让单/批量 item 在子组件内独立渲染；`setLock` 仅做内存更新 + 防抖写盘；真正重的是 `handleDataRemove -> updateShowList` 整表刷新，只有筛选结果成员会变化时才应触发 | 若“加锁能生效但反馈慢 / 锁后立刻移动卡”，先查是否仍把普通锁图标刷新绑在父层整表刷新上，而不是先改监听或持久化 | [EM-2026-04-16-lock-action-refresh-path](../vibe-doc/ai-error-memory/2026-04-16-lock-action-refresh-path.md) |

## 记录模板
```md
# Error Memory: <id>

## 1. 背景与症状
## 2. 错误归类
## 3. 误判链路
## 4. 已证伪方案
## 5. 已确认通路
## 6. 适用触发条件
## 7. 禁止再试的做法
## 8. 推荐优先策略
## 9. 关联文件 / 模块
## 10. 后续观察点
```

## 维护规则
- 新记录必须同步更新索引，否则视为未沉淀。
- 旧记录失效时，要在索引和正文里明确标注替代方案。
- 没有形成可复用结论的临时试错，不写入索引。
