# Error Memory: EM-2026-04-10-selected-item-render-update-delay

## 1. 背景与症状

### 症状描述
- 选中 item 进行加锁、别名编辑、收藏等操作时，处于选中状态下不能快速更新图标等渲染效果
- 移动 item 后可以快速触发渲染更新
- 单选模式下操作后可以立即更新，多选模式下操作后不能立即更新

### 影响范围
- `src/cpns/ClipItemList.vue` - 主要受影响组件
- 加锁操作（`list-lock`）
- 别名编辑操作（`saveAliasForItem`）
- 收藏操作（`list-collect`）

## 2. 错误归类

- **类型**: `runtime-path-mismatch`, `framework-misuse`
- **原因**: 误判了真实的数据流和渲染依赖关系

## 3. 误判链路

### 尝试过的错误方案（已证伪）
1. 强制刷新 `selectItemList`
2. 更新 `item.updateTime` 以触发 v-memo 重新渲染
3. 在 v-memo 中添加 `getItemAlias` 依赖
4. 从 showList 中重新获取最新的 item 对象替换 selectItemList 中的引用
5. 强制触发 `activeIndex` 变化
6. 强制触发 `selectedItemIdSet` 更新
7. 添加 `isForceRefresh` 标志位到 v-memo
8. 使用 `listKey` 和 `data-refresh-key` 强制重新渲染
9. 移除 v-memo
10. 使用 `instance?.proxy?.$forceUpdate()`
11. 直接修改 selectItemList 中的 item 对象属性
12. 同时更新 showList 中对应的 item 对象属性
13. 通过重新赋值整个对象来触发响应式更新
14. 不调用 `emit("onDataRemove")`
15. 使用 Vue 的 `set` 方法
16. 临时改变 `activeIndex` 来强制触发重新渲染
17. 添加 `listVersion` 到 v-for 的 key
18. 添加 `listKey` 到整个列表容器

### 为什么这些方案失败
- **根本原因未识别**: 这些方案都假设问题在于 Vue 的响应式系统或组件重新渲染机制，但没有识别到真正的问题在于**数据源不一致**
- **错误的数据流理解**: 认为修改 `selectItemList` 中的 item 对象就能触发渲染更新，但实际上渲染使用的是 `showList` 中的 item 对象
- **函数依赖错误**: `isItemCollected` 和 `getItemAlias` 函数依赖于数据库查询（`props.collectedIds` 和 `getAliasMap()`），而不是 item 对象的属性

## 4. 已确认通路

### 真实运行通路
1. **渲染数据源**: ClipItemRow 组件从 `showList` 中获取 item 对象进行渲染，而不是从 `selectItemList`
2. **状态读取**: 
   - `isCollected` 属性通过 `isItemCollected(item)` 函数获取
   - `itemAlias` 属性通过 `getItemAlias(item)` 函数获取
3. **数据流**: 操作 → 数据库 → 函数查询 → 渲染

### 根本原因
- 在多选模式下，操作的是 `selectItemList` 中的 item 对象
- 但渲染使用的是 `showList` 中的 item 对象
- `isItemCollected` 和 `getItemAlias` 函数依赖于数据库查询，不读取 item 对象的属性
- 即使修改了数据库，函数查询也不会立即返回新值（需要等待 `emit("onDataRemove")` 触发父组件重新加载数据）

### 确认的解决方案
1. **修改 `isItemCollected` 函数**: 优先检查 item 对象的 `collected` 属性
   ```javascript
   const isItemCollected = (item) => {
       if (typeof item.collected === 'boolean') {
           return item.collected;
       }
       return props.collectedIds
           ? props.collectedIds.has(item.id)
           : Boolean(window?.db?.isCollected?.(item.id));
   };
   ```

2. **修改 `getItemAlias` 函数**: 优先检查 item 对象的 `alias` 属性
   ```javascript
   const getItemAlias = (item) => {
       if (!item) return "";
       if (typeof item.alias === "string" && item.alias.trim()) return item.alias.trim();
       const map = getAliasMap();
       const fromStore = typeof map[item.id] === "string" ? map[item.id].trim() : "";
       if (fromStore) return fromStore;
       if (typeof item.remark === "string" && item.remark.trim()) return item.remark.trim();
       if (Array.isArray(item.tags) && typeof item.tags[0] === "string" && item.tags[0].trim()) {
           return item.tags[0].trim();
       }
       return "";
   };
   ```

3. **在操作后直接修改 showList 中对应 item 的属性**:
   - 加锁操作: 修改 `showListItem.locked`
   - 收藏操作: 修改 `showListItem.collected`
   - 别名编辑操作: 修改 `showListItem.alias`

## 5. 决策规则

### 推荐优先策略
若遇到"选中状态下操作不立即更新渲染"的问题：
1. **先检查渲染数据源**: 确认渲染使用的是 `showList` 还是 `selectItemList`
2. **确认读取函数**: 检查状态读取函数（如 `isItemCollected`、`getItemAlias`）是否优先检查 item 对象属性
3. **直接修改渲染数据源**: 在操作后直接修改 `showList` 中对应 item 的属性，而不是修改 `selectItemList`

### 通用原则
- **数据源一致性**: 确保操作修改的数据源和渲染使用的数据源是同一个
- **属性优先查询**: 状态读取函数应优先检查 item 对象属性，再回退到数据库查询
- **避免过度强制刷新**: 不要依赖 `forceUpdate`、`listKey` 等强制重新渲染机制，应通过正确的数据流解决问题

## 6. 相关代码位置

- [src/cpns/ClipItemList.vue#L201-L209](src/cpns/ClipItemList.vue#L201-L209) - `isItemCollected` 函数
- [src/cpns/ClipItemList.vue#L239-L250](src/cpns/ClipItemList.vue#L239-L250) - `getItemAlias` 函数
- [src/cpns/ClipItemList.vue#L2230-L2236](src/cpns/ClipItemList.vue#L2230-L2236) - 加锁操作修改 showList
- [src/cpns/ClipItemList.vue#L2199-L2203](src/cpns/ClipItemList.vue#L2199-L2203) - 收藏操作修改 showList
- [src/cpns/ClipItemList.vue#L275-L279](src/cpns/ClipItemList.vue#L275-L279) - 别名编辑操作修改 showList

## 7. 验证方法

- 在多选模式下选中多个 item
- 执行加锁/别名编辑/收藏操作
- 观察图标和渲染效果是否立即更新
- 不需要移动 item 即可看到更新效果
