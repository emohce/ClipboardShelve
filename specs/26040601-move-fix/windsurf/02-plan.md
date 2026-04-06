# Plan: 列表移动效果优化

## 1. 变更目标

优化剪贴板列表主界面的键盘移动体验，解决长按上下键、单步移动可见性、删除后选中、锁状态更新、图标渲染等 5 类问题。

## 2. 现状与根因

### 2.1 长按上下键问题
- **现状**：当前通过 `e?.repeat` 检测长按，但只是重复触发单步移动（`list-nav-up`/`list-nav-down`），没有分页滚动逻辑
- **根因**：缺少长按上下键的独立检测和分页滚动触发机制，`autoScrollTimer` 相关代码存在但未实现

### 2.2 单步移动可见性问题
- **现状**：`useVirtualListScroll.js` 中 `isNodeFullyVisible` 判断完全可见，但 `scrollToIndex` 使用 `block: "nearest"` 可能会在部分可见时滚动
- **根因**：可见性判断标准与用户需求不一致（用户要求"一半算不可见"），且 `scrollToIndex` 未正确应用可见性判断结果

### 2.3 删除后选中问题
- **现状**：已有 `deleteAnchor` 和 `pendingActiveIndexAfterDelete` 机制，但删除后选中效果仍可能错位
- **根因**：`Main.vue` 中 `adjustActiveIndexAfterDelete` 逻辑可能不完善，边界条件处理不当（如删除第一条、最后一条）

### 2.4 锁状态更新问题
- **现状**：当前通过 `scheduleLockPersist` 延迟持久化（setTimeout 0），可能导致更新不及时
- **根因**：延迟持久化机制设计不当，应立即调用 `window.queuePersistDb()`

### 2.5 图标渲染问题
- **现状**：锁/收藏图标渲染时可能触发异常换行
- **根因**：`ClipItemRow.vue` 中图标布局未使用 flex 布局，缺少文本溢出处理

## 3. 设计方案

### 3.1 长按上下键分页滚动
- 在 `ClipItemList.vue` 中添加长按上下键的独立检测（不依赖 `e?.repeat`）
- 长按触发延迟 260ms（复用 `AUTO_SCROLL_INITIAL_DELAY`）
- 长按触发后调用 `scrollHalfPage` 方法（复用 `useVirtualListScroll.js` 的实现）
- 分页后调用 `setActiveIndex` 并使用 `block: "center"` 居中展示
- 释放按键时清理定时器

### 3.2 单步移动可见性控制
- 修改 `useVirtualListScroll.js` 中的 `isNodeFullyVisible` 为 `isNodeHalfVisible`，判断元素是否至少一半可见
- 修改 `scrollToIndex` 方法，使用 `isNodeHalfVisible` 判断结果
- 目标项至少一半可见时不滚动，否则滚动到可见

### 3.3 删除后选中优化
- 优化 `Main.vue` 中的 `adjustActiveIndexAfterDelete` 方法
- 删除中间项：选中 `originalIndex - 1`（上一条）
- 删除第一条：选中 `0`（下一条，即原第二条）
- 删除最后一条：选中 `originalIndex - 1`（上一条）
- 删除后立即调用 `scrollActiveNodeIntoView` 确保可见

### 3.4 锁状态立即更新
- 移除 `ClipItemList.vue` 中的 `scheduleLockPersist` 延迟机制
- 锁/收藏状态切换时立即调用 `window.queuePersistDb()`
- 确保状态更新不等待移动选中

### 3.5 图标渲染优化
- 在 `ClipItemRow.vue` 中为图标容器添加 flex 布局
- 为文本内容添加 `flex: 1` 和 `overflow: hidden`
- 为图标添加 `flex-shrink: 0` 防止压缩
- 添加 `text-overflow: ellipsis` 和 `white-space: nowrap` 处理文本溢出

## 4. 受影响文件

### 4.1 主要文件
- `src/cpns/ClipItemList.vue`
  - 添加长按上下键检测逻辑
  - 修改锁状态持久化机制
  - 调整删除后选中行为
- `src/hooks/useVirtualListScroll.js`
  - 修改 `isNodeFullyVisible` 为 `isNodeHalfVisible`
  - 修改 `scrollToIndex` 应用新的可见性判断
- `src/hooks/useListNavigation.js`
  - 优化删除后选中逻辑（可能需要调整）
- `src/views/Main.vue`
  - 优化 `adjustActiveIndexAfterDelete` 方法

### 4.2 次要文件
- `src/cpns/ClipItemRow.vue`
  - 优化图标布局和文本溢出处理

### 4.3 样式文件
- `src/style/` 下的相关 Less 文件（可能需要新增图标缩略样式类）

## 5. 数据与状态变更

### 5.1 状态变更
- `activeIndex`：删除后选中上一条（边界条件特殊处理）
- `deleteAnchor`：优化删除后的选中锚点逻辑
- `locked`/`collected`：立即持久化到数据库

### 5.2 数据流变更
- 锁/收藏状态切换：操作后立即调用 `window.queuePersistDb()`，不等待移动选中
- 删除操作：优化选中索引计算逻辑，确保选中上一条

