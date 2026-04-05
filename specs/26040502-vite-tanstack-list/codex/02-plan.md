# Plan: Vite + TanStack Virtual 列表重构

## 1. 变更目标
- 将工程底座从 `Vue CLI + webpack 4` 迁移到 `Vite`，保留 `uTools` 插件静态入口和运行方式。
- 用 `TanStack Virtual` 替代当前主列表虚拟滚动核心，重写单步导航、半分页/分页、删除恢复、懒加载衔接逻辑。
- 将主列表交互从“单组件内多职责堆叠”收敛为“父层数据真相源 + 列表导航状态层 + 行渲染层”的结构，降低回归面。

## 2. 现状与根因
- 工程层：
  - [`package.json`](../../../package.json#L1) 当前脚本仍是 `vue-cli-service serve/build`，依赖仍包含 `vue-virtual-scroller` 和 `webpack`，与目标基线不一致。
  - [`public/index.html`](../../../public/index.html#L1) 仍使用 webpack 模板变量 `<%= htmlWebpackPlugin.options.title %>`，迁移到 Vite 时必须改为静态入口格式。
  - [`public/plugin.json`](../../../public/plugin.json#L1) 当前开发入口固定指向 `http://localhost:8081/`，Vite 迁移后要同步开发地址契约。
  - [`src/main.js`](../../../src/main.js#L1) 启动链路依赖 `initPlugin()` 先完成宿主初始化，再挂载 Vue，说明迁移不能破坏插件环境启动顺序。
- 列表数据层：
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L927) 以 `currentShowList` 作为最终展示列表，普通列表与收藏块混排的真相源仍在父层。
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L958) 的 `handleDataRemove` 会刷新 `window.db.dataBase.data`、重置 `offset` 并重算列表。
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L977) 到 [`src/views/Main.vue`](../../../src/views/Main.vue#L1052) 已承担删除后的索引归位逻辑，说明父层已经部分介入高亮恢复。
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L1223) 的 `loadMoreData` 以 `offset + GAP` 方式增量扩展 `showList`，列表组件当前只是通过事件触发懒加载。
- 列表交互层：
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1) 当前同时承担虚拟滚动、快捷键、预览、多选、删除、收藏、锁定、懒加载与抽屉逻辑，职责过载。
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1528) 的 `scrollActiveNodeIntoView` 同时混用 `scrollToItem`、`scrollIntoView` 和手动 `scrollTop` 兜底，导致“已可见仍滚动”和行为不一致。
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1693) 到 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1765) 的分页步长、半页滚动依赖 `min-item-size` 和 DOM 容器估算，逻辑分叉明显。
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1840) 到 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1905) 同时维护 `pendingNavAfterLoad`、删除后高亮恢复、边界修正，和父层删除恢复存在重复职责。
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1937) 到 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L2280) 在热键注册中再次实现单步、翻页、底部加载、删除与强删，说明导航行为入口不统一。
- 行渲染与样式层：
  - [`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L1) 已将收藏、锁、标签和单行压缩集中在行组件。
  - [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L119) 到 [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L231) 已提供 `compact`、图片行和行头图标布局规则，但仍依赖主列表刷新时机保证视觉稳定。

## 3. 设计方案
### 3.1 分阶段策略
- 采用“两阶段”推进，先完成构建迁移，再切换列表内核，避免 `Vite` 问题和列表问题同时叠加后难以定位。
- 阶段 A：只迁移到 `Vite`，让 [`src/main.js`](../../../src/main.js#L1)、[`public/plugin.json`](../../../public/plugin.json#L1)、[`public/preload.js`](../../../public/preload.js#L1) 和基础页面加载跑通。
- 阶段 B：在阶段 A 稳定后，用 `TanStack Virtual` 替换 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1) 的虚拟滚动内核，并统一导航、删除恢复和懒加载。

### 3.2 工程迁移方案
- 引入 `Vite` 作为新的开发与构建工具，保留静态 `index.html` 输出和 `public/` 资源直出模式。
- 将开发入口统一到 Vite dev server，并与 [`public/plugin.json`](../../../public/plugin.json#L1) 的 `development.main` 保持一致。
- 保持 [`public/preload.js`](../../../public/preload.js#L1) 与 [`public/listener.js`](../../../public/listener.js#L1) 的宿主协议不变，只核验新构建产物下的相对路径和加载方式。
- 不在本阶段顺手切换存储后端；[`src/global/initPlugin.js`](../../../src/global/initPlugin.js#L1) 与 [`src/global/utoolsDB.js`](../../../src/global/utoolsDB.js#L1) 仅做兼容性边界确认。

### 3.3 列表架构方案
- 保持 [`src/views/Main.vue`](../../../src/views/Main.vue#L927) 的 `currentShowList` 为最终数据真相源，不在列表组件内再造展示数据。
- 重写 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1) 的虚拟滚动内核，改用 `TanStack Virtual` 管理可视区、偏移和目标项定位。
- 将列表内部状态拆为三部分：
  - 导航状态：`activeIndex`、分页步长、删除锚点、懒加载待落点。
  - 滚动策略：只保留一套“完全可见不滚、不可见最小滚动、分页按统一对齐”的滚动实现。
  - 行交互与预览：保留点击、hover、Shift 预览、抽屉、复制等业务行为，但不再反向驱动虚拟滚动策略。
- 快捷键层保持 [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1) / [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) 的 feature 语义稳定，列表内核只替换 feature 的落地实现。

### 3.4 删除与状态刷新方案
- 以父层 [`src/views/Main.vue`](../../../src/views/Main.vue#L1007) 的 `handleItemDelete` 为删除主控，统一普通删除、强删、批量删除后的 anchor 语义。
- 列表组件只消费删除后的目标索引或目标项 id，不再同时在父子两层做高亮恢复。
- 收藏/锁定更新继续通过 item 数据变化驱动 [`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L21) 的行头渲染，不依赖额外导航才能刷新。

