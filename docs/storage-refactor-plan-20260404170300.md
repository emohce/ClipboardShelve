# EzClipboard 存储层统一改造计划（审阅版）

更新时间：2026-04-04 17:03:00
分支：`chore`
目标：在不先大改 UI 的前提下，统一 JSON / uTools 两套持久化实现的接口与行为，解决当前删除等操作在不同存储模式下不一致的问题，并为后续迁移、回滚、测试与扩展打基础。

---

## 1. 背景与目标

当前项目已经支持两种持久化模式：

- JSON 文件存储
- uTools DB 存储

但这两套实现没有通过统一接口收口，而是：

- JSON 实现被内联在 `src/global/initPlugin.js` 中的 `DB` 类里
- uTools 实现在 `src/global/utoolsDB.js`
- UI / 业务层通过 `window.db` 直接依赖底层实例
- 默认假设两套存储实现拥有同一组方法，但实际并不一致

这导致：

- 某些操作（尤其删除）在 `utools` 模式下直接失效
- 同一业务动作在 JSON / uTools 两边行为不完全一致
- 迁移、回滚、批量操作、锁定、标签、收藏等路径持续存在“修一个冒两个”的兼容风险

### 本次计划目标

1. 定义统一的存储接口（store / repository）
2. 将 JSON 与 uTools 存储都实现为同一组方法签名
3. 让业务层只依赖统一语义，不依赖具体存储细节
4. 明确迁移、回滚、批量持久化、事件刷新等边界
5. 先提交详细设计方案，待审阅后再开始代码改造

---

## 2. 当前问题定位（精确到代码位置）

### 2.1 删除逻辑的直接故障：`window.remove` 强依赖 `removeItemViaId`

文件：`src/global/initPlugin.js`
位置：约 `1086`

```js
const remove = (item, options = {}) => db.removeItemViaId(item.id, options)
```

问题：

- JSON 存储 `DB` 类实现了 `removeItemViaId`
- uTools 存储 `UToolsDB` 没有实现 `removeItemViaId`
- `UToolsDB` 当前只有 `removeItem(id, force = false)`

结果：

- UI 调 `window.remove(...)` 时，在 JSON 模式正常
- 在 uTools 模式下，这个调用链不成立，导致删除失败

---

### 2.2 JSON 存储与 uTools 存储方法集合不一致

#### JSON 存储实现位置

文件：`src/global/initPlugin.js`
位置：约 `113-871`
类名：`DB`

主要已实现的方法包括：

- `init`
- `watchDataBaseUpdate`
- `updateDataBase`
- `queuePersist`
- `updateDataBaseLocal`
- `addItem`
- `emptyDataBase`
- `filterDataBaseViaId`
- `updateItemViaId`
- `sortDataBaseViaTime`
- `removeItemViaId`
- `setLock`
- `setLocks`
- `isLocked`
- `addCollect`
- `removeCollect`
- `isCollected`
- `getCollects`
- `getTags`
- `getTagUsage`
- `addGlobalTag`
- `removeGlobalTag`
- `updateItemTags`
- `updateItemRemark`
- `updateItemData`
- `getCollectsByTag`
- `cleanupUnusedTags`
- `getTagSuggestions`
- `migrateImageThumbnails`

#### uTools 存储实现位置

文件：`src/global/utoolsDB.js`
位置：整个文件
类名：`UToolsDB`

当前实现的方法包括：

- `init`
- `wipeAllClipboardDocs`
- `bulkPutHistoryItems`
- `_loadAllDataItems`
- `_putIndex`
- `_putCollects`
- `_putTags`
- `_updateTime`
- `addItem`
- `_putDataItem`
- `removeItem`
- `addCollect`
- `removeCollect`
- `isCollected`
- `getCollects`
- `getCollectsByTag`
- `getData`
- `filterDataBaseViaId`
- `updateItemViaId`
- `_sortData`
- `emptyDataBase`
- `getTags`
- `getTagUsage`
- `updateTags`
- `dataBase getter`

#### 明显缺口

uTools 实现中缺少或不完整的方法 / 能力：

