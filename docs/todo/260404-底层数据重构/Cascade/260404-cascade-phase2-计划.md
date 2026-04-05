# Phase 2 实施计划：数据库迁移到 uTools DB API

**实施日期**: 2026-04-04  
**基于方案**: [clipboard-shelve-refactor-plan-cf3340.md](../../../../../.windsurf/plans/clipboard-shelve-refactor-plan-cf3340.md)

---

## 一、目标

将剪贴板数据从 JSON 文件存储迁移到 uTools DB API，利用其原生数据库能力提升性能和可靠性。

---

## 二、现状分析

### 2.1 当前存储方式
- **存储位置**: JSON 文件，路径由 `setting.database.path` 指定
- **数据结构**:
```javascript
{
  data: [],           // 普通历史记录
  collects: [],       // 收藏项 ID 数组
  collectData: [],    // 收藏完整数据
  tags: [],           // 全局标签列表
  tagUsage: {},       // 标签使用统计
  createTime: Number,
  updateTime: Number
}
```
- **写入方式**: 防抖写入（300ms），全量序列化
- **同步方式**: `fs.watch` 文件监听实现多窗口同步

### 2.2 uTools DB API 特性
- **存储限制**: 单文档最大 1MB
- **API**: `utools.db.put()`, `utools.db.get()`, `utools.db.remove()`, `utools.db.allDocs()`
- **优点**: 
  - 原生数据库，性能更好
  - 自动处理并发和同步
  - 无需手动文件监听
- **缺点**:
  - 单文档大小限制（1MB）
  - 需要分片存储大量数据

---

## 三、迁移方案

### 3.1 数据分片策略

由于单文档限制 1MB，需要将数据分片存储：

**分片方案 A：按类型分片**
- `clipboard:index` - 索引文档，包含统计信息和元数据
- `clipboard:data:{id}` - 每个剪贴板项独立存储
- `clipboard:collects` - 收藏列表
- `clipboard:tags` - 标签数据

**分片方案 B：按时间分片**
- `clipboard:index` - 索引文档
- `clipboard:data:YYYYMM` - 按月分片存储
- `clipboard:collects` - 收藏列表
- `clipboard:tags` - 标签数据

**推荐方案 A**：按类型分片，查询更灵活

### 3.2 数据结构设计

```javascript
// 索引文档
{
  _id: 'clipboard:index',
  createTime: Number,
  updateTime: Number,
  totalCount: Number,
  collectCount: Number
}

// 剪贴板项文档
{
  _id: 'clipboard:data:{id}',
  data: {
    id: String,
    type: String,  // 'text' | 'image' | 'file'
    data: String,  // 文本内容、图片Base64、文件JSON
    thumbnail: String,  // 图片缩略图
    locked: Boolean,
    createTime: Number,
    updateTime: Number,
    sourceApp: String,
    sourceWindowTitle: String,
    sourcePaths: Array,
    // ... 其他字段
  }
}

// 收藏列表
{
  _id: 'clipboard:collects',
  collects: [],  // 收藏 ID 数组
  collectData: []  // 收藏完整数据（可选，也可独立存储）
}

// 标签数据
{
  _id: 'clipboard:tags',
  tags: [],
  tagUsage: {}
}
```

### 3.3 迁移步骤

1. **创建新的 DB 类**（`src/global/initPluginDB.js`）
   - 实现基于 uTools DB API 的数据访问层
   - 保持与现有 DB 类相同的接口

2. **实现数据迁移函数**
   - 读取现有 JSON 文件
   - 转换为新的分片结构
   - 批量写入 uTools DB
   - 验证数据完整性

3. **逐步替换**
   - 添加配置开关，支持新旧存储模式切换
   - 先在测试环境验证
   - 确认无误后全面切换

4. **清理旧代码**
   - 移除 JSON 文件相关代码
   - 移除 `fs.watch` 监听
   - 更新配置界面

---

## 四、风险评估

### 4.1 高风险
- **数据丢失风险**: 迁移过程中可能出现数据丢失
  - 缓解措施：迁移前备份 JSON 文件，迁移后验证数据完整性
- **性能下降**: uTools DB API 性能未知
  - 缓解措施：先进行性能测试，必要时保留降级方案

### 4.2 中风险
- **并发冲突**: 多窗口同时写入可能冲突
  - 缓解措施：uTools DB 自动处理并发，但仍需测试
- **兼容性问题**: 不同 uTools 版本 API 差异
  - 缓解措施：检查 API 兼容性，添加版本检查

### 4.3 低风险
- **回滚困难**: 一旦迁移，回滚到 JSON 文件需要再次转换
  - 缓解措施：保留 JSON 文件备份，实现反向迁移函数

---

## 五、非目标

本次 Phase 2 不包含：
- 图片存储优化（使用 `postAttachment`）- 可作为后续优化
- Command 系统重构 - 独立的 Phase 3
- 快捷键自定义 UI - 独立的 Phase 3

---

## 六、测试清单

- [ ] 新 DB 类单元测试
- [ ] 数据迁移功能测试
- [ ] 数据完整性验证
- [ ] 性能对比测试（JSON vs uTools DB）
- [ ] 多窗口同步测试
- [ ] 并发写入测试
- [ ] 大数据量测试（1000+ 条）
- [ ] 回滚功能测试

---

## 七、实施时间估算

- 新 DB 类开发: 2-3 天
- 数据迁移功能: 1-2 天
- 测试与验证: 2-3 天
- 总计: 5-8 天

---

**文档版本**: v1.0  
**最后更新**: 2026-04-04
