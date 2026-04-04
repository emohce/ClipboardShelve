# 底层数据重构原始需求梳理

**梳理者**: Cascade  
**原始需求文档**: [260404-czz-数据重构原始需求梳理.md](../todo/260404-底层数据重构/260404-czz-数据重构原始需求梳理.md)  
**梳理日期**: 2026-04-04

---

## 一、ClipboardShelve 数据处理和加载逻辑

### 1.1 数据库架构

#### 数据库结构
ClipboardShelve 使用基于文件的 JSON 数据库，核心数据结构如下：

```javascript
defaultDB = {
  data: [],           // 普通历史记录
  collects: [],       // 收藏的项目ID数组
  collectData: [],    // 收藏的完整项目数据（单独存储，不可删除）
  tags: [],           // 所有使用过的标签
  tagUsage: {},       // 标签使用统计 {tagName: count}
  createTime: Number,
  updateTime: Number
}
```

#### 数据存储特点
- **存储方式**: 单一 JSON 文件，使用 `fs.writeFileSync` 同步写入
- **位置**: 根据设备 ID (`getNativeId()`) 区分不同设备的存储路径
- **持久化策略**: 
  - 防抖写入（300ms 延迟）避免频繁磁盘 I/O
  - 文件监听（`watch`）实现多进程数据同步
  - 通过 `listener.emit('view-change')` 触发视图更新