- `removeItemViaId`（当前删除故障的根因）
- `queuePersist`
- `setLock`
- `setLocks`
- `isLocked`
- `updateItemTags`
- `updateItemRemark`
- `updateItemData`
- `getTagSuggestions`
- `cleanupUnusedTags`
- `watchDataBaseUpdate`（若要保留同等语义需重新定义）
- 图片缩略图生成相关策略未与 JSON 对齐

这意味着：

> 当前业务层并不是通过“接口”在工作，而是在赌两边方法刚好长一样。

---

### 2.3 业务层已经散落依赖 `window.db` 的多种方法

#### 主列表删除/清空

文件：`src/views/Main.vue`

关键位置：

- `683`：直接读 `window.db.dataBase.data`
- `680-681`：调用 `window.db.getCollects()` / `getCollectsByTag()`
- `717`：批量清理时调用 `window.remove(item)`
- `774`：收藏页清理时调用 `window.db.removeCollect(item.id, false)`
- `1013`：调用 `window.db.isCollected(item.id)`
- `1017`：收藏页强制删除分支实际执行 `window.db.removeCollect(item.id, false)`
- `1045`：普通删除执行 `window.remove(item, { force })`

#### 操作按钮逻辑

文件：`src/hooks/useClipOperate.js`

关键位置：

- `51`：`window.db.addCollect(item.id)`
- `56`：`window.db.removeCollect(item.id)`
- `77`：`window.db.isCollected(item.id)`
- `106`：`window.remove(item)`
- `148-152`：按钮可见性依赖 `window.db.isCollected`

#### 收藏标签编辑

文件：`src/cpns/TagEditModal.vue`

关键位置：

- `260`：`window.db.updateItemTags(...)`
- `261`：`window.db.updateItemRemark(...)`
- `263`：`window.db.updateItemData(...)`
- `290`：`window.db.removeCollect(...)`

#### 列表快捷键逻辑

文件：`src/cpns/ClipItemList.vue`

关键位置：

- `1901-1904`：收藏 / 取消收藏依赖 `window.db.isCollected / addCollect / removeCollect`
- `1931`：锁定批量调用 `window.setLocks?.(...)`
- `1938`：单条锁定调用 `window.setLock(...)`
- `1972-1977`：普通删除通过 `emit("onItemDelete")` 走外部删除路径
- `2003-2008`：强制删除通过 `emit("onItemDelete")`

结论：

- 业务层已经大量假设 `window.db` 暴露稳定接口
- 但当前这个接口契约并未正式定义
- 改造时必须先统一接口，再统一调用入口

---

### 2.4 配置层与迁移层仍把“JSON 文件路径”作为默认中心概念

#### 配置页

文件：`src/views/Setting.vue`

关键位置：

- `401`：`storageMode` 存在 `utools.dbStorage`
- `895-903`：切换存储模式仅修改配置并提示重启
- `905-954`：迁移到 uTools DB
- `956-990`：从备份回滚到 JSON
- `772-807`：保存时仍校验 JSON 路径
- `777-779`：限制路径必须包含 `_utools_clipboard_manager_storage`

这意味着：

- 即便选择 uTools DB，配置模型里依然默认以 JSON 文件路径为中心
- 当前路径配置承担了“旧数据源路径 / 监听器输入 / 迁移源文件”多个角色
- 这些语义应该在后续设计里拆开或明确说明

#### 迁移层

文件：`src/global/dbMigration.js`

现状：

- 目前支持：JSON -> uTools DB 迁移、基于备份的回滚
- 迁移逻辑直接操作 `UToolsDB` 内部方法，如：
  - `wipeAllClipboardDocs`
  - `bulkPutHistoryItems`
  - `_putCollects`
  - `_putTags`
  - `_putIndex`

问题：

- 迁移层直接依赖存储实现内部细节，耦合偏深
- 后续一旦 `UToolsDB` 内部重构，迁移层也得跟着改
- 更理想的方式是：迁移层依赖“导入/导出协议”或“统一 store 接口的扩展能力”

---

## 3. 根因归纳

### 根因 1：没有正式的统一存储接口

项目实际已经演进成“多后端存储”结构，但没有抽象层。

### 根因 2：JSON 实现历史最久，业务层天然按 JSON 接口长出来

