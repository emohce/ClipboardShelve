# Plan: Vite + TanStack Virtual 列表重构

## 1. 变更目标
- 将工程底座从 `Vue CLI + webpack 4` 迁移到 `Vite`，保留 `uTools` 插件静态入口和运行方式。
- 用 `TanStack Virtual` 替代当前主列表虚拟滚动核心，重写单步导航、半分页/分页、删除恢复、懒加载衔接逻辑。
- 将主列表交互从“单组件内多职责堆叠”重构为“导航状态层 + 滚动策略层 + 行渲染层”的可维护结构。

## 2. 现状与根因
- 工程层面：
  - 当前 [`package.json`](../../package.json#L1) 仍以 `vue-cli-service` 构建，而锁文件已解析到更新版本的 Vue 生态，说明声明依赖与实际安装存在漂移。
  - 当前产物和插件入口依赖 `public/` 目录约定，迁移构建工具时需要重新梳理静态资源与输出目录契约。
- 列表层面：
  - [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1528) 中 `scrollActiveNodeIntoView` 的虚拟滚动分支和 DOM 分支行为不一致，是“可见却仍滚”的直接根因。
  - [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1783)、[`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2012)、[`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2330) 三处维护不同分页路径，是长按和分页不稳定的根因。
  - [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1870) 与 [`src/views/Main.vue`](../../src/views/Main.vue#L984) 双重维护删除恢复，是删除后高亮错位和闪烁的根因。
  - [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19) 和 [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L192) 已有压缩样式基础，但状态刷新和布局规则仍过于依赖主列表刷新时机。
- 架构层面：
  - 当前列表组件同时处理虚拟滚动、键盘事件、hover 预览、多选、删除、锁定和懒加载，导致任意交互变化都容易产生牵一发动全身的副作用。

## 3. 设计方案
- 工程迁移
  - 使用 `Vite` 作为新的开发与构建工具。
  - 保持 `index.html` 为入口，确保 `uTools` 可继续加载静态页面。
  - 重新梳理 `public/` 与构建产物关系，确保 `plugin.json`、`preload.js` 和其他静态资源在开发和构建环境下都可访问。
- 列表重构
  - 使用 `TanStack Virtual` 实现主列表虚拟化。
  - 新列表内核分为三层：
    - 导航状态层：维护 `activeIndex`、分页步长、删除后锚点、懒加载状态。
    - 滚动策略层：统一处理最小滚动、居中滚动、边界可见性和目标项定位。
    - 行渲染层：负责展示、锁/收藏状态、单行压缩、选中样式。
  - 单步、分页、长按、删除恢复全部只通过统一导航入口推进，禁止多套并行滚动器。
- 状态职责
  - `Main.vue` 继续作为 `currentShowList` 真相源，负责列表数据源与删除后的最终落点。
  - 新列表组件只消费最终展示列表，不再内部再造第二套数据来源。
  - 锁/收藏状态更新以 item 数据变化为主驱动，不依赖 `activeIndex` 变化带动重渲染。
- 样式与体验
  - 保持现有视觉语言，不做无必要 UI 重设计。
  - 行头图标、时间、标签和正文统一单行压缩策略，优先避免换行和布局抖动。

## 4. 受影响文件
- 构建层：
  - [`package.json`](../../package.json#L1)：替换脚本、更新依赖。
  - [`public/index.html`](../../public/index.html#L1)：适配 Vite 入口格式。
  - [`public/plugin.json`](../../public/plugin.json#L1)：仅在开发入口或产物路径需要时做必要调整。
  - [`public/preload.js`](../../public/preload.js#L1)：核验在 Vite 产物模式下仍可正常工作。
  - 新增 `vite.config.*`、必要的脚本与可能的别名配置。
- 列表层：
  - [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1)：大概率重写。
  - [`src/views/Main.vue`](../../src/views/Main.vue#L922)：适配新列表接口和删除恢复主控逻辑。
  - [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19)：行头渲染和即时刷新兼容。
  - [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L192)：新列表结构下的样式适配。
- 可新增模块：
  - `src/hooks/useListNavigation.js`
  - `src/hooks/useVirtualListScroll.js`
  - `src/utils/listSelection.js`
  - 具体命名可在实现阶段按现有风格微调。

## 5. 数据与状态变更
- 不变：
  - 不改 `window.db` 数据结构。
  - 不改收藏与普通历史的分离模型。
  - 不改插件 feature code 和主业务入口。
- 调整：
  - `activeIndex` 从“列表组件内部复杂副作用中心”重构为导航状态层的单一真相源。
  - `pendingNavAfterLoad`、删除锚点、分页方向等临时状态会收敛到新的导航 hook 或内部状态模块。
  - `currentShowList` 继续由 `Main.vue` 计算，列表组件只依赖此最终数据。

## 6. 接口与交互变更
- 对用户：
  - 插件入口和主要操作方式保持不变。
  - 主列表导航、分页、删除、高亮恢复和锁/收藏反馈会更稳定。
- 对组件：
  - 允许重构 `ClipItemList` 的内部实现与对父层暴露的方法，但尽量保持父层调用语义稳定。
  - 若必须调整 `defineExpose` 或事件接口，应优先最小化外部改动面，并在迁移阶段一次处理完。

## 7. 实施步骤
1. 建立 Vite 构建基线，完成 `serve/build` 迁移，并跑通基础页面加载。
2. 核验 `uTools` 插件静态入口、`plugin.json` 和 `preload.js` 在新构建模式下的可用性。
3. 移除 `vue-virtual-scroller` 主列表依赖，引入 `TanStack Virtual`。
4. 设计并实现新的导航状态层，统一单步、半分页/分页、删除恢复和懒加载衔接。
5. 重写 `ClipItemList.vue` 核心结构，并对接 `Main.vue` 的 `currentShowList` 与删除逻辑。
6. 调整 `ClipItemRow.vue` 与列表样式，确保锁/收藏即时刷新和单行压缩稳定。
7. 完整回归主列表相关场景，并补 `03-tasks.md`、`04-verify.md`。

## 8. 测试与验证方案
- 工程验证
  - 新开发命令可正常启动。
  - 新构建命令可产出可运行插件静态资源。
- Web 层验证
  - 普通列表、收藏页、`*` 搜索、锁筛选、懒加载、多选删除、强制删除全部回归。
  - 单步与分页导航符合新规则。
  - 删除后高亮恢复和锁/收藏即时刷新表现正确。
- 插件环境验证
  - 在 `uTools` 环境中验证主窗口打开、搜索、列表导航、删除和状态切换。
  - 核验 `preload.js` 与插件静态资源路径无异常。
- 性能验证
  - 记录代表性长列表场景下“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”。
  - 若未完成插件环境性能实测，必须明确标注未测。

## 9. 风险与回滚点
- 风险 1：Vite 迁移导致插件静态资源路径、预加载脚本或开发入口异常。
  - 回滚点：先保留旧构建脚本并并行验证，确认稳定后再完全切换。
- 风险 2：TanStack Virtual 重写期间，边界行为与现有隐式语义不一致。
  - 回滚点：优先保持 `Main.vue` 数据层稳定，只回退列表渲染内核。
- 风险 3：大改列表组件会影响 Shift 预览、多选、搜索聚焦和抽屉打开等旁路行为。
  - 回滚点：把导航状态层与预览/操作层隔离，必要时分阶段合并。
- 风险 4：迁移与重构同时进行，问题定位成本上升。
  - 缓解方式：先迁移工程基线，再替换列表内核，按阶段验证。

## 10. 待确认项
- 无。按 S2 路线直接推进。
