# Plan: Vite + TanStack Virtual 列表重构（S2）

## 1. 变更目标

- 将工程底座从 `Vue CLI + @vue/cli-service` 迁移到 `Vite`，开发与生产命令可替代现有 `pnpm run serve` / `pnpm run build`，且产物仍可作为 `uTools` 插件加载。
- 用 `@tanstack/vue-virtual`（TanStack Virtual）替代主列表中的 `vue-virtual-scroller`，重写单步导航、长按/分页、删除恢复与懒加载衔接，统一为单一导航入口 + 单一滚动策略层。
- 保持 [`src/views/Main.vue`](../../../src/views/Main.vue#L922) 对 `currentShowList` 的计算与业务编排为主数据源；列表子组件只消费展示列表与明确 props/事件，不复制收藏/搜索语义。

## 2. 现状与根因

- **工程**：[`package.json`](../../../package.json#L1) 脚本仍为 `vue-cli-service`，与 spec 期望的 `Vue 3.5 + Vite` 不一致；依赖声明含 `webpack 4`、`vue-template-compiler` 等与 Vite 栈冗余或冲突项，需整体换脚本与依赖集。
- **插件入口**：[`public/plugin.json`](../../../public/plugin.json#L1) 中 `development.main` 为 `http://localhost:8081/`，与常见 Vue CLI 默认端口可能不一致；迁移 Vite 后必须统一 dev 端口或同步修改该字段，否则插件开发模式无法指向正确页面。
- **列表**：[`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1518) 集中虚拟滚动、多路分页/长按、删除恢复与多选；多处滚动与导航路径并存（总览 §8.2、§8.3），导致「完全可见仍滚」、删除后高亮与父组件双写（与 [`src/views/Main.vue`](../../../src/views/Main.vue#L984) 一带逻辑交织）。
- **快捷键**：[`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1) / [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) 与列表内 feature 绑定耦合；列表内核替换时需保证 feature 名、layer 与注册时机仍一致或提供一次性迁移清单。

## 3. 设计方案

### 3.1 分阶段策略（已决议）

- **阶段 A — 仅工程迁移（Vite）**：引入 Vite、调整入口 HTML、脚本与静态资源路径；主列表仍可暂时保留 `vue-virtual-scroller`，以尽快验证构建与插件加载。**独立验收**：`pnpm run serve` / `pnpm run build` 成功；插件 `main` / `preload` 可加载；主界面可打开并基本操作列表（允许列表问题与现状一致）。
- **阶段 B — 列表内核（TanStack Virtual）**：在阶段 A 稳定后再替换虚拟滚动与导航实现；统一导航状态层、滚动策略层、行渲染层（与 [`01-spec.md`](./01-spec.md#L1) 一致）。**独立验收**：按 spec §5 与本文 §8 做列表与性能验证。

- 若需分支并行开发，合并前须分别满足阶段 A、阶段 B 验收矩阵，避免未验证的 Vite 与未验证的列表改动同时进入主线。

### 3.2 工程（Vite）

- 以根目录 `index.html` + Vite 为准（可将现有 [`public/index.html`](../../../public/index.html#L1) 职责迁入根目录或保持与 uTools 约定一致，以实际 Vite 模板为准）；`public/` 下 `plugin.json`、`preload.js`、`listener.js` 等保持可被复制或引用至产物。
- `resolve.alias`、`base`、静态资源 `publicDir` 需满足开发与生产下路径与现有 `window.exports` 使用方式不变。
- Vue 版本升级到与 Vite 匹配的 `vue@^3.5`（具体范围以 lock 解析为准）；移除 `vue-cli-service`、`webpack`、`vue-template-compiler` 等不再需要的依赖。

### 3.3 列表（TanStack Virtual）

- 引入 `@tanstack/vue-virtual`；移除主路径对 `vue-virtual-scroller` 的依赖（保留依赖直至列表替换完成，避免阶段 A 双轨过长时可分步删除）。
- **导航状态层**（建议 `src/hooks/` 或等价模块）：单一 `activeIndex`（或与现有命名对齐）、删除后锚点、长按/分页步长、与懒加载衔接的暂态；所有键盘导航经统一 API 更新，禁止并行多套 `scrollTo`。
- **滚动策略层**：封装「是否完全可见」判断与最小滚动；单步满足 spec「完全可见则不滚」；长按与分页共用同一套步长与方向语义（对齐现有 `ClipItemList` 中分散逻辑的目标行为，而非复制 bug）。
- **行渲染层**：[`ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L19) 与样式继续承担行内展示；锁/收藏以 item 数据变更驱动重渲染，减少依赖 `activeIndex` 抖动。

### 3.4 删除后高亮规则（实现须与此一致或与父组件显式同步）

- 单条删除后活动索引：设删除前索引为 `i`，删除后列表长度为 `L`。若 `L === 0`，活动索引置 `0` 且无选中项（或与当前 `Main.vue` 既有行为一致并在 `04-verify` 中记录）；若 `L > 0`，活动索引为 `min(i, L - 1)`（删除后该位置对应原「下一项」）。
- 批量删除：以实现阶段 `Main.vue` 与列表组件约定为准，但须满足 spec「不闪烁、不选错行」；在 `03-tasks` 中单列可验证用例。

### 3.5 存储与全局

- 不修改 [`src/global/initPlugin.js`](../../../src/global/initPlugin.js#L120) 中 DB 语义；仅当入口路径、环境变量或构建注入影响初始化时最小联动。
- 不在本 plan 内启用 [`src/global/utoolsDB.js`](../../../src/global/utoolsDB.js#L1) 替代主存储。

## 4. 受影响文件

| 文件 / 位置 | 改动意图 |
|-------------|----------|
| [`package.json`](../../../package.json#L1) | 替换 `serve`/`build` 脚本；更新依赖（Vite、Vue、插件相关）；移除 webpack/cli 栈 |
| 根目录 `vite.config.*`（新建） | 别名、资源目录、`base`、Vue 插件、Less 等 |
| 根目录或 [`public/index.html`](../../../public/index.html#L1) | Vite 入口脚本挂载点与资源引用 |
| [`public/plugin.json`](../../../public/plugin.json#L1) | 必要时调整 `development.main` 端口或路径；核对 `main`/`preload` |
| [`public/preload.js`](../../../public/preload.js#L1) | 核验路径；一般不改编译逻辑除非加载路径变化 |
| [`src/main.js`](../../../src/main.js#L1) | 入口与 Vite 兼容（`import.meta` 等） |
| [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1) | 阶段 B 重写虚拟列表与导航，对接新 hook |
| [`src/views/Main.vue`](../../../src/views/Main.vue#L922) | 保持 `currentShowList`；收敛删除恢复与列表的单一契约；适配子组件接口 |
| [`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L19) | 行内状态即时刷新、与新列表 DOM 结构适配 |
| [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L192) | 虚拟容器与行布局类名变化时的样式 |
| [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1)、[`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) | 仅当 feature 名或注册时机随列表重构变化时调整 |
| 新建 `src/hooks/useListNavigation.js` 等 | 导航与滚动策略下沉（命名以实现为准） |

## 5. 数据与状态变更

- **持久化数据**：无 schema 变更；仍通过现有 `window.db` / 初始化逻辑读写。
- **前端状态**：`currentShowList` 仍在 `Main.vue` 计算；列表内 `activeIndex` 等与导航相关的状态迁入统一状态层，删除锚点与父组件的「双写」在阶段 B 收敛为明确单向数据流或单一主控（父或子二选一并文档化）。
- **运行时全局**：`window.exports`、`window.db`、`window.listener` 等保持不变；构建从 `import.meta.env` 读取的环境变量若有新增，仅用于开发/调试，不改变业务语义。

## 6. 接口与交互变更

- **用户可见**：入口方式、主功能、快捷键语义保持不变；列表导航更稳定、减少错误滚动与高亮跳动。
- **组件契约**：允许调整 `ClipItemList` 对外暴露方法、`emit` 与 `defineExpose`，但须一次性在阶段 B 与 `Main.vue` 对齐；变更点写入 `03-tasks.md` 与 `04-verify.md`。
- **错误路径**：构建失败、资源 404、插件无法加载时，回滚到阶段 A 前 git 基线或保留旧脚本并行验证（见 §9）。

## 7. 插件入口与产物契约（书面对照）

| 字段 / 路径 | 作用 | 迁移时注意 |
|-------------|------|------------|
| [`public/plugin.json`](../../../public/plugin.json#L1) `main` | 插件入口 HTML，当前 `index.html` | 构建后 `dist` 内须存在且可被 uTools 打开 |
| `preload` | 预加载脚本 | 与 `main` 同目录或约定相对路径不变 |
| `development.main` | 开发模式加载的 URL | Vite dev server 端口须与此一致（当前 `8081`）或同步改此字段 |
| 构建输出目录 | 静态资源与 `index.html` | 与 uTools 加载 `plugin` 根目录约定一致（通常整个 `dist` 或项目根打包） |
| [`public/preload.js`](../../../public/preload.js#L1)、[`public/listener.js`](../../../public/listener.js#L1) 等 | 宿主能力 | 复制到产物或从 `public` 原样提供，路径与 `plugin.json` 一致 |

## 8. 实施步骤

1. **阶段 A**：新增 Vite 配置与依赖；实现 `pnpm run serve` / `pnpm run build`；对齐 `plugin.json` 的 `development.main` 与 dev 端口；验证页面与插件开发模式可加载。
2. **阶段 A**：回归非列表核心路径（设置、抽屉等）抽样；记录已知问题。
3. **阶段 B**：安装 `@tanstack/vue-virtual`，设计导航 hook 与滚动 API；从 `ClipItemList` 拆出状态与滚动逻辑。
4. **阶段 B**：替换模板中的虚拟列表实现，对接 `currentShowList`；删除或降级 `vue-virtual-scroller` 主路径依赖。
5. **阶段 B**：与 `Main.vue` 统一删除与高亮恢复逻辑；更新 `ClipItemRow` 与 Less。
6. **阶段 B**：按 [`hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) 全量回归快捷键；长列表下抽测 §9 性能口径。
7. 补全 [`03-tasks.md`](./03-tasks.md#L1)、[`04-verify.md`](./04-verify.md#L1)，按任务粒度记录验证结果。

## 9. 测试与验证方案

- **命令**：[`AGENTS.md`](../../../AGENTS.md#L1) 约定 `nvm use 24`（或项目实际 Node 版本）后执行 `pnpm install`、`pnpm run serve`、`pnpm run build`。
- **阶段 A**：构建成功；浏览器打开 dev URL；uTools 开发模式打开插件主页；`preload` 无报错路径。
- **阶段 B**：普通列表、收藏、`*` 搜索混排、锁筛选、懒加载、多选删除、强制删除；单步/长按/分页；删除后高亮；锁/收藏切换即时性。
- **环境**：Web 与 uTools 插件环境分别记录；未在插件环境执行的项须在 `04-verify.md` 标明未测。
- **性能**：以 spec §5 为准，单次交互后约 `300ms` 内滚动与高亮稳定；未实测不得写已通过。

## 10. 风险与回滚点

- **Vite 与插件路径**：静态资源或 `base` 错误导致白屏。回滚：保留迁移前分支；或临时恢复 `vue-cli-service` 脚本并行对照。
- **端口不一致**：`development.main` 与 Vite 端口不一致导致开发插件无法连接。回滚：改 `vite.config` `server.port` 或改 `plugin.json`。
- **TanStack 行为差异**：`scrollToIndex`、动态高度与现有一致性不足。回滚：阶段 B 独立分支；仅回退列表相关提交。
- **快捷键与 feature 断裂**：回滚列表改动或冻结 feature 注册表，逐项对齐 [`hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1)。
- **并行迁移风险**：坚持阶段 A 验收后再合阶段 B，降低定位成本。

## 11. 待确认项

- **无阻塞项**：阶段顺序已选「先 Vite 再 TanStack 列表」；插件入口已用书面对照表约束（见 §7）。
- **实现期细目**：多选删除与批量操作后的高亮规则若与单条删除不同，须在编写 `03-tasks.md` 时逐条列出并与 `Main.vue` 现状对照。