uTools 支持是后加的，所以大量业务调用天然继承了 JSON 时代的命名与副作用约定。

### 根因 3：存储职责、视图刷新职责、迁移职责纠缠在一起

例如：

- 有的存储方法内部直接落盘
- 有的通过 `queuePersist`
- 有的操作后依赖外部 `listener.emit("view-change")`
- 有的迁移逻辑直接调内部私有方法

这让行为边界不清晰，容易在分支实现中失配。

---

## 4. 改造原则

### 4.1 先统一接口，再动实现

先定义“业务可依赖的最小统一能力集合”，再让两边实现都去满足。

### 4.2 尽量不先大改 UI

优先把 UI 层现有调用适配到统一 store，避免在第一轮改造中同时重构界面逻辑。

### 4.3 存储副作用下沉

同一业务动作的持久化、索引更新时间、标签统计等，尽量由 store 自己保证，而不是由 UI 猜何时写入。

### 4.4 兼容迁移与回滚

在抽象接口时，要保留迁移层对“批量导入 / 导出 / 清空”的可扩展能力。

### 4.5 逐步收口，不一次性重写

推荐按“兼容适配 -> 抽出文件 -> 收口调用 -> 清理内部实现”的顺序推进。

---

## 5. 目标架构（建议）

## 5.1 新增统一存储接口层

建议新建目录：

- `src/global/storage/`

建议文件结构：

- `src/global/storage/types.js` 或 `clipboardStore.js`
- `src/global/storage/jsonClipboardStore.js`
- `src/global/storage/utoolsClipboardStore.js`
- `src/global/storage/createClipboardStore.js`

### 建议的统一接口（第一版）

```js
class ClipboardStore {
  async init() {}

  // 读取
  getData() {}
  getCollects() {}
  getCollectsByTag(tag) {}
  getTags() {}
  getTagUsage() {}
  getTagSuggestions(query) {}
  isCollected(id) {}
  isLocked(id) {}
  filterDataBaseViaId(id) {}

  // 写入 / 更新
  async addItem(item) {}
  async updateItemViaId(id) {}
  async removeItemViaId(id, options = {}) {}

  async addCollect(id, log = true) {}
  async removeCollect(id, log = true) {}

  async setLock(id, locked = true, options = {}) {}
  async setLocks(ids, locked = true, options = {}) {}

  async updateItemTags(id, tags) {}
  async updateItemRemark(id, remark) {}
  async updateItemData(id, data) {}
  async updateTags(tags, tagUsage) {}

  async emptyDataBase() {}

  // 持久化 / 刷新
  queuePersist() {}
  emitViewChange?.() {}

  // 兼容现有代码
  get dataBase() {}
}
```

说明：

- 第一版允许继续保留 `dataBase getter`，降低对现有 UI 的侵入
- 后续再逐步把 UI 改成 `getData()` / `getCollects()`，减少对内部结构的直接访问

---

## 5.2 JSON 存储实现独立成文件

当前 JSON `DB` 类在 `src/global/initPlugin.js` 内联定义，体量过大，不利于维护。

建议拆出为：

- `src/global/storage/jsonClipboardStore.js`

拟迁出的代码范围：

文件：`src/global/initPlugin.js`
位置：`113-871` 的整个 `DB` 类

拆出后，`initPlugin.js` 只负责：

- 选择存储模式
- 创建 store
- 初始化监听器
- 挂载 `window.db`
- 处理剪贴板输入/输出逻辑

这样能显著降低 `initPlugin.js` 的职责复杂度。

---

## 5.3 uTools 存储实现补齐统一接口

文件：`src/global/utoolsDB.js`
建议重命名或迁移为：

- `src/global/storage/utoolsClipboardStore.js`

需要补齐 / 统一的核心能力：

### A. 删除兼容接口

新增：

- `removeItemViaId(id, options = {})`

内部统一转发到当前 `removeItem(id, force)` 或直接替代 `removeItem`

### B. 锁定接口

新增：

- `setLock`
- `setLocks`
- `isLocked`

要与 JSON 模式语义一致：

- 普通历史项与收藏项都能锁定
- 批量锁定时支持跳过无变化项
- 根据策略决定是否立即写入 / 延迟写入

