感谢确认！让我更新计划并整理最终的实施方案。
---
📋 最终实施计划：剪贴板管理器功能优化
任务总览
| #   | 功能                                                  | 优先级 | 复杂度 |
| --- | ----------------------------------------------------- | ------ | ------ |
| 1   | 收藏记录保护（多选删除时跳过已收藏）                  | 高     | 中     |
| 2   | 删除确认弹窗优化（默认确认 + Enter快捷键）            | 中     | 低     |
| 2.1 | 收藏列表删除 = 取消收藏                               | 中     | 低     |
| 3   | 保留标记功能 + 可配置自动清理                         | 高     | 高     |
| 3.1 | Ctrl+Shift+Del 快速删除最近时间段记录                 | 中     | 中     |
| 4   | 搜索排序优化（Ctrl+Enter切换收藏优先）                | 中     | 中     |
| 5   | 多选操作优化（Shift+方向键、Del删除、Ctrl+Enter保留） | 中     | 中     |
| 6   | Tab页快捷键（Alt+Tab切换、Alt+1~9定位）               | 中     | 低     |
---
详细实施方案
任务 1 & 2 & 2.1: 删除功能增强
涉及文件：
- src/hooks/useClipOperate.js
- src/views/Main.vue
- src/cpns/ClipItemList.vue
实现要点：
// useClipOperate.js - 增强 remove 操作
} else if (id === 'remove') {
  const isInCollectTab = currentTab === 'collect'
  const confirmMsg = isInCollectTab ? '确认取消收藏此记录？' : '确认删除此记录？'
  
  ElMessageBox.confirm(confirmMsg, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    autofocus: true,  // 默认聚焦确认按钮
    closeOnPressEscape: true,
    closeOnClickModal: false
  }).then(() => {
    if (isInCollectTab) {
      // 收藏列表：仅取消收藏
      item.collect = undefined
      window.db.updateDataBaseLocal()
    } else {
      // 普通列表：删除记录
      window.remove(item)
    }
    emit('onDataRemove')
  }).catch(() => {})
}
多选删除（Main.vue）：
const handleMultiDeleteBtnClick = () => {
  const itemList = ClipItemListRef.value.selectItemList
  const isInCollectTab = activeTab.value === 'collect'
  
  // 过滤掉已收藏的（非收藏tab下）
  const toDelete = isInCollectTab 
    ? itemList 
    : itemList.filter(item => !item.collect)
  
  const skippedCount = itemList.length - toDelete.length
  
  ElMessageBox.confirm(
    `将${isInCollectTab ? '取消收藏' : '删除'} ${toDelete.length} 条记录${skippedCount > 0 ? `（${skippedCount} 条已收藏记录将被跳过）` : ''}`,
    '确认批量操作',
    { confirmButtonText: '确定', cancelButtonText: '取消', autofocus: true }
  ).then(() => {
    toDelete.forEach(item => {
      if (isInCollectTab) {
        item.collect = undefined
      } else {
        window.db.removeItemViaId(item.id)
      }
    })
    window.db.updateDataBaseLocal()
    ClipItemListRef.value.emptySelectItemList()
    isMultiple.value = false
    handleDataRemove()
    ElMessage.success(`已${isInCollectTab ? '取消收藏' : '删除'} ${toDelete.length} 条记录`)
  }).catch(() => {})
}
---
任务 3: 保留标记功能 + 自动清理
数据模型扩展：
// Clipboard item 新增字段
{
  id: "md5_hash",
  type: "text" | "file" | "image",
  data: "content",
  createTime: 1640995200000,
  updateTime: 1640995200000,
  collect: boolean,        // 已有：收藏
  retain: boolean,         // 新增：保留标记
  retainTime: number       // 新增：保留标记时间戳
}
配置扩展 (src/data/setting.json)：
{
  database.path: {},
  database.maxsize: 800,
  database.maxage: 14,
  database.retainEnabled: true,
  database.retainHours: 28,
  operation.shown: [copy, view, collect, un-collect, retain, un-retain, remove],
  operation.custom: [...]
}
操作定义 (src/data/operation.json)：
[
  { id: copy, title: 复制, icon: 📄 },
  { id: view, title: 查看全部, icon: 💬 },
  { id: open-folder, title: 打开文件夹, icon: 📁 },
  { id: collect, title: 收藏, icon: ⭐ },
  { id: un-collect, title: 移出收藏, icon: 📤 },
  { id: retain, title: 保留, icon: 📌 },
  { id: un-retain, title: 取消保留, icon: 📍 },
  { id: remove, title: 删除, icon: ❌ },
  { id: word-break, title: 分词, icon: 💣 },
  { id: save-file, title: 保存, icon: 💾 }
]
自动清理逻辑 (src/global/initPlugin.js)：
// DB.init() 中添加
init() {
  // ... 现有代码 ...
  
  const now = new Date().getTime()
  const deleteTime = now - setting.database.maxage * 24 * 60 * 60 * 1000
  
  // 处理保留标记过期
  if (setting.database.retainEnabled) {
    const retainExpireTime = now - setting.database.retainHours * 60 * 60 * 1000
    
    this.dataBase.data = this.dataBase.data.filter(item => {
      // 检查保留标记是否过期
      if (item.retain && item.retainTime && item.retainTime < retainExpireTime) {
        // 保留标记过期，移除标记
        item.retain = undefined
        item.retainTime = undefined
      }
      
      // 原有清理逻辑：保留收藏的、保留标记的、未过期的
      return item.updateTime > deleteTime || item.collect || item.retain
    })
  } else {
    // 保留标记功能关闭时，使用原有逻辑
    this.dataBase.data = this.dataBase.data.filter(
      item => item.updateTime > deleteTime || item.collect
    )
  }
  
  this.updateDataBaseLocal()
}
操作处理 (src/hooks/useClipOperate.js)：
} else if (id === 'retain') {
  item.retain = true
  item.retainTime = new Date().getTime()
  window.db.updateDataBaseLocal()
  ElMessage.success('已添加保留标记')
} else if (id === 'un-retain') {
  item.retain = undefined
  item.retainTime = undefined
  window.db.updateDataBaseLocal()
  ElMessage.success('已移除保留标记')
}
// filterOperate 中添加
} else if (id === 'retain') {
  return !item.retain  // 未保留时显示
} else if (id === 'un-retain') {
  return item.retain   // 已保留时显示
}
列表显示保留标记 (src/cpns/ClipItemList.vue)：
<div class="clip-time">
  <span v-if="item.retain" class="retain-mark" title="已保留">📌</span>
  <span v-if="item.collect" class="collect-mark" title="已收藏">⭐</span>
  <span class="relative-date" :title="new Date(item.updateTime).toLocaleString()">
    {{ dateFormat(item.updateTime) }}
  </span>
