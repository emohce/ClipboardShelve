# Plan: 移动效果优化

基于 `01-spec.md` 的实现规划

## 1. 核心策略

### 1.1 滚动策略区分
| 操作类型 | 滚动策略 | 对齐方式 |
|---------|---------|---------|
| 长按（>300ms）| 分页步进 | `block: "center"` |
| 单步（单击） | 可见性判断 | `block: "nearest"` |
| 边界触发 | 强制滚动 | `block: "start"` / `"end"` |

### 1.2 关键修复点
1. **删除后选中错乱**: 修复 `pendingHighlightedItemId` 逻辑，确保与 `showList` 变化后的索引映射正确
2. **锁状态延迟**: 将图标状态绑定从 `activeIndex` 判断改为直接绑定 item 数据
3. **图标换行**: 使用 `flex-shrink: 0` + `min-width: 0` + `text-overflow: ellipsis` 组合

## 2. 状态与数据变化

### 2.1 ClipItemList.vue
```
// 修改函数
setKeyboardActiveIndex(nextIndex, options)
  - 新增: 单步模式使用 isNodeFullyVisible 判断
  - 修改: block 参数根据操作类型动态设置

startKeyHoldAutoScroll(direction)
  - 修改为复用分页逻辑（使用 getPageStep）
  - 移除: 原有的逐项居中逻辑

scrollActiveNodeIntoView(index, options)
  - 新增: forceScroll 参数控制
  - 修改: 单步模式优先使用 nearest 对齐

// watch 修复
props.showList 变化时
  - 修复: pendingHighlightedItemId 的索引查找逻辑
```

### 2.2 ClipItemRow.vue
```
// 状态绑定
isLocked
  - 从 computed(activeItem.locked) 改为直接 prop

// 样式
.locked-icon, .collected-icon
  - 新增: flex-shrink: 0
  - 新增: max-width 限制

.content-text
  - 新增: min-width: 0
  - 新增: overflow: hidden + text-overflow: ellipsis
```

## 3. 接口/交互变化

### 3.1 无接口变化
- 所有改动均为内部实现优化，不改变组件 props/emits
- 快捷键绑定保持不变

### 3.2 视觉交互变化
| 场景 | 当前行为 | 优化后行为 |
|------|---------|-----------|
| 长按 ↑/↓ | 逐项强行居中 | 分页步进居中 |
| 单击 ↑/↓ | 总是居中 | 可见时不滚 |
| 删除 item | 有时选中错位 | 正确选中下一项 |
| 锁定快捷键 | 移动后才更新图标 | 立即更新图标 |

## 4. 实施步骤

### Step 1: 单步滚动优化
**文件**: `src/cpns/ClipItemList.vue`
**修改**:
- 修改 `setKeyboardActiveIndex`：单步移动时判断 `isNodeFullyVisible`
- 修改 `registerFeature("list-nav-up")` 和 `registerFeature("list-nav-down")`：单步使用 `"nearest"`

### Step 2: 长按分页优化
**文件**: `src/cpns/ClipItemList.vue`
**修改**:
- 修改 `startKeyHoldAutoScroll`：使用 `getPageStep()` 计算步进
- 长按滚动时调用 `setKeyboardActiveIndex(targetIndex, { block: "center" })`

### Step 3: 删除后选中修复
**文件**: `src/cpns/ClipItemList.vue`
**修改**:
- 修复 `watch(() => props.showList)` 中的 `pendingHighlightedItemId` 处理逻辑
- 确保删除后 `activeIndex` 指向正确的 item

### Step 4: 锁状态即时更新
**文件**: `src/cpns/ClipItemRow.vue`
**修改**:
- 确保 `locked` 状态直接绑定到 item 数据
- 检查 `v-memo` 是否包含 `item.locked` 以确保更新

### Step 5: 图标布局优化
**文件**: `src/style/cpns/clip-item-row.less`
**修改**:
- 图标容器添加 `flex-shrink: 0`
- 内容区域添加 `min-width: 0` 和文本缩略

## 5. 验证方案

### 5.1 构建验证
```bash
pnpm run build
```

### 5.2 功能验证清单
- [ ] 长按 ↑/↓ 按页跳转，每页居中
- [ ] 单击 ↑/↓ 可见 item 不滚动
- [ ] 删除 item 后选中状态正确
- [ ] 锁定快捷键后图标立即变化
- [ ] 长文本+图标组合时布局不崩

### 5.3 性能验证
- [ ] 列表滚动 60fps 无卡顿
- [ ] 快速方向键操作不丢响应
- [ ] 大数据量（>1000）下操作流畅

## 6. 风险与回滚点

| 风险 | 缓解措施 | 回滚点 |
|------|---------|--------|
| 虚拟滚动计算错误 | 保留降级 DOM 滚动方案 | Step 1 |
| 选中状态修复不完整 | 增加边界测试用例 | Step 3 |
| 图标布局影响其他元素 | 限制样式作用域 | Step 5 |

## 7. 依赖关系

```
Step 1 (单步滚动) ──┐
                    ├──→ Step 3 (删除修复) ──→ 验证
Step 2 (长按分页) ──┘

Step 4 (锁状态) ──→ Step 5 (图标布局) ──→ 验证
```