### 5.3 持久化变更
- 锁/收藏状态：从延迟持久化改为立即持久化
- 删除操作：保持现有持久化逻辑不变

## 6. 接口与交互变更

### 6.1 键盘交互变更
- 长按上下键：从重复单步移动改为分页滚动并居中
- 单击上下键：从 `block: "nearest"` 改为"可见则不滚，不可见才滚"

### 6.2 删除交互变更
- 删除后选中：从可能错位改为选中上一条（边界条件特殊处理）

### 6.3 视觉交互变更
- 图标渲染：从可能换行改为不换行，内容挤压时图标缩略展示

### 6.4 无接口变更
- 不涉及组件 props、emits 变更
- 不涉及全局 API 变更

## 7. 实施步骤

### 7.1 步骤 1：修改可见性判断逻辑
- 文件：`src/hooks/useVirtualListScroll.js`
- 操作：
  - 修改 `isNodeFullyVisible` 为 `isNodeHalfVisible`
  - 判断元素是否至少一半可见（`nodeRect.top >= containerRect.top - nodeRect.height / 2` 且 `nodeRect.bottom <= containerRect.bottom + nodeRect.height / 2`）
  - 修改 `scrollToIndex` 方法，使用 `isNodeHalfVisible` 判断结果
- 验证：单步移动时，目标项一半可见时不滚动

### 7.2 步骤 2：实现长按上下键分页滚动
- 文件：`src/cpns/ClipItemList.vue`
- 操作：
  - 添加长按上下键检测逻辑（监听 `keydown` 和 `keyup`）
  - 长按触发延迟 260ms
  - 长按触发后调用 `scrollHalfPage` 方法
  - 分页后调用 `setActiveIndex` 并使用 `block: "center"`
  - 释放按键时清理定时器
- 验证：长按上下键时，列表分页滚动且选中项居中

### 7.3 步骤 3：优化删除后选中逻辑
- 文件：`src/views/Main.vue`
- 操作：
  - 优化 `adjustActiveIndexAfterDelete` 方法
  - 删除中间项：选中 `originalIndex - 1`
  - 删除第一条：选中 `0`
  - 删除最后一条：选中 `originalIndex - 1`
  - 删除后立即调用 `scrollActiveNodeIntoView`
- 验证：删除后选中上一条，不错位不闪烁

### 7.4 步骤 4：优化锁状态持久化
- 文件：`src/cpns/ClipItemList.vue`
- 操作：
  - 移除 `scheduleLockPersist` 延迟机制
  - 锁/收藏状态切换时立即调用 `window.queuePersistDb()`
- 验证：锁状态切换后立即持久化，不等待移动选中

### 7.5 步骤 5：优化图标渲染
- 文件：`src/cpns/ClipItemRow.vue`
- 操作：
  - 为图标容器添加 flex 布局
  - 为文本内容添加 `flex: 1` 和 `overflow: hidden`
  - 为图标添加 `flex-shrink: 0`
  - 添加 `text-overflow: ellipsis` 和 `white-space: nowrap`
- 验证：图标不触发换行，内容挤压时图标缩略展示

### 7.6 步骤 6：边界条件测试
- 操作：测试空列表、单项列表、懒加载、并发操作等边界条件
- 验证：所有边界条件下行为正常

## 8. 测试与验证方案

### 8.1 自动化验证
- 运行 `pnpm run build` 确保构建成功
- 检查 TypeScript/JavaScript 语法错误

### 8.2 手工验证
- 启动 `pnpm run serve`
- 测试长按上下键分页滚动
- 测试单步移动可见性控制
- 测试删除后选中行为
- 测试锁状态及时更新
- 测试图标渲染不换行
- 测试不同 tab 下行为一致性
- 测试搜索面板展开时行为一致性

### 8.3 性能验证
- 测试单行渲染性能（确保在 300ms 内）
- 测试虚拟滚动性能（确保不影响现有性能）

## 9. 风险与回滚点

### 9.1 风险
- **风险 1**：长按上下键检测可能与现有快捷键冲突
  - 缓解：仅在 main layer 且非搜索输入框聚焦时触发
- **风险 2**：可见性判断修改可能影响其他滚动场景
  - 缓解：仅修改 `scrollToIndex` 方法，不影响其他滚动方法
- **风险 3**：删除后选中逻辑可能影响多选模式
  - 缓解：仅在非多选模式下应用新逻辑
- **风险 4**：图标布局修改可能影响现有样式
  - 缓解：仅修改图标容器布局，不改变图标样式

### 9.2 回滚点
- 每个步骤独立提交，可单独回滚
- 步骤 1-5 依次实施，每个步骤验证通过后再进行下一步
- 如某步骤失败，回滚该步骤并重新设计

## 10. 待确认项

- 长按上下键的触发延迟时间（当前为 260ms，是否需要调整）
- 分页滚动的加速机制（是否需要随长按时间加速）
- 图标缩略展示的具体样式（是否需要新增 CSS 类）