</div>
---
任务 3.1: Ctrl+Shift+Del 快速删除最近时间段
实现位置： src/views/Main.vue
// 快速删除时间选项
const quickDeleteOptions = [
  { label: '最近1小时', hours: 1 },
  { label: '最近3小时', hours: 3 },
  { label: '最近6小时', hours: 6 },
  { label: '最近12小时', hours: 12 },
  { label: '最近24小时', hours: 24 },
]
const handleQuickDelete = () => {
  ElMessageBox({
    title: '快速删除',
    message: h('div', null, [
      h('p', null, '选择要删除的时间范围（已收藏和已保留的记录将被跳过）：'),
      h('el-radio-group', {
        modelValue: selectedHours.value,
        'onUpdate:modelValue': (val) => { selectedHours.value = val }
      }, quickDeleteOptions.map(opt => 
        h('el-radio', { label: opt.hours }, opt.label)
      ))
    ]),
    showCancelButton: true,
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    const cutoffTime = new Date().getTime() - selectedHours.value * 60 * 60 * 1000
    const toDelete = list.value.filter(item => 
      item.updateTime > cutoffTime && !item.collect && !item.retain
    )
    
    if (toDelete.length === 0) {
      ElMessage.info('没有符合条件的记录')
      return
    }
    
    toDelete.forEach(item => window.db.removeItemViaId(item.id))
    window.db.updateDataBaseLocal()
    handleDataRemove()
    ElMessage.success(`已删除 ${toDelete.length} 条记录`)
  }).catch(() => {})
}
// 键盘监听中添加
if (ctrlKey && shiftKey && key === 'Delete') {
  handleQuickDelete()
  e.preventDefault()
}
---
任务 4: 搜索排序优化
实现位置： src/views/Main.vue
const prioritizeCollect = ref(false)  // 搜索时是否优先显示收藏
const updateShowList = (type, toTop = true) => {
  let result = list.value
    .filter(item =>
      type === 'collect' ? item.collect === true : type === 'all' ? item : item.type === type
    )
    .filter(item => (filterText.value ? item.type !== 'image' : item))
    .filter(item => textFilterCallBack(item))
  
  // 搜索时，根据设置决定是否收藏优先
  if (filterText.value && prioritizeCollect.value) {
    result = result.sort((a, b) => {
      // 收藏的排前面
      if (a.collect && !b.collect) return -1
      if (!a.collect && b.collect) return 1
      // 相同收藏状态按时间倒序
      return b.updateTime - a.updateTime
    })
  }
  
  showList.value = result.slice(0, GAP)
  toTop && window.toTop()
}
// 键盘监听中添加
if (ctrlKey && isEnter && isSearchPanelExpand.value) {
  prioritizeCollect.value = !prioritizeCollect.value
  updateShowList(activeTab.value)
  ElMessage.info(prioritizeCollect.value ? '收藏优先显示' : '按时间排序')
  e.preventDefault()
}
UI 提示 (src/cpns/ClipSearch.vue)：
<div class="clip-search">
  <input ... />
  <span v-show="prioritizeCollect" class="sort-indicator" title="收藏优先">⭐</span>
  <span v-show="filterText" @click="clear" class="clip-search-suffix">✖</span>
