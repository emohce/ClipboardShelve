# Plan: JSON 存储回归与白屏修复

## 1. 变更目标
- 兼容旧设置结构，消除首屏渲染阶段的空值异常。
- 去掉运行时 `uTools DB` 分支，统一回到 JSON 文件存储。

## 2. 现状与根因
- `ClipOperate`、`ClipItemList`、`Setting` 等模块直接访问 `setting.operation.custom`、`setting.operation.shown`。
- `readSetting.js` 目前未完整补齐 `operation` 结构，旧用户配置缺字段时会在渲染阶段抛错。
- `initPlugin.js` 会根据 `storageMode` 在 `DB` 与 `UToolsDB` 之间切换，导致维护成本和兼容面扩大。

## 3. 设计方案
- 在 `readSetting.js` 引入默认设置中的 `operation` 结构，对 `shown`、`custom`、`order` 做完整归一化。
- 在 `initPlugin.js` 去掉 `UToolsDB` 分支，启动时强制写回 `storageMode = json`，仅初始化现有 JSON `DB`。
- 在 `Setting.vue` 移除 `uTools DB` 切换、迁移、回滚逻辑与展示，改为固定文案说明当前仅支持 JSON 文件。

## 4. 受影响文件
- `src/global/readSetting.js`: 补齐旧配置默认值，保证 `operation` 结构完整。
- `src/global/initPlugin.js`: 删除 `UToolsDB` 初始化分支，统一使用 JSON 数据库。
- `src/views/Setting.vue`: 移除存储模式切换与迁移操作，保留 JSON 存储说明。

## 5. 数据与状态变更
- `utools.dbStorage.storageMode` 在启动时统一写为 `json`。
- `setting.operation` 缺失字段时自动补默认值，并回写到 `utools.dbStorage.setting`。

## 6. 接口与交互变更
- 设置页不再显示 `uTools DB` 选项，也不再暴露迁移/回滚按钮。
- 用户保存设置时仍只影响 JSON 文件路径、容量、时长、功能配置与快捷键配置。

## 7. 实施步骤
- 补齐 `readSetting.js` 的 `operation` 归一化。
- 改造 `initPlugin.js` 为 JSON-only。
- 清理 `Setting.vue` 的 `storageMode` 与迁移逻辑，改为固定说明。
- 执行构建验证。

## 8. 测试与验证方案
- 执行 `pnpm run build`。
- 在 uTools 中打开插件，确认历史数据列表可见。
- 在设置页确认不再出现 `uTools DB` 迁移入口。

## 9. 风险与回滚点
- 设置页删除迁移入口后，旧的 `migration.lastBackupPath` 仅作为遗留无效键存在，不影响运行。
- 若用户依赖 `uTools DB` 中未回迁的数据，本次改动不会自动同步，需要后续单独处理；当前用户环境已确认运行数据来自 JSON 文件。

## 10. 待确认项
- 无
