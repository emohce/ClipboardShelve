# Verify

## T1 补齐旧版 setting 的 `operation` 默认结构，修复首屏白屏
- status: pass
- build: `bun node_modules/vite/bin/vite.js build` 通过
- manual-check: 未在当前会话直接进入 uTools 插件窗口验证；需用户重载插件后确认主界面列表恢复展示
- docs: 已新增 `specs/26040615-json-storage-fix/*`
- notes: 同时补齐了 `setting.database` / `setting.database.maxsize` 的默认结构，避免旧配置继续触发空值异常

## T2 将插件运行时存储固定为 JSON 文件，移除 `uTools DB` 分支
- status: pass
- build: `bun node_modules/vite/bin/vite.js build` 通过
- manual-check: 需在 uTools 控制台确认 `utools.dbStorage.getItem('storageMode') === 'json'`
- docs: 已在 `02-plan.md` 记录 JSON-only 方案
- notes: 保留了旧 `dbMigration.js` 文件但已不再被运行时入口和设置页使用

## T3 清理设置页中的 `uTools DB` 切换与迁移入口
- status: pass
- build: `bun node_modules/vite/bin/vite.js build` 通过
- manual-check: 需在设置页确认“存储模式”区域仅显示 JSON 文件静态说明，不再出现迁移/回滚按钮
- docs: 已在 `01-spec.md`、`02-plan.md` 收敛非目标与交互变化
- notes: 同时恢复了构建所需的 `public/plugin.json`、`public/preload.js`、`public/listener.js`、`public/time*.js`、`public/logo.png`

## T4 执行构建验证并记录结果
- status: partial
- build: 首次执行 `bun node_modules/vite/bin/vite.js build` 因缺少 `public/plugin.json` / `public/preload.js` 等插件入口资源失败；补回后再次执行通过
- manual-check: 未在真实 uTools 运行时完成回归，只完成了构建级验证
- docs: 验证结果已回填本文件
- notes: 构建输出仍存在 Vite chunk size warning，但不影响本次功能修复
