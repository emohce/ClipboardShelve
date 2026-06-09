# Error Memory: EM-2026-06-09-storage-performance-rewrite-pitfalls

Tool: codex

## 1. 背景与症状

- 任务背景：剪贴板历史量增大后，JSON 全量读写、列表全量渲染、搜索全量扫描和图片读取会放大卡顿。
- 直接症状：启动、搜索、切 tab、批量删除、复制大图或文件来源记录时出现明显延迟。
- 用户可观察现象：列表卡顿、搜索慢、删除后旧数据复活、迁移失败后插件不可用、设置页无法解释当前存储状态。

## 2. 错误归类

- `runtime-path-mismatch`
- `framework-misuse`
- `invalid-verification`
- `environment-assumption`
- `data-consistency`

## 3. 误判链路

- 第一次误判：只把列表换成虚拟滚动，忽略 JSON 全量查询、全量序列化和响应式深层代理仍在热路径。
- 后续偏离：直接替换底层存储，未保留旧 DB API、迁移备份、失败回退和用户可见状态。
- 为什么会浪费时间：UI、存储、迁移、uTools preload 暴露 API 任一环节不一致，都会表现为同一个“卡顿/数据异常/启动失败”症状。

## 4. 已证伪方案

- 只接入虚拟列表：DOM 数量下降，但搜索、删除、收藏和启动仍可能全量扫描或全量落盘。
- 直接新增原生 sqlite 模块：uTools/Electron ABI 和跨平台打包风险高，不适合作为默认路径。
- SQLite 初始化失败后直接抛错：会让插件无法启动，用户也无法在设置页查看或重试迁移。
- 每次启动重新导入旧 JSON：用户在 SQLite 里删除过的数据可能被旧 JSON 再次导入。
- 批量删除逐条调用 `removeItem` 并逐次刷新：大数据量下会重复刷新索引、缓存和持久化。

## 5. 已确认通路

- 存储初始化从 [../../../src/global/initPlugin.js](../../../src/global/initPlugin.js:1188) 进入，优先 SQLite，失败后使用 JSON facade。
- SQLite 使用 [../../../src/storage/sqliteClipboardRepository.js](../../../src/storage/sqliteClipboardRepository.js:1)，WASM 来源是 `sql.js`，不是原生 sqlite。
- 旧 JSON 迁移和重复导入防护集中在 [../../../src/storage/jsonMigration.js](../../../src/storage/jsonMigration.js:1)。
- UI 查询和批量变更通过 [../../../src/storage/clipboardRepository.js](../../../src/storage/clipboardRepository.js:1) 或 SQLite repository 的同形接口收口。
- 存储进度、错误和提示通过 [../../../src/storage/storageRuntimeStatus.js](../../../src/storage/storageRuntimeStatus.js:1) 广播并供设置页读取。
- 大图读取先检查 `availableFormats()`，再调用 `clipboard.readImage()`，相关路径在 [../../../src/global/initPlugin.js](../../../src/global/initPlugin.js:1140)。

## 6. 适用触发条件

- 路径 / 模块：`src/storage/`、`src/global/initPlugin.js`、`src/views/Main.vue`、`src/views/Setting.vue`、`scripts/utools-runtime-assets.mjs`。
- 症状关键词：SQLite 迁移、JSON fallback、数据复活、搜索慢、删除慢、虚拟列表、FTS、`window.exports.statSync`、`storageRuntimeStatus`。
- 关键 API：`createSQLiteClipboardRepository`、`createClipboardRepository`、`query()`、`removeItems()`、`removeCollects()`、`getVersion()`、`updateStorageRuntimeStatus()`。
- 运行环境：uTools / Electron WebView，本地文件系统，preload 注入的 `window.exports`。

## 7. 禁止再试的做法

- 不要绕过 repository facade 给 UI 新增直接数组扫描、直接 splice 或直接写磁盘的路径。
- 不要把 `window.db.dataBase` 当成新功能的主要数据源；它只用于兼容旧接口和少量历史路径。
- 不要在迁移失败时删除旧 JSON 或阻断启动；必须保留可读回退。
- 不要缺少 JSON 源文件指纹和迁移完成标记，否则旧数据会重复导入。
- 不要在复制热路径无条件读图片或同步采集窗口信息。
- 不要只跑构建就宣称迁移正确；还要覆盖迁移、查询、批量删除和状态事件。

## 8. 推荐优先策略

- 先确认存储模式：读取 `storageRuntimeStatus.mode` 和 `migrationStatus`，再判断是 SQLite 问题还是 JSON fallback 问题。
- 先走 repository：查询用 `query()`，批量删除用 `removeItems()`，批量取消收藏用 `removeCollects()`，变更后检查 `getVersion()` 或缓存失效。
- 迁移相关改动必须同时验证：旧 JSON 备份、SQLite 首次导入、重复启动不重复导入、失败回退、设置页错误展示。
- uTools preload 能力缺失时优先改 [../../../scripts/utools-runtime-assets.mjs](../../../scripts/utools-runtime-assets.mjs:1)，保持 dev 与 build 的运行时资产来源一致。
- 大数据性能问题先拆热路径：存储查询、响应式代理、DOM 渲染、图片读取、磁盘写入分别定位，不把“虚拟列表”当成唯一解。

## 9. 关联文件 / 模块

- [../../../src/global/initPlugin.js](../../../src/global/initPlugin.js:1188)
- [../../../src/storage/sqliteClipboardRepository.js](../../../src/storage/sqliteClipboardRepository.js:1)
- [../../../src/storage/clipboardRepository.js](../../../src/storage/clipboardRepository.js:1)
- [../../../src/storage/jsonMigration.js](../../../src/storage/jsonMigration.js:1)
- [../../../src/storage/blobStore.js](../../../src/storage/blobStore.js:1)
- [../../../src/storage/storageRuntimeStatus.js](../../../src/storage/storageRuntimeStatus.js:1)
- [../../../src/views/Main.vue](../../../src/views/Main.vue:1)
- [../../../src/views/Setting.vue](../../../src/views/Setting.vue:64)
- [../../../scripts/utools-runtime-assets.mjs](../../../scripts/utools-runtime-assets.mjs:1)
- [../2026-06-09-storage-performance-change-archive.md](../2026-06-09-storage-performance-change-archive.md:1)

## 10. 后续观察点

- `sql.js` WASM 在打包后的 uTools 环境是否始终能被定位和加载。
- SQLite FTS 不可用或降级时，普通索引查询是否保持一致结果。
- JSON fallback 下批量删除、收藏迁移、锁定跳过和搜索缓存失效是否与 SQLite 一致。
- 大图和超大文本文件映射的清理策略是否需要补充孤儿文件回收。
