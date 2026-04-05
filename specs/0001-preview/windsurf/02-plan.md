# Plan: Preview效果优化

## 1. 目标摘要
基于 `01-spec.md`，本次计划将预览效果优化拆分为4个原子任务，保持最小改动原则，仅修改 `src/cpns/ClipItemList.vue` 文件。

## 2. 受影响文件

| 文件 | 修改范围 | 说明 |
|------|---------|------|
| `src/cpns/ClipItemList.vue` | 4处函数修改 | 图片预览样式、文字预览样式、键盘滚动、鼠标移动阻断 |

## 3. 状态/数据变化

### 3.1 新增状态
| 状态名 | 类型 | 用途 |
|--------|------|------|
| `isPreviewActive` | `ref(boolean)` | 标记是否处于预览模式，用于阻断鼠标切换 |

### 3.2 修改的状态结构
| 状态 | 字段 | 变更 |
|------|------|------|
| `imagePreview` | `imageStyle` | 新增 `minWidth` 约束，调整 `maxHeight` 为 `none`，容器支持滚动 |
| `textPreview` | `style` | `width` 改为 `90%`，单行模式添加 `textOverflow: ellipsis`，多行保持 `pre-wrap` |

## 4. 接口/交互变化

### 4.1 图片预览交互变化
| 场景 | 当前行为 | 新行为 |
|------|---------|--------|
| 小图片 | 按原尺寸显示 | 自动扩放至 `min(availableWidth, max(原宽度, 200px))` |
| 高图片 | 限制 max-height | 移除 max-height 限制，容器可滚动 |
| Shift+上下键 | 仅图片预览滚动 | 保持每次100px滚动，检查并统一文本预览也支持 |

### 4.2 文字预览交互变化
| 场景 | 当前行为 | 新行为 |
|------|---------|--------|
| 单行文本 | 自动换行 | 不换行，超长用 `...` 截断 |
| 多行文本 | 自动换行 | 保持换行，支持 Shift+上下键滚动 |
| 宽度 | 动态计算 maxWidth | 固定 `width: 90%` |

### 4.3 预览状态交互变化
| 场景 | 当前行为 | 新行为 |
|------|---------|--------|
| 按住Shift预览 | 鼠标移动会触发 `handleMouseOver` 切换预览 | 增加 `isPreviewActive` 检查，预览激活时阻断 `activeIndex` 变更 |
| 松开Shift后 | 自动关闭预览 | 关闭预览并恢复鼠标移动响应 |

## 5. 实施步骤

### T1: 图片预览样式优化
**修改函数**: `showImagePreview`

**具体修改**:
1. 图片样式 (`imageStyle`) 调整：
   ```javascript
   imagePreview.value.imageStyle = {
     maxWidth: `${availableWidth}px`,
     maxHeight: 'none',           // 移除高度限制
     minWidth: '200px',           // 极小图片最小宽度
     width: 'auto',
     height: 'auto',
     objectFit: 'none',
     display: 'block',
   };
   ```

2. 容器样式调整，支持滚动：
   ```javascript
   // imagePreviewContentRef 容器添加 overflow: auto
   // 在 template 中修改 .image-preview-content 的样式
   ```

**验证点**:
- 小图片（<200px）扩放到200px宽度
- 高图片宽度铺满，可滚动查看
- Shift+上下键滚动图片预览正常

### T2: 文字预览样式优化
**修改函数**: `showTextPreview`

**具体修改**:
1. 容器宽度改为90%：
   ```javascript
   textPreview.value.style = {
     // ...
     width: `${maxW * 0.9}px`,    // 改为固定宽度
     maxWidth: `${maxW * 0.9}px`,
     // ...
   };
   ```

2. 添加单行判断和样式：
   ```javascript
   const text = item.data || "";
   const isSingleLine = !text.includes('\n') && text.length < 100;
   
   if (isSingleLine) {
     textPreview.value.style.whiteSpace = 'nowrap';
     textPreview.value.style.textOverflow = 'ellipsis';
     textPreview.value.style.overflow = 'hidden';
   } else {
     textPreview.value.style.whiteSpace = 'pre-wrap';
     textPreview.value.style.wordBreak = 'break-word';
   }
   ```

**验证点**:
- 单行文本铺满90%宽度，超长显示 `...`
- 多行文本正常换行显示
- 半透明黑色背景和圆角保持