</div>
---
任务 5: 多选操作优化
实现位置： src/cpns/ClipItemList.vue
const keyDownCallBack = (e) => {
  const { key, ctrlKey, shiftKey } = e
  const isArrowUp = key === 'ArrowUp'
  const isArrowDown = key === 'ArrowDown'
  const isDelete = key === 'Delete'
  const isEnter = key === 'Enter'
  
  // Shift+上下键 快速多选
  if (shiftKey && (isArrowUp || isArrowDown)) {
    e.preventDefault()
    
    if (!props.isMultiple) {
      emit('toggleMultiSelect')
    }
    
    // 先选中当前项（如果未选中）
    const currentItem = props.showList[activeIndex.value]
    if (!selectItemList.value.includes(currentItem)) {
      selectItemList.value.push(currentItem)
    }
    
    // 移动到目标位置
    const targetIndex = isArrowUp
      ? Math.max(0, activeIndex.value - 1)
      : Math.min(props.showList.length - 1, activeIndex.value + 1)
    
    // 选中目标项
    const targetItem = props.showList[targetIndex]
    if (!selectItemList.value.includes(targetItem)) {
      selectItemList.value.push(targetItem)
    }
    
    activeIndex.value = targetIndex
    
    // 滚动到可见区域
    const selector = `.clip-item:nth-child(${targetIndex + 1})`
    document.querySelector(selector)?.scrollIntoView({ block: 'nearest' })
    return
  }
  
  // Delete 键 - 批量删除（多选模式下）
  if (isDelete && props.isMultiple && selectItemList.value.length > 0) {
    emit('onMultiDeleteExecute')
    e.preventDefault()
    return
  }
  
  // Ctrl+Enter - 批量切换保留标记（多选模式下）
  if (ctrlKey && isEnter && props.isMultiple && selectItemList.value.length > 0) {
    emit('onMultiRetainExecute')
    e.preventDefault()
    return
  }
  
  // ... 现有键盘处理 ...
}
Main.vue 中添加批量保留处理：
const handleMultiRetainBtnClick = () => {
  const itemList = ClipItemListRef.value.selectItemList
  const now = new Date().getTime()
  
  // 统计当前状态
  const retainedCount = itemList.filter(item => item.retain).length
  const isAddRetain = retainedCount < itemList.length / 2  // 少于一半已保留，则添加保留
  
  itemList.forEach(item => {
    if (isAddRetain) {
      item.retain = true
      item.retainTime = now
    } else {
      item.retain = undefined
      item.retainTime = undefined
    }
  })
  
  window.db.updateDataBaseLocal()
  ClipItemListRef.value.emptySelectItemList()
  isMultiple.value = false
  handleDataRemove()
  ElMessage.success(isAddRetain ? '已添加保留标记' : '已移除保留标记')
}
---
任务 6: Tab 页快捷键（使用 Alt）
实现位置： src/views/Main.vue
const keyDownCallBack = (e) => {
  const { key, altKey } = e
  const isTab = key === 'Tab'
  const isNumber = /^[0-9]$/.test(key)
  
  // Alt+Tab 切换 tab（向下循环）
  if (altKey && isTab) {
    e.preventDefault()
    const tabTypes = tabs.map(item => item.type)
    const index = tabTypes.indexOf(activeTab.value)
    const target = index === tabTypes.length - 1 ? tabTypes[0] : tabTypes[index + 1]
    toggleNav(target)
    updateShowList(target)
    return
  }
  
  // Alt+1~9 快速切换到对应 tab
  // Alt+0 切换到最后一个 tab（收藏）
  if (altKey && isNumber) {
    e.preventDefault()
    const tabIndex = key === '0' ? tabs.length - 1 : parseInt(key) - 1
    if (tabIndex >= 0 && tabIndex < tabs.length) {
      const target = tabs[tabIndex].type
      toggleNav(target)
      updateShowList(target)
    }
    return
  }
  
  // 保留原有的 Tab 键切换逻辑
  if (isTab && !altKey) {
    // ... 现有代码 ...
  }
}
---
📁 文件修改清单
| 文件                          | 修改类型 | 内容                                        |
| ----------------------------- | -------- | ------------------------------------------- |
| src/data/setting.json         | 修改     | 添加 retainEnabled, retainHours 配置        |
| src/data/operation.json       | 修改     | 添加 retain, un-retain 操作                 |
| src/global/initPlugin.js      | 修改     | 添加保留标记过期清理逻辑                    |
| src/global/readSetting.js     | 修改     | 处理新配置项的默认值                        |
| src/hooks/useClipOperate.js   | 修改     | 添加 retain/un-retain 处理，优化 remove     |
| src/views/Main.vue            | 修改     | 添加批量操作、快速删除、搜索排序、Alt快捷键 |
| src/views/Setting.vue         | 修改     | 添加保留标记设置项                          |
| src/cpns/ClipItemList.vue     | 修改     | 添加 Shift+方向键、保留标记显示、新事件     |
| src/cpns/ClipSearch.vue       | 修改     | 添加排序模式指示器                          |
| src/style/cpns/clip-item.less | 修改     | 添加保留标记样式                            |
---
🚀 实施顺序
阶段 1: 数据模型与核心逻辑 (任务 3)
├── 1.1 修改 setting.json 添加配置
├── 1.2 修改 operation.json 添加操作
├── 1.3 修改 initPlugin.js 添加清理逻辑
├── 1.4 修改 useClipOperate.js 添加操作处理
└── 1.5 修改 Setting.vue 添加设置项
阶段 2: 删除功能增强 (任务 1, 2, 2.1, 3.1)
├── 2.1 修改 useClipOperate.js 优化删除确认
├── 2.2 修改 Main.vue 添加批量删除
├── 2.3 修改 Main.vue 添加快速删除 (Ctrl+Shift+Del)
└── 2.4 修改 ClipItemList.vue 添加 Delete 键处理
阶段 3: UI 显示与多选优化 (任务 5)
├── 3.1 修改 ClipItemList.vue 显示保留标记
├── 3.2 修改 ClipItemList.vue 添加 Shift+方向键
├── 3.3 修改 Main.vue 添加批量保留操作
└── 3.4 添加相关样式
阶段 4: 搜索与导航优化 (任务 4, 6)
├── 4.1 修改 Main.vue 添加搜索排序切换
├── 4.2 修改 ClipSearch.vue 添加排序指示器
└── 4.3 修改 Main.vue 添加 Alt 快捷键
---
⌨️ 最终快捷键汇总
| 快捷键            | 功能                       | 备注     |
| ----------------- | -------------------------- | -------- |
| Tab               | 循环切换 Tab 页            | 保留原有 |
| Alt+Tab           | 循环切换 Tab 页            | 新增     |
| Alt+1~9           | 快速切换到第 N 个 Tab      | 新增     |
| Alt+0             | 切换到最后一个 Tab（收藏） | 新增     |
| Ctrl+Enter        | 搜索时：切换收藏优先排序   | 新增     |
| Ctrl+Enter        | 多选时：批量切换保留标记   | 新增     |
| Shift+↑/↓         | 快速多选                   | 新增     |
| Delete            | 多选时：批量删除           | 新增     |
| Ctrl+Shift+Delete | 快速删除最近时间段记录     | 新增     |
| Enter             | 删除确认弹窗中：确认删除   | 新增     |
---
这个计划是否可以开始实施？如果有任何需要调整的地方，请告诉我。
▣  Planner-Sisyphus · claude-opus-4-5 · 1m 21s
[BACKGROUND TASK COMPLETED] Task "Find delete functionality" finished in 7m 29s. Use background_output with task_id="bg_a2b19eda" to get results.
计划已经完整，可以开始实施了。让我获取最后一个后台任务的结果，确保没有遗漏任何重要信息：
⚙ background_output [task_id=bg_a2b19eda]
很好，这个结果确认了我的分析：
1. 当前删除操作没有确认弹窗 - 直接删除
2. 没有 Delete 键的快捷键处理 - 需要新增
3. 收藏保护仅在自动清理时生效 - 手动删除可以删除收藏，需要优化
---
✅ 计划确认完毕
计划已经完整且经过验证。以下是最终的实施摘要：
📋 待实施功能清单
| 序号 | 功能                    | 关键修改点                                       |
| ---- | ----------------------- | ------------------------------------------------ |
| 1    | 收藏记录保护            | useClipOperate.js + Main.vue 批量删除逻辑        |
| 2    | 删除确认弹窗优化        | useClipOperate.js 添加 ElMessageBox.confirm      |
| 2.1  | 收藏列表删除=取消收藏   | useClipOperate.js 判断当前 tab                   |
| 3    | 保留标记功能            | 数据模型 + initPlugin.js + operation.json        |
| 3.1  | Ctrl+Shift+Del 快速删除 | Main.vue 添加快速删除对话框                      |
| 4    | 搜索收藏优先切换        | Main.vue 添加排序逻辑 + Ctrl+Enter               |
| 5    | 多选操作优化            | ClipItemList.vue Shift+方向键 + Del + Ctrl+Enter |
| 6    | Tab 页 Alt 快捷键       | Main.vue Alt+Tab + Alt+数字                      |
📁 涉及文件 (8个)
1. src/data/setting.json
2. src/data/operation.json
3. src/global/initPlugin.js
4. src/hooks/useClipOperate.js
5. src/views/Main.vue
6. src/views/Setting.vue
7. src/cpns/ClipItemList.vue
8. src/cpns/ClipSearch.vue
---
计划已就绪，是否可以开始实施？ 如需调整优先级或有其他问题，请告知。