### C. 收藏标签编辑接口

新增：

- `updateItemTags`
- `updateItemRemark`
- `updateItemData`
- `getTagSuggestions`
- `cleanupUnusedTags`

否则 `TagEditModal.vue` 在 uTools 模式下并不完整可用。

### D. 持久化协调接口

新增兼容：

- `queuePersist()`

即使 uTools DB 多为即时写入，也建议保留这个空操作或兼容实现，避免业务层分支判断。

### E. 数据访问统一

继续保留：

- `get dataBase()`

但内部实现尽量统一到 `dataCache`，避免 `dataBase / dataCache` 命名混用。

---

## 5.4 工厂层负责模式选择

建议新增：

- `src/global/storage/createClipboardStore.js`

职责：

1. 接收 `storageMode`
2. 接收 JSON 路径、必要依赖（如 listener / debounce writer / setting）
3. 返回统一 store 实例

伪代码：

```js
export async function createClipboardStore({
  storageMode,
  dbPath,
  listener,
  setting,
  deps
}) {
  if (storageMode === 'utools') {
    const store = new UToolsClipboardStore({ listener, setting, deps })
    await store.init()
    return store
  }

  const store = new JsonClipboardStore({ path: dbPath, listener, setting, deps })
  await store.init()
  return store
}
```

这样 `initPlugin.js` 可从“知道两套具体实现”变成“只知道 store 工厂”。

---

## 6. 具体改造范围（按文件列出）

## 6.1 `src/global/initPlugin.js`

### 当前职责过重

当前同时负责：

- 窗口初始化
- JSON 存储实现定义
- 存储模式选择
- 剪贴板读写
- 监听器注册
- 视图全局方法挂载

### 计划动作

1. **移出内联 `DB` 类** 到 `jsonClipboardStore.js`
2. 引入 `createClipboardStore`
3. 创建统一 store 实例
4. `window.remove` 改为调用统一接口
5. `window.setLock / setLocks / queuePersist / isLocked` 都直接绑定统一 store
6. 如有必要，为 store 注入 `listener.emit('view-change')` 能力

### 具体关注位置

- `101-111`：JSON 模式的防抖持久化逻辑，考虑随 JSON store 一起搬走
- `113-871`：整个 `DB` 类，完整迁出
- `1053-1084`：存储模式判断与实例化逻辑，改为调用工厂
- `1086`：删除入口，改为依赖统一接口
- `1346` 附近：全局挂载，需要重新核对统一方法暴露

---

## 6.2 `src/global/utoolsDB.js`

### 当前职责

- uTools DB 文档读写
- 数据缓存
- 迁移期辅助能力

### 计划动作

1. 改为统一 store 实现
2. 补齐缺失接口
3. 统一方法签名
4. 明确哪些方法是公共接口，哪些是内部辅助方法
5. 迁移层依赖的内部方法要么封装成 public import/export API，要么通过注释明确边界

### 具体关注位置

- `266-301`：当前删除实现 `removeItem`
- `369-408`：取消收藏逻辑
- `454-467`：更新时间逻辑，需要复核 `this.dataBase.data` 的用法
- 文件整体：补齐锁定、标签编辑、持久化兼容接口

---

## 6.3 `src/views/Main.vue`

### 当前问题

混合使用：

- `window.db.dataBase.data`
- `window.db.getCollects()`
- `window.remove(...)`
- `window.db.removeCollect(...)`

### 计划动作

第一阶段仅做最小改动：

- 保持现有 UI 逻辑不变
- 让底层统一接口兼容这些调用

第二阶段建议（可后置）：

- 把 `window.db.dataBase.data` 改成 `window.db.getData()`
- 尽量避免 UI 直接依赖 `dataBase` 内部结构

### 具体关注位置

- `680-685`：列表数据来源
- `701-745`：普通数据批量清除
- `747-797`：收藏批量清除
- `1001-1061`：单条删除逻辑

---

## 6.4 `src/hooks/useClipOperate.js`

### 当前问题

直接调用：

- `window.db.addCollect`
- `window.db.removeCollect`
- `window.db.isCollected`
- `window.remove`

### 计划动作

第一阶段：

- 不动业务逻辑，只要求统一 store 完整支持这些方法

