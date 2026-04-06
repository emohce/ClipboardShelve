# Feature: JSON 存储回归与白屏修复

## 1. 目标
- 修复插件启动后主界面白屏、无列表展示的问题。
- 将运行时数据存储固定为 JSON 文件，不再使用 `uTools DB` 作为可选存储引擎。

## 2. 背景
- 当前版本引入了 `json` / `utools` 双存储模式与设置结构扩展。
- 旧用户本地 `setting` 数据结构不完整时，首屏组件会在渲染阶段访问缺失的 `operation` 字段，导致主界面子树挂载失败。
- 用户当前环境已确认 JSON 数据文件存在且可读，历史数据条数大于 0，但主界面仍为空白。

## 3. 用户场景 / 使用场景
- 旧用户升级到最新版本后，直接打开插件，主界面应正常展示已有历史记录。
- 用户在设置页查看存储配置时，应明确当前仅支持 JSON 文件存储。
- 用户重置设置或首次初始化设置后，应自动得到完整的 `operation`、`database`、`userConfig` 默认结构。

## 4. 非目标
- 不迁移现有 JSON 数据路径。
- 不保留 `uTools DB` 迁移、回滚、切换入口。
- 不重构主界面列表交互与虚拟滚动实现。

## 5. 验收标准
- 插件启动后，已有 JSON 历史数据可正常显示在主界面。
- `setting.operation` 缺失或不完整时，不再导致首屏白屏。
- 运行时初始化始终使用 JSON 文件数据库。
- 设置页不再提供 `uTools DB` 切换、迁移、回滚入口。

## 6. 边界与异常
- 旧版 `setting` 可能缺失 `operation`、`operation.shown`、`operation.custom`、`operation.order`。
- `database.path` 可能是旧版字符串，也可能是按 `nativeId` 存储的对象。
- 若 JSON 文件不存在，仍按现有逻辑创建默认数据库文件。

## 7. 影响范围
- `src/global/readSetting.js`
- `src/global/initPlugin.js`
- `src/views/Setting.vue`
- `specs/26040615-json-storage-fix/*`

## 8. 待确认项
- 无
