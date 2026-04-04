# Clipboard 问题判断

## 背景

今天的重构后，`Clipboard` 列表出现了以下现象：

- 元素移动不符合预期
- 自动半页滚动异常
- 删除元素后列表错乱
- 某些元素无法按预期步入
- 怀疑元素筛选和展示到数据的映射出现问题

结合当前代码，问题并不是单点缺陷，而是列表展示、索引控制、虚拟滚动、懒加载、删除恢复这几套逻辑同时改动后相互冲突。

## 结论

最可疑的回归点是提交 `5c5bd56`，它在 `src/cpns/ClipItemList.vue` 和 `src/views/Main.vue` 中同时重构了以下内容：

- 虚拟滚动定位逻辑
- 列表导航与长按自动滚动
- 半页滚动逻辑
- 删除后高亮恢复逻辑
- tab 状态和列表位置恢复逻辑

当前问题的核心不是某个函数单独写错，而是：

1. `activeIndex` 没有唯一 owner
2. 展示列表和真实数据列表不是同一个概念，但多处逻辑混用
3. 虚拟滚动下“滚到目标项”的逻辑没有和渲染时机对齐
4. 删除后的索引恢复被父子组件同时接管

## 详细判断

### 1. 上下键导航被双重处理

`src/cpns/ClipItemList.vue` 中同时存在两套上下键推进逻辑：

- `registerFeature("list-nav-up" / "list-nav-down")`
- `unifiedKeyHandler -> startAutoScroll`

其中：

- `list-nav-up/down` 会立即调用 `setKeyboardActiveIndex`
- `unifiedKeyHandler` 在上下键按下时也会触发 `startAutoScroll`
- `startAutoScroll` 内部同样继续调用 `setKeyboardActiveIndex`

这会造成：

- 单次按键可能出现两次位移
- 长按时 hotkey 逻辑和自动滚动逻辑同时推进
- 用户感知为“移动不对”“像跳项”“无法一步步进入”

### 2. 自动半页滚动的根因是滚动兜底策略本身

`scrollActiveNodeIntoView` 在目标 DOM 尚未被 `DynamicScroller` 渲染出来时，会走降级滚动逻辑。

这个降级逻辑不是“确保滚到目标项”，而是：

- 估算一个目标滚动位置
- 再把单次滚动量限制在当前容器的半屏高度以内

这会导致：

- 目标项不一定真的进入视口
- 第一次滚动后函数就结束
- 视觉上表现为“只滚半页”“某些元素始终进不来”

在虚拟列表场景下，这种限制尤其危险，因为目标项最开始本来就常常不在 DOM 里。

### 3. 删除后的索引恢复存在父子组件竞争

删除相关逻辑目前至少分布在两处：

- `src/views/Main.vue`
- `src/cpns/ClipItemList.vue`

父组件会在删除后：

- `handleDataRemove()`
- `setActiveIndex(...)`
- `adjustActiveIndexAfterDelete(...)`

子组件又会在 `watch(props.showList)` 中：

- 恢复 `pendingHighlightedItemId`
- 恢复 `pendingActiveIndexAfterDelete`
- 再根据新列表长度校正 `activeIndex`

这些逻辑叠加了：

- 同步赋值
- `nextTick`
- `setTimeout(0)`
- watcher 响应

结果就是删除后高亮位置没有单一真相，谁最后执行谁生效，最终表现为：

- 删除后焦点错位
- 高亮跳回 0
- 高亮落在意外项上
- 多选删除后恢复错乱

### 4. 收藏页强制删除存在直接代码错误

`src/views/Main.vue` 中，收藏页的强制删除分支调用了：

- `adjustActiveIndexAfterDelete(currentActiveIndex)`

但该分支中并没有定义 `currentActiveIndex`。

这意味着：

- 该路径存在运行时错误风险
- 收藏页强删后的索引恢复不可信

这个问题不是策略问题，是明确的实现错误。

### 5. 展示列表和真实数据列表的语义已经分裂

当前界面中至少存在几种列表概念：

- `window.db.dataBase.data`
- `showList`
- `collectBlockList`
- `displayList`
- `currentShowList`

在普通 tab 且使用 `*` 搜索时，顶部会额外插入一段收藏命中块，然后再拼接普通列表。

这意味着：

- UI 上的第 `n` 项，并不一定对应主列表中的第 `n` 项
- 某些逻辑按 `showList` 理解索引
- 某些逻辑按 `currentShowList` 理解索引
- 删除恢复、懒加载、键盘移动如果不统一基于同一份展示数组，就会产生错位

这正是“元素筛选和展示到数据有问题”的主要来源之一。

### 6. 点击后自动跳到下一项，会进一步放大错位感

当前点击项后会自动推进到下一项：

- 左键复制后推进
- 右键打开抽屉后推进

如果此时 `activeIndex` 已经因为双重导航或删除恢复发生偏移，点击后的自动推进会进一步加重“跳项”和“错乱”的体感。

## 归纳

当前问题可以归并为四类：

1. 导航推进源太多，导致重复推进
2. 展示索引与真实数据映射不统一
3. 虚拟滚动定位策略不可靠
4. 删除后的状态恢复没有单一责任边界

因此，这次问题应视为一次列表状态管理回归，而不是单纯的“滚动函数写错”。