**代码位置**: [src/global/initPlugin.js#L111-L273](../../src/global/initPlugin.js#L111-L273)

### 1.2 数据加载流程

#### 初始化流程
1. **数据库初始化** ([initPlugin.js#L128-L273](../../src/global/initPlugin.js#L128-L273))
   - 检查数据库文件是否存在
   - 存在则读取并解析 JSON
   - 执行数据迁移（collects 字段迁移、collectData 补充、字段标准化）
   - 应用时间过期清理（`maxage` 配置）
   - 清理不一致的 collects/collectData 关系

2. **数据迁移逻辑**
   - **collects 迁移**: 从旧的 `item.collect` 布尔标记迁移到独立的 `collects` ID 数组
   - **collectData 补充**: 从 `data` 数组复制收藏项到 `collectData`，添加 `collectTime`、`tags`、`remarks` 字段
   - **字段标准化**: 补充 `locked`、`originPaths` 等字段

3. **文件监听** ([initPlugin.js#L274-L292](../../src/global/initPlugin.js#L274-L292))
   - 使用 `fs.watch` 监听数据库文件变化
   - 文件变更时重新读取并更新内存数据
   - 触发 `view-change` 事件通知视图层

### 1.3 剪贴板监听机制

#### 双模式监听架构
ClipboardShelve 实现了**原生监听 + 轮询降级**的双保险机制：

1. **原生监听器** ([initPlugin.js#L1099-L1146](../../src/global/initPlugin.js#L1099-L1146))
   - 使用 uTools 提供的 `listener` 模块
   - 监听 `change`、`close`、`exit`、`error` 事件
   - 异常时自动降级到轮询模式

2. **轮询模式** ([initPlugin.js#L1072-L1097](../../src/global/initPlugin.js#L1072-L1097))
   - 300ms 轮询间隔
   - 通过 `pbpaste()` 读取剪贴板内容
   - MD5 哈希比对避免重复处理

3. **防循环机制** ([initPlugin.js#L978-L1031](../../src/global/initPlugin.js#L978-L1031))
   - `isRestoringClipboard` 标志防止写回循环
   - `lastRestoredItemId` 和 `lastRestoredItemHash` 双重校验
   - `MAX_RESTORE_COUNT` 限制最大连续恢复次数（3次）
   - 500ms 防护窗口

### 1.4 数据处理流程

#### 剪贴板内容读取 ([initPlugin.js#L886-L951](../../src/global/initPlugin.js#L886-L951))
```
pbpaste() 优先级:
1. file 类型 (utools.getCopyedFiles) → 检查是否来自插件临时目录
2. text 类型 (clipboard.readText) → 读取源窗口信息
3. image 类型 (clipboard.readImage) → 大图卡顿来源
```

#### 数据入库逻辑 ([initPlugin.js#L1033-L1070](../../src/global/initPlugin.js#L1033-L1070))
1. 计算 MD5 哈希作为 ID
2. 防循环校验
3. 已存在则更新 `updateTime` 并重新排序
4. 不存在则添加到数组头部
5. 达到 `maxsize` 限制时移除尾部非收藏项
6. 写回剪贴板（常驻模式避免剪贴板清空）

### 1.5 收藏系统设计

#### 收藏数据分离架构
- **collects**: ID 数组，用于快速判断是否收藏
- **collectData**: 完整数据数组，独立存储，不可被时间清理
- **收藏操作**: 从 `data` 移除并深拷贝到 `collectData`，添加 `collectTime`
- **取消收藏**: 从 `collectData` 移除并还原到 `data` 头部

**代码位置**: [src/global/initPlugin.js#L440-L557](../../src/global/initPlugin.js#L440-L557)

### 1.6 标签系统

#### 标签管理功能
- 全局标签列表 (`tags`)
- 标签使用统计 (`tagUsage`)
- 标签自动补全建议 (`getTagSuggestions`)
- 未使用标签自动清理 (`cleanupUnusedTags`)

**代码位置**: [src/global/initPlugin.js#L573-L776](../../src/global/initPlugin.js#L573-L776)

### 1.7 视图层渲染逻辑

#### 列表渲染 ([src/views/Main.vue](../../src/views/Main.vue))
- **懒加载**: 每次 GAP=15 条
- **过滤逻辑**: 支持搜索、锁定状态、标签筛选
- **收藏块**: 非收藏 tab 下展示匹配的收藏结果（`*` 前缀触发）
- **v-memo 优化**: 基于 item、locked、activeIndex、selectedItemIdSet、isCollected 进行 memo

**代码位置**: [src/views/Main.vue#L442-L657](../../src/views/Main.vue#L442-L657)

#### 列表组件 ([src/cpns/ClipItemList.vue](../../src/cpns/ClipItemList.vue))
- 使用 `v-memo` 优化渲染性能
- 图片预览使用 Teleport 到 body
- 长文本预览模态框

**代码位置**: [src/cpns/ClipItemList.vue#L1-L200](../../src/cpns/ClipItemList.vue#L1-L200)

---

## 二、ClipboardManager 实现对比

### 2.1 数据库架构对比

| 特性 | ClipboardShelve | ClipboardManager |
|------|----------------|------------------|
| 数据结构 | 分离式（data + collects + collectData） | 单一 data 数组 |
| 收藏实现 | 独立 collectData 存储 | item.collect 布尔标记 |
| 标签系统 | 完整标签管理（tags + tagUsage） | 无 |
| 字段标准化 | locked、originPaths、collectTime 等 | 基础字段 |
| 数据迁移 | 多层迁移逻辑 | 简单过期清理 |

**ClipboardManager 代码**: [src/global/initPlugin.js#L16-L138](../../../ClipboardManager/src/global/initPlugin.js#L16-L138)

### 2.2 剪贴板监听对比

| 特性 | ClipboardShelve | ClipboardManager |
|------|----------------|------------------|
| 监听模式 | 原生 + 轮询降级 | 原生 + 轮询降级 |
| 防循环机制 | 多重防护（标志 + 哈希 + 计数限制） | 无 |
| 恢复剪贴板 | 常驻模式写回 | 无 |
| 源窗口信息 | 支持（readActiveWindowInfo） | 不支持 |
| 文件路径解析 | 支持（readClipboardSourcePaths） | 不支持 |

**ClipboardManager 代码**: [src/global/initPlugin.js#L196-L229](../../../ClipboardManager/src/global/initPlugin.js#L196-L229)

### 2.3 性能优化对比

| 优化项 | ClipboardShelve | ClipboardManager |
|--------|----------------|------------------|
| 防抖写入 | 300ms 防抖 | 同步写入 |
| 文件监听 | 支持 | 支持 |
| 懒加载 | 支持（GAP=15） | 不支持 |
| v-memo | 支持 | 不支持 |
| 图片处理 | 临时目录过滤 | 无过滤 |

### 2.4 快捷键系统对比

ClipboardShelve 实现了完整的热键分层系统：
- **分层架构**: main、setting、clear-dialog、clip-drawer、full-data-overlay、tag-search、tag-edit
- **状态感知**: search、multi-select 等状态下的不同绑定
- **用户自定义**: 支持通过 `dbStorage` 覆盖快捷键
- **Mac 兼容**: Cmd 与 Ctrl 同根处理

**代码位置**: [src/global/hotkeyBindings.js](../../src/global/hotkeyBindings.js)

ClipboardManager 无复杂快捷键系统。

---

## 三、uTools 框架特点分析

### 3.1 核心架构特点

#### 1. 插件应用结构
- **plugin.json**: 插件配置文件
- **preload.js**: 可调用 Node.js API 和 Electron 渲染进程 API
- **CommonJS 规范**: 使用 `require` 引入 Node.js (16.x) 模块

#### 2. 数据存储能力
- **本地数据库 (utools.db)**: NoSQL 数据库，离线优先，支持云备份&同步
- **dbStorage**: 类 localStorage API，基于本地数据库封装
- **dbCryptoStorage**: 加密存储版本

**参考**: [uTools API 文档 - 数据存储](https://www.u-tools.cn/docs/developer/api-reference/db/local-db.html)

#### 3. 系统交互能力
- **剪贴板**: `clipboard.readText()`, `clipboard.readImage()`, `clipboard.writeText()`
- **文件系统**: `fs.readFileSync`, `fs.writeFileSync`, `fs.watch`
- **剪贴板监听**: `listener` 模块（原生监听程序）
- **窗口管理**: 窗口大小、位置、焦点控制
- **模拟按键**: 键盘鼠标模拟
- **系统通知**: `utools.showNotification()`

### 3.2 性能优化建议

#### 当前实现 vs uTools 最佳实践

| 方面 | 当前实现 | uTools 最佳实践 | 建议 |
|------|----------|----------------|------|
| 数据存储 | JSON 文件 + fs | utools.db 本地数据库 | 迁移到 utools.db 提升并发性能 |
| 写入策略 | 同步写入 + 防抖 | 异步 API + 批量操作 | 使用 dbStorage 异步 API |
| 文件监听 | fs.watch | 数据库变更事件 | 利用数据库内置事件机制 |
| 图片处理 | Base64 存储 | 文件引用 + 缩略图 | 大图存储到文件系统，数据库存引用 |

### 3.3 高效实现方案

#### 方案 1: 迁移到 uTools 本地数据库
```javascript
// 使用 utools.db 替代 JSON 文件
utools.db.promises.put({
  _id: 'clipboard_data',
  data: [...],
  collects: [...],
  collectData: [...],
  tags: [...],
  tagUsage: {...}
})

// 利用数据库的离线优先和云同步能力
```

**优势**:
- 自动处理并发读写
- 支持多设备同步
- 内置变更通知机制
- 更好的数据完整性

#### 方案 2: 图片存储优化
```javascript
// 大图存储到临时目录，数据库存路径
const imagePath = utools.getPath('temp') + '/images/' + id + '.png'
fs.writeFileSync(imagePath, imageBuffer)

// 数据库只存引用
{
  type: 'image',
  data: imagePath,  // 文件路径而非 Base64
  thumbnail: 'data:image/jpeg;base64,...'  // 缩略图
}
```

**优势**:
- 减少数据库大小
- 提升 JSON 序列化性能
- 减少内存占用

#### 方案 3: 使用 Worker 处理批量操作
```javascript
// 在 preload.js 中创建 Worker
const worker = new Worker('batch-operations.js')

// 批量删除、批量收藏等耗时操作放到 Worker
worker.postMessage({ type: 'batchDelete', ids: [...] })
```

**优势**:
- 避免主线程阻塞
- 提升批量操作响应速度

---

## 四、当前痛点分析

### 4.1 列表渲染性能差

#### 根本原因
1. **全量数据加载**: 虽然有懒加载，但过滤逻辑仍在全量数据上执行
2. **图片数据过大**: Base64 编码的图片数据占用大量内存
3. **频繁重新渲染**: 搜索、筛选时触发全量重新计算
4. **v-memo 依赖过多**: memo 依赖项过多导致失效频繁

**代码位置**: [src/views/Main.vue#L609-L657](../../src/views/Main.vue#L609-L657)

#### 性能瓶颈点
- `updateShowList()` 每次都重新过滤全量数据
- `applyCollectFilters()` 多层 filter 链式调用
- 图片 `toDataURL()` 阻塞主线程 ([initPlugin.js#L933](../../src/global/initPlugin.js#L933))

### 4.2 数据存储方式不合理

#### 问题分析
1. **单一大文件**: 所有数据存储在一个 JSON 文件，写入时需序列化全量数据
2. **同步阻塞**: `writeFileSync` 阻塞主线程
3. **无索引**: 查找依赖数组遍历，时间复杂度 O(n)
4. **图片膨胀**: Base64 编码导致文件体积膨胀 33%

**代码位置**: [src/global/initPlugin.js#L302-L310](../../src/global/initPlugin.js#L302-L310)

#### 数据量影响
- 1000 条记录约 5-10MB
- 包含图片时可达 50-100MB
- 每次写入需完整序列化

### 4.3 批量操作导致页面卡死

#### 根本原因
1. **同步批量操作**: 批量删除、批量收藏在主线程同步执行
2. **频繁磁盘写入**: 每次操作都触发 `updateDataBaseLocal()`
3. **无进度反馈**: 用户无法感知操作进度
4. **无取消机制**: 操作开始后无法中断

**代码位置**: [src/views/Main.vue#L683-L721](../../src/views/Main.vue#L683-L721)

#### 卡死场景
- 批量删除 100+ 条记录
- 批量收藏 50+ 条记录
- 清除 7 天内所有记录

### 4.4 快捷键系统不完善

#### 当前问题
1. **逻辑与触发耦合**: 快捷键直接绑定到 UI 操作，核心逻辑未独立
2. **自定义困难**: 修改快捷键需修改代码，无 UI 配置界面
3. **冲突检测缺失**: 无快捷键冲突检测机制
4. **宏功能缺失**: 不支持快捷键序列、条件触发等高级功能

**代码位置**: [src/global/hotkeyBindings.js](../../src/global/hotkeyBindings.js)

#### 设计缺陷
```javascript
// 当前设计：快捷键直接调用 UI 操作
{ layer: "main", shortcutId: "Enter", features: ["list-enter"] }

// 问题：无法独立测试、无法复用逻辑、无法自定义触发方式
```

---

## 五、优化建议

### 5.1 数据层重构

#### 方案 A: 迁移到 uTools 本地数据库
```javascript
// 数据库设计
{
  _id: 'clipboard_data_v2',
  data: [
    { _id: 'item_xxx', type: 'text', data: '...', ... }
  ],
  collects: ['item_xxx', 'item_yyy'],
  tags: ['work', 'personal'],
  tagUsage: { work: 10, personal: 5 }
}

// API 封装
class ClipboardDB {
  async addItem(item) {
    await utools.db.promises.put({ _id: item.id, ...item })
    await this.updateMeta()
  }
  
  async getItems(filter = {}) {
    return await utools.db.promises.getAll({
      filter: doc => doc.type !== 'meta'
    })
  }
}
```

**优势**:
- 异步操作不阻塞主线程
- 自动索引提升查询性能
- 支持云同步
- 内置变更通知

#### 方案 B: 文件 + 数据库混合存储
```javascript
// 大文件存储到文件系统
const storeLargeData = async (data) => {
  if (data.length > 1024 * 1024) { // > 1MB
    const path = utools.getPath('temp') + '/data/' + id
    await fs.promises.writeFile(path, data)
    return { type: 'file', path }
  }
  return { type: 'inline', data }
}

// 数据库只存元数据
{
  _id: 'item_xxx',
  type: 'text',
  content: { type: 'file', path: '...' }, // 或 { type: 'inline', data: '...' }
  metadata: { size: 1024, preview: '...' }
}
```

### 5.2 渲染性能优化

#### 虚拟滚动实现
```vue
<template>
  <RecycleScroller
    :items="filteredItems"
    :item-size="60"
    key-field="id"
    v-slot="{ item }"
  >
    <ClipItemRow :item="item" />
  </RecycleScroller>
</template>
```

**优势**:
- 只渲染可视区域
- 支持 10万+ 条目流畅滚动
- 自动回收 DOM 节点

#### 图片懒加载
```javascript
// 使用 IntersectionObserver
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      loadImage(entry.target.dataset.src)
      observer.unobserve(entry.target)
    }
  })
})
```

#### Web Worker 处理图片
```javascript
// 图片处理放到 Worker
const imageWorker = new Worker('image-processor.js')
imageWorker.postMessage({ type: 'resize', image: base64Data })
imageWorker.onmessage = (e) => {
  // 收到处理后的缩略图
}
```

### 5.3 批量操作优化

#### 异步队列 + 进度反馈
```javascript
class BatchOperationQueue {
  constructor() {
    this.queue = []
    this.isProcessing = false
  }
  
  async add(operation) {
    this.queue.push(operation)
    if (!this.isProcessing) {
      this.process()
    }
  }
  
  async process() {
    this.isProcessing = true
    for (const op of this.queue) {
      await op.execute()
      this.emit('progress', { current: op.index, total: this.queue.length })
    }
    this.queue = []
    this.isProcessing = false
  }
}
```

#### 分批处理
```javascript
// 分批删除，每批 10 条
async batchDelete(ids) {
  const batches = chunk(ids, 10)
  for (const batch of batches) {
    await Promise.all(batch.map(id => deleteItem(id)))
    await sleep(50) // 让出主线程
  }
}
```

### 5.4 快捷键系统重构

#### Action 架构
```javascript
// 核心逻辑独立为 Action
const actions = {
  async copyItem(itemId) {
    const item = await db.getItem(itemId)
    await clipboard.write(item)
    return { success: true }
  },
  
  async collectItem(itemId) {
    await db.collect(itemId)
    return { success: true }
  }
}

// 快捷键只是触发器
const hotkeyBindings = {
  'ctrl+c': { action: 'copyItem', params: ['{selectedId}'] },
  'ctrl+s': { action: 'collectItem', params: ['{selectedId}'] }
}

// 支持多种触发方式
await actions.copyItem(itemId) // 直接调用
await executeHotkey('ctrl+c') // 快捷键触发
await executeAction('copyItem', { itemId }) // Action 触发
```

#### 配置化快捷键
```javascript
// 用户配置存储在 dbStorage
const userHotkeys = await utools.dbStorage.getItem('hotkeys')

// UI 配置界面
<HotkeyConfig 
  :bindings="defaultBindings"
  :userBindings="userHotkeys"
  @save="saveHotkeys"
/>
```

#### 冲突检测
```javascript
function detectConflict(newBinding, existingBindings) {
  const conflict = existingBindings.find(b => 
    b.shortcutId === newBinding.shortcutId &&
    b.layer === newBinding.layer
  )
  return conflict ? { existing: conflict } : null
}
```

---

## 六、重构优先级建议

### 阶段 1: 紧急优化（1-2 周）
1. **图片存储优化**: 大图存储到文件系统，数据库存引用
2. **批量操作分批**: 实现分批处理 + 进度反馈
3. **虚拟滚动**: 引入虚拟滚动组件

### 阶段 2: 架构重构（2-4 周）
1. **迁移到 uTools.db**: 数据库迁移到 uTools 本地数据库
2. **Action 架构**: 重构快捷键系统为核心 Action 架构
3. **配置化快捷键**: 实现快捷键 UI 配置界面

### 阶段 3: 高级功能（4-6 周）
1. **Web Worker**: 图片处理、批量操作放到 Worker
2. **快捷键宏**: 支持快捷键序列、条件触发
3. **冲突检测**: 快捷键冲突自动检测

---

## 七、非目标声明

本次梳理不包含以下内容：
- 具体代码实现细节
- 单元测试用例
- 部署和发布流程
- 用户界面设计
- 第三方库选型对比

---

## 八、参考文档

### 代码关联
- [数据库初始化](../../src/global/initPlugin.js#L111-L273)
- [剪贴板监听](../../src/global/initPlugin.js#L1072-L1146)
- [收藏系统](../../src/global/initPlugin.js#L440-L557)
- [标签系统](../../src/global/initPlugin.js#L573-L776)
- [视图渲染](../../src/views/Main.vue#L442-L657)
- [列表组件](../../src/cpns/ClipItemList.vue#L1-L200)
- [快捷键绑定](../../src/global/hotkeyBindings.js)
- [快捷键注册](../../src/global/hotkeyRegistry.js)

### 外部参考
- [uTools 开发者文档](https://www.u-tools.cn/docs/developer/docs.html)
- [uTools 本地数据库 API](https://www.u-tools.cn/docs/developer/api-reference/db/local-db.html)
- [ClipboardManager 实现](../../../ClipboardManager/src/global/initPlugin.js)

---

**文档版本**: v1.0  
**最后更新**: 2026-04-04
