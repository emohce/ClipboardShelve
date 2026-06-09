# 2026-06-09 Storage Performance Change Archive

Tool: codex

## 结论

- 本日主线是把剪贴板历史从单一 JSON 热路径升级为 SQLite + FTS5 + 文件映射，并保留 JSON 回退。
- 长列表渲染接入虚拟滚动，主界面查询改为分页、浅响应式快照和缓存失效版本号。
- 剪贴板监听热路径延后图片读取与来源窗口补全，避免普通文本复制被图片读取和窗口信息采集拖慢。
- 设置页新增存储运行状态、迁移失败提示和手动重试入口，便于后续排查。
- 大量旧过程文档当前处于删除状态，本记录只归档可复用结论，不替代用户对历史文档去留的最终决策。
- UI 展示/交互的回滚后约束已单独沉淀到 [ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md](ai-error-memory/2026-06-09-ui-structure-interaction-guardrails.md:1)，后续不要在未验证逻辑链路时再次重排。

## 今日变更地图

| 领域 | 当前落点 | 关键说明 |
|------|----------|----------|
| 存储主路径 | [../../src/global/initPlugin.js](../../src/global/initPlugin.js:1188) | 启动时优先初始化 SQLite，失败后切回 JSON facade，并更新运行状态。 |
| Repository facade | [../../src/storage/clipboardRepository.js](../../src/storage/clipboardRepository.js:1) | 保留旧 JSON DB 接口形态，新增批量删除、批量取消收藏、版本号和索引刷新。 |
| SQLite 存储 | [../../src/storage/sqliteClipboardRepository.js](../../src/storage/sqliteClipboardRepository.js:1) | 使用 `sql.js`，历史、收藏、标签、FTS 和元信息集中管理。 |
| 大对象文件映射 | [../../src/storage/blobStore.js](../../src/storage/blobStore.js:1) | 图片和超大文本不直接压入响应式列表，降低内存与序列化压力。 |
| JSON 迁移 | [../../src/storage/jsonMigration.js](../../src/storage/jsonMigration.js:1) | 迁移前备份旧 JSON，记录 schema、来源路径和指纹，避免重复导入。 |
| 查询索引 | [../../src/storage/searchIndex.js](../../src/storage/searchIndex.js:1) | JSON fallback 下仍可统一执行正文、标签、别名、收藏态过滤。 |
| 运行状态 | [../../src/storage/storageRuntimeStatus.js](../../src/storage/storageRuntimeStatus.js:1) | 通过事件和 `utools.dbStorage` 暴露迁移进度、错误和提示未读状态。 |
| 主界面 | [../../src/views/Main.vue](../../src/views/Main.vue:1) | 查询分页、tab 缓存、批量删除走 repository，设置按钮显示迁移提示。 |
| 列表组件 | [../../src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue:1) | 长列表虚拟滚动，避免大数据量全量 DOM 渲染。 |
| 设置页 | [../../src/views/Setting.vue](../../src/views/Setting.vue:64) | 展示存储模式、迁移状态、路径、错误和重试按钮。 |
| uTools 运行时资产 | [../../scripts/utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs:33) | preload 暴露 `statSync`，供迁移指纹和文件状态判断使用。 |
| 发布说明 | [../../publishLog.md](../../publishLog.md:5) | 对外记录 v1.2.0 的性能、搜索、兼容和设置页变化。 |
| 性能改造过程文档 | [../specs/performance-rewrite/README.md](../specs/performance-rewrite/README.md:1) | 记录本轮落地范围、保守处理和验证方向。 |

## 经常犯的错误归档

- 不要绕过 repository 直接读写 `window.db.dataBase.data` 作为新功能主路径；UI 查询、批量删除、收藏、锁定应优先走 `window.db.query()`、`removeItems()`、`removeCollects()` 或对应 facade 方法。
- 不要在 SQLite 初始化失败时让启动直接中断；必须保留 JSON fallback，并把失败原因写入 [../../src/storage/storageRuntimeStatus.js](../../src/storage/storageRuntimeStatus.js:1) 管理的状态。
- 不要把旧 JSON 每次启动都重新导入 SQLite；必须依赖迁移完成标记和源 JSON 指纹，避免用户删除过的旧记录复活。
- 不要在普通剪贴板读取路径无条件调用 `clipboard.readImage()`；先检查 `availableFormats()`，再读取图片。
- 不要在批量删除循环里逐条刷新列表和落盘；应批量传 id，完成后一次性刷新可见列表和查询缓存。
- 不要把锁定项、收藏项和普通历史项混用删除语义；非强制删除必须跳过锁定和收藏，强制删除才允许覆盖。
- 不要忘记缓存失效；凡是数据、收藏、标签、锁定、备注、正文变化，都要推进 repository 版本或清空 tab 查询缓存。
- 不要新增原生 sqlite 依赖；当前 uTools/Electron 兼容路径使用 `sql.js` WASM，避免 ABI 编译和加载风险。
- 不要只更新 README / 发布说明而不更新 AI 记忆；本轮已将高频坑沉淀到 [ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md](ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md:1)。

## 验证建议

- 基础静态检查：`node test-syntax.js`。
- 存储迁移检查：`node test-json-migration.js`。
- 查询行为检查：`node test-storage-query.js`。
- 批量删除检查：`node test-repository-batch.js`。
- 运行状态检查：`node test-storage-runtime-status.js`。
- 构建检查：`pnpm run build`。

## 后续维护规则

- 修改 [../../src/global/initPlugin.js](../../src/global/initPlugin.js:1188)、[../../src/storage/sqliteClipboardRepository.js](../../src/storage/sqliteClipboardRepository.js:1)、[../../src/storage/jsonMigration.js](../../src/storage/jsonMigration.js:1) 前，必须先说明迁移、回退和数据一致性影响。
- 修改 [../../src/views/Main.vue](../../src/views/Main.vue:1) 查询、tab、删除、收藏相关逻辑时，必须同步检查 repository 版本号和缓存失效。
- 修改 [../../scripts/utools-runtime-assets.mjs](../../scripts/utools-runtime-assets.mjs:1) 时，必须确认 preload 暴露 API 与业务代码使用点一致。