第二阶段：

- 可考虑把“删除 / 收藏 / 取消收藏”的规则沉到 service 层，减少 Hook 里的业务分支

### 具体关注位置

- `48-57`
- `72-108`
- `147-162`

---

## 6.5 `src/cpns/TagEditModal.vue`

### 当前问题

对 store 的能力要求很高：

- 编辑标签
- 编辑备注
- 编辑文本原始内容
- 取消收藏

JSON 模式有这些接口，uTools 模式目前不完整。

### 计划动作

确保统一 store 明确支持：

- `updateItemTags`
- `updateItemRemark`
- `updateItemData`
- `removeCollect`

### 具体关注位置

- `254-281`
- `286-310`

---

## 6.6 `src/cpns/ClipItemList.vue`

### 当前问题

键盘快捷键路径里依赖：

- `window.db.isCollected`
- `window.db.addCollect`
- `window.db.removeCollect`
- `window.setLock`
- `window.setLocks`

### 计划动作

第一阶段不改行为，只要求统一 store 提供完整兼容接口。

### 具体关注位置

- `1893-1916` 收藏逻辑
- `1918-1941` 锁定逻辑
- `1943-2025` 删除逻辑（经 `emit("onItemDelete")` 间接走外层）

---

## 6.7 `src/views/Setting.vue`

### 当前问题

配置页既负责：

- 存储模式切换
- JSON 路径配置
- 迁移 / 回滚

但当前模型里“路径”的语义偏混杂。

### 计划动作

第一阶段：

- 保持现有交互
- 只补文档与内部实现兼容

第二阶段建议：

- 明确 `database.path` 是 JSON 数据源路径，而非 uTools DB 路径
- 优化文案，避免用户误以为 uTools 模式仍依赖这个 JSON 文件作为主库

### 具体关注位置

- `400-405`：存储模式状态
- `772-807`：保存逻辑
- `895-903`：模式切换提示
- `905-954`：迁移逻辑
- `956-990`：回滚逻辑

---

## 6.8 `src/global/dbMigration.js`

### 当前问题

迁移层直接调用 `UToolsDB` 内部实现细节，耦合较深。

### 计划动作

第一阶段：

- 保持功能可用
- 在新接口层稳定后，再评估是否改为调用统一 store 的导入 API

第二阶段建议：

- 为 store 增加导入导出协议，例如：
  - `exportSnapshot()`
  - `importSnapshot(snapshot)`
  - `clearAll()`

这样迁移不需要了解 `_putCollects / _putTags / _putIndex` 等内部方法。

### 具体关注位置

- `73-122`：迁移写入逻辑
- `172-178`：实例化并清空 uTools DB
- `207-209`：回滚时重新 init 再清空

---

## 7. 分阶段实施方案

## 阶段 0：仅文档与审阅（本次）

交付物：

- 本计划文档
- 明确问题与目标架构

不做代码修改。

---

## 阶段 1：接口对齐 + 删除修复（最小闭环）

目标：先让两套存储都具备同一套最小业务接口，优先修复删除失效。

建议动作：

1. 在 uTools store 中补 `removeItemViaId`
2. 补 `setLock / setLocks / isLocked / queuePersist`
3. 补 `updateItemTags / updateItemRemark / updateItemData`
4. 补 `getTagSuggestions`
5. 保证 `window.remove`、`window.setLock`、`window.setLocks`、`window.queuePersist` 都能在两种模式工作

交付标准：

- 普通删除在 JSON / uTools 模式都能工作
- 强制删除在两边语义一致
- 锁定/解锁在两边语义一致
- 收藏标签编辑在两边语义一致

风险：

- 仍有一定技术债，因为 JSON `DB` 类还在 `initPlugin.js` 里

---

## 阶段 2：抽离 JSON store + 建立工厂层

目标：把“统一接口”正式落在结构上，而不是只靠补方法兼容。

建议动作：

1. 将 `DB` 类从 `initPlugin.js` 迁出为 `jsonClipboardStore.js`
2. 将 `UToolsDB` 迁移/重命名为 `utoolsClipboardStore.js`
3. 新增 `createClipboardStore.js`
4. `initPlugin.js` 只负责创建 store、挂全局引用、初始化监听

