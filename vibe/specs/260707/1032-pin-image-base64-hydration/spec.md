# 截图 Base64 / 轻量 payload hydrate 修复

Tool: codex
Date: 2026-07-07

## 目标

- 修复普通截图等图片 item 在 SQLite 外置 payload 后，列表置顶、快捷置顶粘贴、置顶组合循环粘贴和相关操作入口拿到轻量行导致展示或粘贴异常的问题。
- 统一 `dataPath + 空 data` 的语义：只能作为索引/元数据行，不能作为最终可展示、可复制或可粘贴 payload。
- 收口图片 data URL 与 `file://` 路径解析，覆盖 Mac `/Users/...` 与 Windows `C:\...` / `file:///C:/...`。

## 范围

- 置顶单项与组合：在 [../../../../src/global/quickPasteSelection.js#L10](../../../../src/global/quickPasteSelection.js#L10) 统一识别轻量 payload，并通过 `getItemById(id)` 替换成 hydrated item。
- 主列表展示与操作入口：在 [../../../../src/views/Main.vue#L753](../../../../src/views/Main.vue#L753) 只 hydrate 当前可见页；`getAllKnownItems` 优先使用当前已展示 hydrated 行；收藏标签编辑优先读完整行。
- 菜单操作：在 [../../../../src/hooks/useClipOperate.js#L33](../../../../src/hooks/useClipOperate.js#L33) 对 `save-file` 与自定义 `redirect:*` 等操作做防御式 hydrate。
- 图片解析：在 [../../../../src/utils/index.js#L326](../../../../src/utils/index.js#L326) 支持更宽的 `image/*` Base64 data URL，并修复跨平台 `file://` 路径归一化。

## 非目标

- 不修改 SQLite schema，不新增迁移，不新增用户配置。
- 不改变置顶组合 cache 的单项结构；`clipboard-item.value` 仍是单个完整 item，不扩展成数组。
- 不在普通刷新、搜索、tab 切换时重建置顶组合运行时 cache。

## 规则声明

- 全局入口：已按 CodeNote VibeAi 与项目规则入口执行。
- 项目入口：已加载项目 `AGENTS.md`、`vibe/rules/README.md` 路由与 EzClipboard 任务技能。
- Sidecar：主线程完成需求更新、业务逻辑更新、技术栈更新、错误记录和 DB/SQL 边界检查。
- 文档路由：本任务需要更新过程文档、quick-paste 知识页、技术索引和错误记忆；不需要更新数据库文档。
- 高风险门禁：无 DB 写入、无 schema 迁移、无外部服务写入、无发布部署。

## 关联知识

- Quick paste runtime：[../../../knowledge/quick-paste-runtime.md](../../../knowledge/quick-paste-runtime.md)
- Pin group cache：[../../../knowledge/quick-paste-pin-group-cache.md](../../../knowledge/quick-paste-pin-group-cache.md)
- Technical details：[../../../knowledge/technical-details.md](../../../knowledge/technical-details.md)
- Error memory：[../../../knowledge/error-memory/2026-07-07-externalized-payload-hydration.md](../../../knowledge/error-memory/2026-07-07-externalized-payload-hydration.md)
