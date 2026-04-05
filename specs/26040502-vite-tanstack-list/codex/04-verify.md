# Verify

状态词汇：`pass`（已执行且符合预期）、`partial`（部分执行或仅间接证据）、`not_run`（未执行）。

验证日期（本文档更新）：2026-04-05  
执行环境说明：`pnpm run build` / `pnpm run serve` 在仓库根目录执行；插件环境项未在本机自动化流程中执行。

## T1 建立 Vite 构建基线与脚本

- status: `pass`
- build: `pnpm run build` — 见下方「构建记录」
- manual-check: `pnpm run serve` 后对本机 `http://localhost:8081/` 发起 HTTP 请求返回 **200**；响应 HTML 含 `/@vite/client`、标题 `EzClipboard`（未用无头浏览器做控制台与交互断言）
- notes: `package.json` 使用 `vite` / `vite build`；根目录 `index.html` + `vite.config.js` 为入口；`development.main` 端口与 `vite.config.js` `server.port` 均为 8081

## T2 插件静态入口与产物路径契约

- status: `partial`
- build: 产物含 `dist/plugin.json`、`dist/preload.js`、`dist/listener.js`（由构建插件从 `public/` 复制）；`vite.config.js` 中 `server.port` 与 `public/plugin.json` 的 `development.main` 需一致（8081）
- manual-check: **not_run** — 未在 uTools 中实测开发入口与 preload 注入
- notes: `public/plugin.json`、`public/preload.js`、`public/listener.js` 运行时逻辑未改，仅路径契约需在插件环境中最终确认

## T3 阶段 A：基础页面与插件入口可用性

- status: `partial`
- manual-check: Web：见「手工与浏览器快照」；**not_run** — uTools 插件环境
- notes: 宿主注入与完整搜索回归依赖插件或深度手工

## T6 收敛删除恢复与懒加载协作到父子单一契约

- status: `partial`
- implementation: `useListNavigation` hook 已提供 `deleteAnchor`、`setDeleteAnchor`、`clearPendingStates` 等方法，并在 `Main.vue` 和 `ClipItemList.vue` 中集成
- build: `pnpm run build` pass
- manual-check: **not_run** — 未验证删除 anchor、高亮恢复、懒加载推进的父子职责清晰化
- notes: 父子组件接口已更新，需要完整回归测试删除场景

## T7 适配行渲染与列表样式，确保锁/收藏即时刷新和布局稳定

- status: `partial`
- implementation: `clip-item-list.less` 已添加 TanStack Virtual 容器样式支持，`ClipItemRow.vue` 结构保持兼容
- build: `pnpm run build` pass
- manual-check: **not_run** — 未测试紧凑布局、图片行展示和行头图标刷新正确性
- notes: 样式基础已就绪，需要在实际运行环境中验证布局稳定性

## T8 回归热键主路径与列表核心交互

- status: `partial`
- implementation: `hotkeyRegistry` / `hotkeyBindings` 已在 `ClipItemList.vue` 中适配新的 hook 方法，分页功能已更新使用 `scrollByPage`
- build: `pnpm run build` pass
- manual-check: **not_run** — 未覆盖单步、分页、多选、删除、强删、收藏、锁定等主路径
- notes: 热键绑定表保持不变，落地实现已部分迁移到新 hook 架构

## T5 抽离导航状态与滚动策略

- status: `partial`
- implementation: `src/hooks/useListNavigation.js` 和 `src/hooks/useVirtualListScroll.js` 已增强并集成到 `ClipItemList.vue`
- build: `pnpm run build` pass
- manual-check: **not_run** — 未系统验证单步导航、半分页/分页、删除恢复、懒加载待落点、完全可见判断的统一行为
- notes: 旧的多套并行 `scrollTo` 逻辑已部分替换为 hook 方法，需要完整回归测试

## T9 构建验证、手工回归与本文档回填

- status: `partial`
- build: `pnpm run build` — 与 T1 共用结果，**pass**
- manual-check: 已执行构建与 dev 根路径探测；**partial** — 部分手工清单（列表交互）已实现，**not_run** — 完整回归测试与 uTools
- docs: 本文件位于 `specs/26040502-vite-tanstack-list/codex/04-verify.md`，与 `03-tasks.md` 同目录
- notes: 
  - 构建阶段可能存在 chunk size 警告，不阻塞产物生成
  - T1-T8 基础设施已就绪，主要功能已迁移到新架构
  - **剩余风险**: 需要完整的手工回归测试验证所有交互路径
  - **未验证项**: uTools 插件环境、复杂交互场景、边界条件处理

---

## 构建记录（T1 / T4 / T9）

- 命令：`pnpm run build`
- 结果：**pass**（exit 0，`vite v6.4.1`）
- 产物要点：`dist/index.html`，`dist/assets/index-*.js` / `index-*.css`，`dist/plugin.json`、`dist/preload.js`、`dist/listener.js`、`dist/logo.png` 等
- 告警：Rollup 提示主 chunk 超过 500 kB（与计划一致，不阻塞）

## 手工与浏览器快照（T3 / T9）

- 命令：`pnpm run serve`（Vite `http://localhost:8081/`，与 `public/plugin.json` `development.main` 一致）
- 最小检查：HTTP **200**；响应体为根目录 `index.html` 经 Vite 注入后的 HTML（含 `/@vite/client`）
- **更新 2026-04-05 21:10**: HTML 模板问题已修复，`public/index.html` 不再包含 webpack 变量
- **未执行**：无头/真实浏览器内打开主界面、列表与搜索、控制台错误收集；**uTools** 插件模式未测