### 3.5 样式与结构方案
- 延续 [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L119) 现有紧凑样式和单行布局，不做无必要 UI 重设计。
- 新列表 DOM 结构尽量保持现有 `.clip-item-list / .clip-item / .clip-info / .clip-data` 语义，降低样式迁移成本。

## 4. 受影响文件
- 构建与入口
  - [`package.json`](../../../package.json#L1)：替换脚本、补充 Vite 依赖、移除旧构建依赖。
  - [`public/index.html`](../../../public/index.html#L1)：改为 Vite 可用入口模板。
  - [`public/plugin.json`](../../../public/plugin.json#L1)：同步 dev 入口地址，必要时核对主入口产物路径。
  - [`public/preload.js`](../../../public/preload.js#L1)：仅做兼容性核验，原则上不改注入协议。
  - [`public/listener.js`](../../../public/listener.js#L1)：核验构建与插件产物下的相对路径仍可用。
  - `vite.config.js` 或同类配置：新增构建输出、别名、静态资源策略。
- 主列表核心
  - [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1)：重写虚拟列表与导航内核。
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L927)：收敛删除恢复、列表接口与懒加载对接。
  - [`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L1)：适配新列表数据流，保证锁/收藏即时刷新。
  - [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L1)：适配 TanStack Virtual 容器结构与保持现有视觉。
- 运行期与热键约束
  - [`src/global/initPlugin.js`](../../../src/global/initPlugin.js#L1)：兼容历史数据与运行期初始化，不做业务语义改造。
  - [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1)：保持 feature 注册层稳定。
  - [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1)：回归现有绑定表。
- 可新增模块
  - `src/hooks/useListNavigation.js`：导航状态与删除恢复收敛点。
  - `src/hooks/useVirtualListScroll.js`：最小滚动、分页对齐、目标项定位。
  - `src/utils/listSelection.js`：多选与删除保留逻辑，如需要再抽离。

## 5. 数据与状态变更
- 保持不变
  - 不修改 `window.db` 数据结构和收藏分离模型。
  - 不修改 `uTools` feature code、插件入口能力和 `preload` 注入协议。
  - 不删除 [`src/global/initPlugin.js`](../../../src/global/initPlugin.js#L1) 中历史兼容补齐逻辑。
  - `currentShowList` 继续由父层计算，普通列表、收藏块、搜索和锁筛选结果不改变来源。
- 计划调整
  - `activeIndex` 仍由列表组件暴露，但语义收敛为唯一高亮真相源。
  - `pendingNavAfterLoad`、删除锚点、待恢复高亮项等临时状态从散落的 watch / hotkey 分支收敛到统一导航状态层。
  - 父层删除后只传递最终需要恢复的 anchor 语义，子层只负责执行定位和滚动，不再自行推导多套删除恢复逻辑。

## 6. 接口与交互变更
- 对用户
  - 插件入口、列表浏览、搜索、收藏、锁定、复制、删除和多选操作方式保持不变。
  - 单步导航改为严格“完全可见才停、不完全可见才最小滚动”。
  - 长按与分页统一到同一分页规则，不保留互相覆盖的旧滚动分支。
- 对父子组件接口
  - [`src/views/Main.vue`](../../../src/views/Main.vue#L127) 传给 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1) 的 `showList`、`collectedIds`、`loadMore` 等基础接口尽量保留。
  - `defineExpose` 预计保留 `activeIndex`、`setKeyboardActiveIndex` 两个核心能力，若需新增“删除后恢复”或“滚动到目标项”接口，优先一次性收敛而非增加临时补丁。
  - 行级事件 `onDataChange / onDataRemove / onItemDelete / openTagEdit` 保持既有语义，减少 `Main.vue` 联动面。

## 7. 插件入口与产物契约
- [`public/plugin.json`](../../../public/plugin.json#L1) `main`
  - 作用：插件入口 HTML。
  - 要求：构建后对应入口必须存在且可被 `uTools` 打开。
- [`public/plugin.json`](../../../public/plugin.json#L1) `preload`
  - 作用：预加载脚本入口。
  - 要求：与入口页面的相对路径契约不变。
- [`public/plugin.json`](../../../public/plugin.json#L1) `development.main`
  - 作用：开发模式 URL。
  - 要求：Vite dev server 端口必须与其一致，或同步修改该字段。
- 构建输出目录
  - 作用：承载 `index.html`、`plugin.json`、`preload.js`、静态资源。
  - 要求：满足当前插件打包与本地加载约定，不能只保证浏览器可打开。

## 8. 实施步骤
1. 阶段 A：建立 Vite 基线，迁移 `serve/build` 脚本并保证 [`src/main.js`](../../../src/main.js#L1) 启动链在 Web 环境下可跑通。
2. 阶段 A：核对 [`public/index.html`](../../../public/index.html#L1)、[`public/plugin.json`](../../../public/plugin.json#L1)、[`public/preload.js`](../../../public/preload.js#L1)、[`public/listener.js`](../../../public/listener.js#L1) 在新构建模式下的入口与资源路径约定。
3. 阶段 A：抽样回归基础页面、列表打开、搜索和插件开发模式加载，确认不是构建层问题。
4. 阶段 B：替换 `vue-virtual-scroller`，引入 `TanStack Virtual` 并搭建列表基础容器。
5. 阶段 B：抽离导航状态与滚动策略，实现统一的单步、半分页、分页、底部加载与删除后恢复。
6. 阶段 B：重写 `ClipItemList.vue`，保留现有业务事件，移除旧的多套 DOM 滚动兜底。
7. 阶段 B：调整 `Main.vue` 的删除恢复和懒加载协作，确保父子职责边界清晰。
8. 阶段 B：适配 `ClipItemRow.vue` 与 `clip-item-list.less`，确保锁/收藏即时刷新、单行布局与图片行表现稳定。
9. 回填 `03-tasks.md` 和后续 `04-verify.md`，按任务闭环执行。

## 9. 测试与验证方案
- 工程验证
  - 执行 `pnpm run serve`，确认开发环境可启动。
  - 执行 `pnpm run build`，确认产物可生成，且 `dist/plugin.json`、静态入口存在。
- 阶段 A 验证
  - 浏览器打开开发地址可加载页面。
  - `uTools` 开发模式能打开插件首页，且 `preload` 未因路径变化失效。
- Web 层验证
  - 普通列表、收藏页、`*` 搜索混排、锁筛选、懒加载、多选删除、强制删除回归通过。
  - 单步导航、长按导航、分页导航、高亮恢复与锁/收藏即时刷新符合 spec。
- 插件环境验证
  - 在 `uTools` 环境中验证主窗口可打开、搜索、导航、删除、收藏和锁定。
  - 核验 `preload.js` 注入能力未受构建迁移影响。
- 未完成项记录要求
  - 若插件环境未实测，只能标记为未验证，不写成通过。

## 10. 风险与回滚点
- 风险 1：Vite 迁移后 `plugin.json` 的开发入口、静态资源路径或 `preload` 加载失败。
  - 回滚点：先保留旧脚本和旧入口契约，确认新基线稳定后再完全替换。
- 风险 2：新虚拟列表的目标项定位与当前隐式语义不一致，导致导航或删除恢复回归。
  - 回滚点：保持 `Main.vue` 数据层稳定，只替换列表渲染与滚动内核。
- 风险 3：`ClipItemList.vue` 目前承载预览、多选、抽屉、复制等旁路逻辑，重写时容易误伤。
  - 缓解方式：优先保留外部事件语义和行组件结构，先替换导航内核，再逐步收敛旁路逻辑。
- 风险 4：锁/收藏状态刷新与行头布局在新虚拟容器下出现重排或样式错位。
  - 缓解方式：沿用现有行组件和样式命名，减少 DOM 语义改动。
- 风险 5：快捷键 feature 名、注册时机或 layer 断裂，导致主界面操作不可用。
  - 回滚点：冻结热键绑定表，只回退列表内部实现，保持 [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1) 和 [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) 不变。

## 11. 待确认项
- 无。阶段顺序明确为“先 Vite，再 TanStack 列表”，且继续按已确认 feature-id `26040502-vite-tanstack-list` 和 S2 路线推进。
