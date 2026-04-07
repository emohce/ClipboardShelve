# Tasks

> 勾选规则：任务仅在「实现完成且已在同目录 `04-verify.md` 中记录对应验证结果」后标为 `[x]`；未验证项保持 `[ ]`，以验证文档为准。

- [x] T1 建立 Vite 构建基线并替换现有 `serve/build` 脚本
  预期结果：`package.json`、`vite.config.*`、入口模板与依赖集完成迁移，`pnpm run serve` / `pnpm run build` 可替代 `vue-cli-service`。

- [ ] T2 对齐 `plugin.json`、`preload.js`、`listener.js` 与构建产物路径契约
  预期结果：开发模式 URL、生产入口 HTML、预加载脚本与监听脚本在 Vite 模式下仍可被 `uTools` 正常加载。

- [ ] T3 回归阶段 A 的基础页面与插件入口可用性
  预期结果：主页面能启动，基础列表打开、搜索与宿主注入能力未因构建迁移中断，并在 `04-verify.md` 记录 Web / 插件环境结果。

- [ ] T4 引入 TanStack Virtual 并搭建新的列表虚拟容器
  预期结果：`ClipItemList.vue` 从 `vue-virtual-scroller` 切换到 `TanStack Virtual` 基础结构，仍能渲染 `showList` 与保持现有行组件接入。

- [ ] T5 抽离导航状态与滚动策略
  预期结果：单步导航、半分页/分页、底部加载待落点、完全可见判断统一收敛到单一状态与滚动实现，不再保留多套并行 `scrollTo` 逻辑。

- [ ] T6 收敛删除恢复与懒加载协作到父子单一契约
  预期结果：`Main.vue` 与 `ClipItemList.vue` 对删除 anchor、高亮恢复、懒加载推进各自职责清晰，不再出现父子双写索引。

- [ ] T7 适配行渲染与列表样式，确保锁/收藏即时刷新和布局稳定
  预期结果：`ClipItemRow.vue` 与 `clip-item-list.less` 在新虚拟容器下保持紧凑布局、图片行展示和行头图标刷新正确。

- [ ] T8 回归热键主路径与列表核心交互
  预期结果：`hotkeyRegistry` / `hotkeyBindings` 现有 feature 在新列表内核下继续可用，覆盖单步、分页、多选、删除、强删、收藏、锁定等主路径。

- [ ] T9 完成构建验证、手工回归与 `04-verify.md` 回填
  预期结果：按仓库规则记录 `pnpm run build`、必要的 `pnpm run serve` 与 `uTools` 插件环境验证结果，明确未验证项与残留风险。
