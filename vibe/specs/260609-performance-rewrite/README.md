# EzClipboard Performance Rewrite

Tool: codex

## 本轮落地范围

- 今日统一归档见 [../../vibe-doc/2026-06-09-storage-performance-change-archive.md](../../vibe-doc/2026-06-09-storage-performance-change-archive.md:1)，高频错误记忆见 [../../vibe-doc/ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md](../../vibe-doc/ai-error-memory/2026-06-09-storage-performance-rewrite-pitfalls.md:1)。
- 新增统一查询与 Repository facade：[src/storage/searchIndex.js](../../../src/storage/searchIndex.js:1)、[src/storage/clipboardRepository.js](../../../src/storage/clipboardRepository.js:1)。
- 主存储切换为 SQLite 映射库，普通索引 + FTS5 可用时用于分页搜索；图片和超大文本通过文件映射保存：[src/storage/sqliteClipboardRepository.js](../../../src/storage/sqliteClipboardRepository.js:1)、[src/storage/blobStore.js](../../../src/storage/blobStore.js:1)。
- 主界面普通查询路径改为分页查询与浅响应式快照：[src/views/Main.vue](../../../src/views/Main.vue:223)。
- 列表渲染接入 TanStack virtualizer，避免已加载数据全量 DOM 渲染：[src/cpns/ClipItemList.vue](../../../src/cpns/ClipItemList.vue:1)。
- 剪贴板监听热路径延后图片读取与来源窗口补全：[src/global/initPlugin.js](../../../src/global/initPlugin.js:1)。
- 旧 JSON 启动时自动检测 schema，迁移前写入一次性备份并记录版本；SQLite 首次创建时自动导入旧 JSON 数据，并写入 `json_migration_complete=1`、源路径和 JSON 指纹历史：[src/storage/jsonMigration.js](../../../src/storage/jsonMigration.js:1)。
- 新增可重复查询基线脚本：[scripts/perf-baseline.mjs](../../../scripts/perf-baseline.mjs:1)。

## 保守处理

- 本轮未直接删除旧 JSON DB 类，仍作为首次 SQLite 迁移源和 SQLite 初始化失败时的回退。
- SQLite 使用 `sql.js` WASM，避免原生 sqlite 模块在 uTools/Electron ABI 下编译或加载失败。
- 旧 `window.db.dataBase` 仍兼容存在，但新查询入口应优先使用 `window.db.query()`。
- 自动迁移范围：旧 `item.collect`、缺失 `locked`、收藏字段、文件 `originPaths`、`schemaVersion`，并在 SQLite 首次创建时全量导入历史和收藏。
- 后续启动只从 SQLite 读取记录；SQLite 侧记录已消费过的 JSON 指纹（路径、大小、mtime、hash），已迁移过的 JSON 不会再次导入，避免删除后又从旧 JSON 复活。

## 验证

- `node test-storage-query.js`
- `node test-json-migration.js`
- `node scripts/perf-baseline.mjs`
- `pnpm run build`
