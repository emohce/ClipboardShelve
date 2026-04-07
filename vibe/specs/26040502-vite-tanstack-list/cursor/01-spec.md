# Feature: Vite + TanStack Virtual 列表重构（S2）

## 1. 目标

- 将工程底座迁移到 `Vue 3.5 + Vite`，保留 `uTools` 插件静态入口、`preload.js` 与现有核心业务语义。
- 用 `TanStack Virtual` 重写主列表虚拟化与键盘导航内核，满足单步「完全可见则不滚」、长按与分页统一策略、删除后高亮稳定、锁/收藏行内即时刷新。
- 收敛列表层职责（导航状态、滚动策略、行渲染），使 [`src/views/Main.vue`](../../../src/views/Main.vue#L922) 侧的 `currentShowList` 继续作为展示真相源，列表子系统不另起一套数据源。

## 2. 背景

- 项目定位与存储、交互、迁移边界的上位说明见 [`260405-cursor-项目全量需求存储交互迁移总览.md`](./260405-cursor-项目全量需求存储交互迁移总览.md#L1)（下文称「总览」）；本 spec 在 S2 范围内抽取可验收目标，不重复全文。
- 当前声明基线仍以 [`package.json`](../../../package.json#L1) 中 `Vue CLI + webpack` 为主，与锁文件及维护预期存在漂移；列表热点逻辑集中在 [`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1518) 一带，虚拟滚动、导航、删除恢复、懒加载、多选耦合过深。
- 展示列表由 [`src/views/Main.vue`](../../../src/views/Main.vue#L922) 至 [`src/views/Main.vue`](../../../src/views/Main.vue#L931) 计算得到 `currentShowList`，须继续兼容普通历史、收藏块混排、搜索与筛选；收藏为独立存储模型（总览 §5.3），新列表不得假设「单行 collect 布尔」即可表达业务。
- 框架适配结论为 S2（`Vue 3.5 + Vite + TanStack Virtual` + 列表重写），与 [`260405-cursor-最新框架适配评估.md`](./260405-cursor-最新框架适配评估.md#L1) 一致。
- 插件运行方式仍以静态 `html` 入口与 [`public/preload.js`](../../../public/preload.js#L1) 全局桥接为准，迁移目标是现代构建产物 + 兼容宿主，而非 SSR。参考：[uTools plugin.json](https://www.u-tools.cn/docs/developer/information/plugin-json.html)。

## 3. 用户场景 / 使用场景

- 用户打开主窗口后，列表加载、搜索、筛选、Tab/收藏子 Tab、快捷键与既有入口行为保持一致，感知上滚动与高亮更稳定、更少无意义跳动。
- 单步 `↑/↓`：目标项已完全可见时不触发额外滚动；不可见时最小滚动至完全可见。
- 长按方向键或分页类快捷键：半分页/分页行为统一，高亮与滚动同源，不出现多套长按语义或重复推进。
- 删除当前项、多选删除、强制删除或导致列表收缩的操作后，高亮索引稳定、不闪烁、不跳到无关行。
- 锁定/收藏切换后，行头图标与信息及时更新，布局不因状态切换错位。
- 在 `uTools` 插件环境中通过既有方式进入并使用插件；开发态 `pnpm run serve` 可覆盖部分 Web 层行为，关键验收以插件环境为准（与 [`AGENTS.md`](../../../AGENTS.md#L1) 验证规则一致）。

## 4. 非目标

- 不修改数据库业务语义、收藏与普通历史的分离模型、标签/备注模型；不在本 spec 范围内将主存储从 JSON 文件迁移到 `uTools DB` 或做双轨大改（总览 §5.5、§10.4）。
- 不引入 Nuxt、SSR 或远程服务依赖。
- 不重做设置页、抽屉、清理弹窗等业务模块，除非 Vite/入口路径或公共资源加载强制联动。
- 不以「顺带」为由扩大范围；非主列表核心问题可记 backlog，不纳入本 spec 验收。

## 5. 验收标准

- **工程**：可用 Vite 完成开发与生产构建；产物满足 `uTools` 插件要求（`index.html`、`plugin.json`、`preload.js`、静态资源路径可加载）。
- **列表交互**：单步「完全可见则不滚」；长按与分页规则一致；删除后高亮按约定落点（如原位置优先下一项、越界取末项、空列表归零等，与实现计划在 `02-plan` 中写死具体规则）；锁/收藏切换后当前行即时更新。
- **性能**：采用总览 §9.2 口径——单次交互后约 `300ms` 内 UI 达到滚动稳定且高亮正确；长列表下不明显劣于当前且减少无意义滚动与大面积重渲染。
- **兼容**：普通列表、收藏、`*` 搜索混排、锁筛选、懒加载、多选删除等主路径可用；快捷键语义与 [`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1) / [`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1) 既有约定一致，或经明确迁移清单替换且可回归。

## 6. 边界与异常

- 空列表、仅一项、首尾边界、筛选结果为空时，导航与高亮安全降级，不越界访问。
- 虚拟列表未挂载目标 DOM 时，滚动/scrollTo 策略仍须保证最终可见，不依赖互相矛盾的多套兜底。
- `preload`、`plugin.json`、公共资源路径为高风险变更点；变更需可回滚并记录验证矩阵（Web / 插件）。
- 宿主全局 `window.exports` / `window.db` 等桥接模式保持不变；新列表代码不得假设纯浏览器 SPA 全局。

## 7. 影响范围

- 构建与入口：[`package.json`](../../../package.json#L1)、[`public/plugin.json`](../../../public/plugin.json#L1)、[`public/preload.js`](../../../public/preload.js#L1)、[`public/index.html`](../../../public/index.html#L1)、新增 `vite.config.*` 与脚本。
- 主列表与页面：[`src/cpns/ClipItemList.vue`](../../../src/cpns/ClipItemList.vue#L1)、[`src/views/Main.vue`](../../../src/views/Main.vue#L922)、[`src/cpns/ClipItemRow.vue`](../../../src/cpns/ClipItemRow.vue#L19)、相关 [`src/style/cpns/clip-item-list.less`](../../../src/style/cpns/clip-item-list.less#L192)。
- 快捷键与 feature 注册：[`src/global/hotkeyRegistry.js`](../../../src/global/hotkeyRegistry.js#L1)、[`src/global/hotkeyBindings.js`](../../../src/global/hotkeyBindings.js#L1)，及列表内 feature 名与 layer 的对应关系（总览 §11、§13.5）。
- 运行期与数据初始化：[`src/global/initPlugin.js`](../../../src/global/initPlugin.js#L120) 等仅在入口或刷新链路被构建变更波及时联动；[`src/global/utoolsDB.js`](../../../src/global/utoolsDB.js#L1) 非本 spec 默认改造范围。
- 允许新增 `src/hooks/`、`src/utils/` 或 `src/cpns/` 下与导航状态机、虚拟滚动策略相关的模块。
- 后续计划文档：[`02-plan.md`](./02-plan.md#L1)（待与 `03-tasks.md`、`04-verify.md` 同目录落盘）。

## 8. 待确认项

- **阶段顺序**：优先「先 Vite 迁移并回归，再换 TanStack 列表」还是「分支并行、合并前统一验收」（总览 §13.6）；需在 `02-plan` 中选定并附独立阶段验收标准（总览 §13.4）。
- **插件入口契约**：`development.main`、构建输出目录与 `plugin.json` 字段是否需书面对照表，是否单独补一节于 plan（总览 §13.4）。
