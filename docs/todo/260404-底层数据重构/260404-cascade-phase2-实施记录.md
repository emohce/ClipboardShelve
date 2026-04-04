# Phase 2 实施记录：数据库迁移到 uTools DB API

**实施日期**: 2026-04-04  
**基于方案**: [260404-cascade-phase2-计划.md](./260404-cascade-phase2-计划.md)

---

## 一、实施状态

**当前状态**: 基础设施已完成，待测试和手动迁移

### 1.1 已完成

- ✅ 创建 `UToolsDB` 类（`src/global/utoolsDB.js`）
  - 实现基于 uTools DB API 的数据访问层
  - 支持数据项、收藏列表、标签数据的 CRUD
  - 保持与现有 DB 类相同的接口
  
- ✅ 创建数据迁移工具（`src/global/dbMigration.js`）
  - JSON 数据备份功能
  - 数据完整性验证
  - 批量迁移到 uTools DB
  - 回滚功能

- ✅ 添加存储模式配置
  - 在 `initPlugin.js` 中添加存储模式切换逻辑
  - 通过 `utools.dbStorage.getItem('storageMode')` 配置
  - **新用户默认使用 uTools DB**
  - **旧用户（已有 JSON 数据）默认使用 JSON**
  - 支持通过设置界面切换存储模式

- ✅ 添加设置界面切换功能
  - 在设置页面的"存储"标签页添加存储引擎选择
  - 添加迁移到 uTools DB 按钮
  - 添加回滚到 JSON 按钮
  - 显示迁移结果提示

### 1.2 待完成

- ⏳ 全面测试 uTools DB 模式
- ⏳ 性能对比测试
- ⏳ 多窗口同步测试
- ⏳ 完善回滚功能（记录备份路径）

---

## 二、代码变更

### 2.1 新增文件

- [src/global/utoolsDB.js](../../src/global/utoolsDB.js) - uTools DB 实现
- [src/global/dbMigration.js](../../src/global/dbMigration.js) - 数据迁移工具

### 2.2 修改文件

- [src/global/initPlugin.js#L17](../../src/global/initPlugin.js#L17) - 导入 UToolsDB
- [src/global/initPlugin.js#L1055-1069](../../src/global/initPlugin.js#L1055-1069) - 添加存储模式切换逻辑
- [src/views/Setting.vue#L63-88](../../src/views/Setting.vue#L63-88) - 添加存储模式 UI
- [src/views/Setting.vue#L400-404](../../src/views/Setting.vue#L400-404) - 添加存储模式状态变量
- [src/views/Setting.vue#L894-994](../../src/views/Setting.vue#L894-994) - 添加存储模式 watch 和迁移处理函数

---

## 三、架构设计

### 3.1 数据分片策略

采用按类型分片策略：

```
clipboard:index          - 索引文档（统计信息、元数据）
clipboard:data:{id}     - 每个剪贴板项独立存储
clipboard:collects       - 收藏列表
clipboard:tags           - 标签数据
```

### 3.2 接口兼容性

UToolsDB 类实现了与现有 DB 类相同的方法：

- `addItem(item)` - 添加数据项
- `removeItem(id, force)` - 删除数据项
- `addCollect(itemId)` - 添加收藏
- `removeCollect(itemId)` - 移除收藏
- `isCollected(itemId)` - 检查是否收藏
- `getCollects()` - 获取收藏列表
- `getCollectsByTag(tag)` - 按标签获取收藏
- `getData()` - 获取所有数据
- `emptyDataBase()` - 清空数据库

---

## 四、使用方式

### 4.1 默认行为

- **新用户**：首次安装时自动使用 uTools DB 存储模式
- **旧用户**：已有 JSON 数据的用户继续使用 JSON 文件存储
- **切换**：所有用户都可以在设置页面切换存储模式

### 4.2 通过设置界面切换

1. 打开插件设置页面
2. 切换到"存储"标签页
3. 在"存储模式"部分选择存储引擎：
   - **JSON 文件**：使用传统的 JSON 文件存储
   - **uTools DB（推荐）**：使用 uTools DB API 存储
4. 选择"uTools DB"后，点击"迁移数据到 uTools DB"按钮
5. 确认迁移操作，系统会自动备份并迁移数据
6. 迁移完成后，重启插件以生效

### 4.3 通过控制台切换

在浏览器控制台执行：

```javascript
// 切换到 uTools DB 模式
utools.dbStorage.setItem('storageMode', 'utools')

// 切换回 JSON 模式
utools.dbStorage.setItem('storageMode', 'json')
```

**注意**：切换后需要重启插件才能生效。

---

## 五、风险评估

### 5.1 已缓解

- ✅ 数据丢失风险：迁移前自动备份
- ✅ 兼容性风险：保持接口兼容，支持模式切换
- ✅ 回滚风险：提供回滚功能

### 5.2 待验证

- ⏳ 性能风险：需要对比 JSON 和 uTools DB 的性能
- ⏳ 并发风险：需要测试多窗口同时操作
- ⏳ 数据完整性：需要验证迁移后数据一致性

---

## 六、测试清单

- [ ] uTools DB 基础 CRUD 测试
- [ ] 数据迁移功能测试
- [ ] 数据完整性验证
- [ ] 性能对比测试（JSON vs uTools DB）
- [ ] 多窗口同步测试
- [ ] 并发写入测试
- [ ] 大数据量测试（1000+ 条）
- [ ] 回滚功能测试
- [ ] 存储模式切换测试

---

## 七、后续步骤

1. **全面测试**
   - 在测试环境验证所有功能
   - 性能基准测试
   - 边界条件测试

2. **完善回滚功能**
   - 记录备份路径到配置
   - 支持选择历史备份进行回滚

3. **灰度发布**
   - 监控新用户使用 uTools DB 的反馈
   - 收集旧用户迁移后的反馈
   - 逐步推广迁移功能

4. **移除 JSON 模式**（长期）
   - 确认 uTools DB 完全稳定后
   - 保留迁移功能，但不再推荐 JSON 模式

---

## 八、非目标

本次 Phase 2 不包含：
- 图片存储优化（使用 `postAttachment`）
- Command 系统重构
- 快捷键自定义 UI

---

**文档版本**: v1.2  
**最后更新**: 2026-04-04