### T3: 文本预览键盘滚动支持
**新增函数**: `handleTextPreviewKeydown`
**修改函数**: 键盘事件监听

**具体修改**:
1. 在 `handleImagePreviewKeydown` 中扩展支持文本预览：
   ```javascript
   const handlePreviewKeydown = (event) => {
     const isImagePreview = imagePreview.value.show;
     const isTextPreview = textPreview.value.show;
     
     if (!isImagePreview && !isTextPreview) return;
     if (!(event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown"))) return;
     
     event.preventDefault();
     event.stopPropagation();
     
     const container = isImagePreview 
       ? imagePreviewContentRef.value 
       : document.querySelector('.text-preview-modal');
     
     if (!container) return;
     
     const scrollStep = 100;
     if (event.key === "ArrowUp") {
       container.scrollTop = Math.max(0, container.scrollTop - scrollStep);
     } else {
       const maxScroll = container.scrollHeight - container.clientHeight;
       container.scrollTop = Math.min(maxScroll, container.scrollTop + scrollStep);
     }
   };
   ```

**验证点**:
- 文本预览时 Shift+上下键可滚动
- 图片预览滚动保持正常
- 非预览状态快捷键不拦截

### T4: 预览状态鼠标阻断
**修改函数**: `showImagePreview`, `showTextPreview`, `handleMouseOver`, `stopImagePreview`, `hideTextPreview`

**具体修改**:
1. 新增状态：
   ```javascript
   const isPreviewActive = ref(false);
   ```

2. 预览显示时设置标志：
   ```javascript
   // 在 showImagePreview 和 showTextPreview 中
   imagePreview.value.show = true;  // 或 textPreview.value.show = true
   isPreviewActive.value = true;
   ```

3. 预览关闭时清除标志：
   ```javascript
   // 在 stopImagePreview 和 hideTextPreview 中
   isPreviewActive.value = false;
   ```

4. handleMouseOver 添加阻断：
   ```javascript
   const handleMouseOver = (event, index, item) => {
     // 预览激活时阻断 activeIndex 变更
     if (isPreviewActive.value && !keyboardTriggeredPreview.value) {
       // 仅允许预览区域内的鼠标交互
       return;
     }
     // ... 原有逻辑
   };
   ```

**验证点**:
- 按住Shift预览时，鼠标移动不切换预览内容
- 松开Shift后，鼠标移动恢复正常切换
- 非Shift触发的预览（如hover预览）不受影响

## 6. 验证方案

### 6.1 构建验证
```bash
npm run build
```
预期：构建成功，无报错

### 6.2 功能验证
| 任务 | 验证步骤 |
|------|---------|
| T1 | 1. 复制小图片 2. 按住Shift预览 3. 检查图片是否扩放 4. 复制长截图 5. 检查是否宽度铺满+可滚动 |
| T2 | 1. 复制单行长文本 2. 预览检查是否90%宽度+不换行+ellipsis 3. 复制多行文本 4. 检查正常显示 |
| T3 | 1. 复制多行文本 2. Shift预览 3. 按Shift+↓检查滚动 4. 同测图片预览滚动 |
| T4 | 1. Shift预览图片 2. 鼠标移动到列表其他条目 3. 检查预览是否保持不变 4. 松开Shift检查是否恢复正常 |

### 6.3 回归验证
- [ ] 现有图片预览基础功能正常
- [ ] 现有文字预览基础功能正常
- [ ] Shift长按触发预览机制正常
- [ ] ESC关闭预览正常

## 7. 风险与回滚点

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 图片扩放导致模糊 | 低 | 中 | 保持原图src，扩放由CSS控制，用户可接受 |
| 文本截断影响用户体验 | 低 | 低 | 仅单行截断，多行保持完整 |
| 鼠标阻断过于激进 | 中 | 中 | 仅在 `isPreviewActive && !keyboardTriggeredPreview` 时阻断 |
| 键盘滚动冲突 | 低 | 中 | 检查事件冒泡和默认行为阻止 |

**回滚策略**:
- 所有修改集中在 `ClipItemList.vue`，可通过 git revert 快速回滚
- 各任务独立，可单独回滚某一任务而不影响其他

## 8. 后续可选优化
1. 图片预览添加缩放快捷键（Ctrl++/Ctrl+-）
2. 文本预览添加搜索高亮
3. 预览窗口支持拖拽移动位置
