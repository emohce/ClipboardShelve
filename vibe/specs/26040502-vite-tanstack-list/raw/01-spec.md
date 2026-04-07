# Feature: Vite + TanStack Virtual 列表重构

## 1. 目标
- 将当前项目迁移到 `Vue 3.5 + Vite` 的现代前端构建基线，保留 `uTools` 插件运行形态和现有核心业务能力。
- 用 `TanStack Virtual` 重写主列表虚拟化与键盘导航核心，实现单步最小滚动、半分页/分页跳转、删除后稳定恢复、锁/收藏即时刷新。
- 降低当前列表交互层的耦合度，使导航、滚动、删除恢复、懒加载、行渲染具备清晰职责边界，并为后续迭代提供可维护基础。

## 2. 背景
- 当前仓库仍以 [`package.json`](../../package.json#L1) 中的 `Vue CLI + webpack 4 + vue-virtual-scroller` 组合为声明基线，但锁文件已解析到更高版本依赖，构建层与运行层边界并不理想。
- 当前主列表复杂逻辑集中在 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1518) 到 [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L2433)，已同时承担滚动控制、分页、长按、删除恢复、懒加载和多选同步，维护成本过高。
- 当前展示列表由 [`src/views/Main.vue`](../../src/views/Main.vue#L922) 到 [`src/views/Main.vue`](../../src/views/Main.vue#L931) 组合 `currentShowList`，说明任何新列表实现都必须继续兼容普通列表、收藏块混排、搜索和筛选结果。
- 已完成最新框架适配评估，结论记录在 [`docs/todo/260405-交互优化/移动效果优化/260405-最新框架适配评估.md`](../../docs/todo/260405-%E4%BA%A4%E4%BA%92%E4%BC%98%E5%8C%96/%E7%A7%BB%E5%8A%A8%E6%95%88%E6%9E%9C%E4%BC%98%E5%8C%96/260405-%E6%9C%80%E6%96%B0%E6%A1%86%E6%9E%B6%E9%80%82%E9%85%8D%E8%AF%84%E4%BC%B0.md#L1)，并已确认选用 S2。
- `uTools` 官方文档要求插件仍以静态 `html` 入口和 `preload.js` 运行，说明迁移目标应是“现代静态构建产物 + 保留插件运行方式”，而不是引入 SSR 或服务端渲染能力。来源：[uTools plugin.json 文档](https://www.u-tools.cn/docs/developer/information/plugin-json.html)、[uTools 窗口 API](https://www.u-tools.cn/docs/developer/utools-api/window.html)。

## 3. 用户场景 / 使用场景
- 用户打开插件主窗口后，主列表加载、搜索、筛选、分页滚动和快捷键导航都保持现有功能可用，但响应更稳定、更少跳动。
- 用户单击 `↑/↓` 时，若目标项完全可见则不额外滚动；若不可见则最小滚动到完全可见。
- 用户长按 `↑/↓` 或使用对应分页快捷键时，列表按统一半分页/分页策略推进，高亮和滚动一致，不再出现多套长按语义。
- 用户删除当前项、多选删除、强制删除或取消收藏后，高亮落点稳定，界面不闪烁、不选错行。
- 用户切换锁定或收藏状态后，当前行图标和头部信息立即更新，单行布局稳定，不因图标和标签挤压造成错位。
- 用户在 `uTools` 插件环境运行时，不需要改变使用方式，仍通过既有入口进入插件、搜索和操作列表。

## 4. 非目标
- 不修改 `uTools` 插件业务能力本身，不重做数据库模型、收藏结构、搜索语法和快捷键语义。
- 不引入 Nuxt、SSR、服务端渲染或远程服务依赖。
- 不在本次范围内重做设置页、抽屉页、预览页等与主列表核心交互无直接耦合的模块，除非迁移过程中必须联动。
- 不承诺在本次重构中顺手优化所有历史问题；优先解决主列表交互和工程基线问题。

## 5. 验收标准
- 工程基线
  - 项目可使用 Vite 完成本地开发和生产构建。
  - 构建产物仍满足 `uTools` 插件运行要求，保留 `index.html`、`preload.js` 和插件静态资源可用性。
- 列表交互
  - 单步导航满足“完全可见则不滚，不可见才最小滚动”。
  - 长按与分页快捷键满足统一半分页/分页滚动规则，不出现双重推进和顶部额外兜底跳转。
  - 删除后高亮恢复满足“原位置优先下一项，越界取最后一项，空列表归零”。
  - 锁/收藏状态切换后当前行即时更新，不依赖再次导航。
- 列表性能
  - 主列表交互的 `300ms` 验收口径为“单次交互后 UI 达到滚动稳定且高亮正确的完成时间”。
  - 在代表性长列表场景下，交互表现应优于当前实现，不引入明显卡顿、闪烁和错位。
- 兼容性
  - 普通列表、收藏页、`*` 搜索混排、锁筛选、懒加载、多选删除、强制删除场景继续可用。
  - 插件环境下主窗口可正常打开、显示、搜索和执行列表操作。

## 6. 边界与异常
- 空列表、仅一项、首尾边界、无更多数据时，导航和分页行为必须安全退出，不得越界。
- 虚拟列表中目标项尚未挂载 DOM 时，滚动策略仍需保证最终落点可见，不能依赖旧实现里的多套兜底互相覆盖。
- `uTools` 插件环境与浏览器开发环境存在差异，任何构建迁移都必须明确区分“Web 层验证通过”和“插件环境验证通过”。
- `preload.js`、`plugin.json`、静态资源路径和开发调试入口属于高风险迁移点，需要保守处理。
- 若 Vite 迁移中发现现有依赖或脚本与 `uTools` 运行方式冲突，允许对工程目录、构建脚本和入口文件做必要重组，但必须保持业务行为一致。

## 7. 影响范围
- 构建与入口：
  - [`package.json`](../../package.json#L1)
  - [`public/plugin.json`](../../public/plugin.json#L1)
  - [`public/preload.js`](../../public/preload.js#L1)
  - [`public/index.html`](../../public/index.html#L1)
  - 新增 `vite.config.*`、必要构建脚本与资源路径配置
- 主列表核心：
  - [`src/cpns/ClipItemList.vue`](../../src/cpns/ClipItemList.vue#L1)
  - [`src/views/Main.vue`](../../src/views/Main.vue#L922)
  - [`src/cpns/ClipItemRow.vue`](../../src/cpns/ClipItemRow.vue#L19)
  - [`src/style/cpns/clip-item-list.less`](../../src/style/cpns/clip-item-list.less#L192)
- 若采用新列表抽象：
  - 允许新增 `src/hooks/`、`src/utils/` 或 `src/cpns/` 内与导航状态机、虚拟滚动策略相关的模块
- 文档：
  - [`specs/26040502-vite-tanstack-list/02-plan.md`](./02-plan.md#L1)

## 8. 待确认项
- 无。当前已明确选用 S2，并接受为满足需求进行较大规模代码调整。