交付标准：

- `initPlugin.js` 文件明显瘦身
- 两套存储实现位于同一目录、同一抽象层级
- 代码结构一眼可看出“这是多后端存储架构”

---

## 阶段 3：收口 UI 对 `dataBase` 结构的直接依赖

目标：让业务层从“依赖内部结构”转为“依赖统一读接口”。

建议动作：

1. 将 `window.db.dataBase.data` 改为 `window.db.getData()`
2. 逐步减少直接访问 `collectData / collects / tagUsage`
3. 将更多业务判断从 UI 下沉到 store / service 层

交付标准：

- UI 不再假设底层数据结构长什么样
- 后续换存储实现时，前端页面基本无感知

---

## 阶段 4：迁移协议统一化

目标：降低 `dbMigration.js` 对底层实现内部方法的依赖。

建议动作：

1. 为 store 定义 snapshot 导入导出协议
2. 迁移逻辑改为“读 JSON 快照 -> 导入目标 store”
3. 回滚逻辑改为“恢复 JSON 备份 -> 清空目标 store”

交付标准：

- 迁移层不再直接调用 `_putCollects / _putTags / _putIndex`
- 后续支持更多持久化后端时，迁移层可以复用

---

## 8. 风险与注意事项

### 8.1 当前行为里包含一些“历史语义”，重构时不能误伤

例如：

- 收藏并不是简单加标记，而是会从普通历史移除，转移到 `collectData`
- 取消收藏会重新插回普通历史，并刷新时间
- 锁定既作用于普通历史，也作用于收藏项
- JSON 模式有防抖写盘，uTools 模式多为即时写入

这些不是实现细节，而是用户可感知行为，改造时要保持一致。

### 8.2 `queuePersist` 需要定义清楚语义

建议统一语义为：

- “请求将当前内存状态持久化到存储后端”

在 JSON 模式：

- 真实做防抖落盘

在 uTools 模式：

- 可以是 no-op
- 或执行轻量同步/刷新

但不应让业务层感知差异。

### 8.3 `listener.emit('view-change')` 的责任边界需明确

当前有些操作后：

- store 自己只改数据
- UI 再手动 emit 视图更新

后续要明确：

- 是由 store 内部负责触发视图事件
- 还是业务层在批量完成后统一触发

建议第一轮先维持现状，不贸然把事件派发全部塞进 store，避免造成多次刷新。

---

## 9. 建议的审阅重点

请优先审这几项：

1. **是否认可统一 store 接口的总体方向**
2. **是否接受第一阶段先做接口补齐、先不大动 UI**
3. **是否同意把 JSON `DB` 类从 `initPlugin.js` 拆出去**
4. **是否希望迁移层本轮一起做，还是放到第二/三轮**
5. **是否要继续保留 `window.db.dataBase` 兼容层，还是尽早禁用**

---

## 10. 我建议的实际执行顺序

如果你审完通过，我建议按下面顺序做：

### Round 1

- 补 uTools 缺失接口
- 修复删除
- 统一锁定 / 标签编辑 / 兼容持久化方法

### Round 2

- 把 JSON store 从 `initPlugin.js` 拆出去
- 建立 `storage/` 目录和工厂层

### Round 3

- 收口 UI 对 `dataBase` 的直接访问
- 统一迁移协议

---

## 11. 本计划对应的直接结论

### 结论 1

你提的方向是对的：

> 应该统一删除逻辑，抽象数据持久化逻辑，然后根据用户配置调用 JSON 或 uTools 实现。

### 结论 2

当前删除失败只是表面现象，真正的问题是：

> 项目已经是双存储架构，但还没有正式的“统一存储层”。

### 结论 3

本次不建议继续点状修 bug，而应以“接口统一”为第一修复目标。

---

## 12. 审阅后可选下一步

如果你确认这版计划可行，下一步我可以继续输出两份补充文档：

1. **接口定义草案 MD**
   - 把每个 store 方法的入参、返回值、行为约定写清楚

2. **实施任务清单 MD**
   - 按 commit 粒度拆成可执行 TODO 列表

这样你就可以先审架构，再审具体落地步骤。
