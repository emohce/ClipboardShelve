<template>
  <div class="main">
    <ClipFloatBtn :icon="'🧭'" @onBtnClick="handleClearBtnClick"></ClipFloatBtn>
    <ClipFullData
      :isShow="fullDataShow"
      :fullData="fullData"
      @onDataRemove="handleDataRemove"
      @onOverlayClick="toggleFullData({ type: 'text', data: '' })"
    ></ClipFullData>
    <ClipSwitch ref="ClipSwitchRef">
      <template #SidePanel>
        <div class="clip-switch-btn-list" v-show="!isSearchPanelExpand">
          <el-tooltip content="已选条数" placement="bottom" :show-after="150">
            <span class="clip-switch-btn clip-select-count" v-show="isMultiple">
              {{ selectCount }}
            </span>
          </el-tooltip>
          <el-tooltip content="复制所选" placement="bottom" :show-after="150">
            <span class="clip-switch-btn" v-show="isMultiple" @click="handleMultiCopyBtnClick(false)">
              📄 复制
            </span>
          </el-tooltip>
          <el-tooltip content="复制并粘贴所选" placement="bottom" :show-after="150">
            <span class="clip-switch-btn" v-show="isMultiple" @click="handleMultiCopyBtnClick(true)">
              📑 粘贴
            </span>
          </el-tooltip>
          <el-tooltip :content="isMultiple ? '退出多选 (Esc)' : '开启多选 (空格)'" placement="bottom" :show-after="150">
            <span class="clip-switch-btn" @click="isMultiple = !isMultiple">{{
              isMultiple ? '❌ 退出多选' : '👆'
            }}</span>
          </el-tooltip>
          <el-tooltip content="设置" placement="bottom" :show-after="150">
            <span class="clip-switch-btn" v-show="!isMultiple" @click="emit('showSetting')">💡</span>
          </el-tooltip>
          <el-tooltip content="搜索 (点击或输入开始)" placement="bottom" :show-after="150">
            <span
              class="clip-switch-btn clip-search-btn"
              v-show="!isMultiple"
              @click="handleSearchBtnClick"
            >
              🔍
            </span>
          </el-tooltip>
        </div>
        <ClipSearch
          v-show="isSearchPanelExpand"
          @onPanelHide="isSearchPanelExpand = false"
          @onEmpty="handleSearchEmpty"
          v-model="filterText"
          :itemCount="list.length"
        ></ClipSearch>
      </template>
    </ClipSwitch>
    <div class="clip-break"></div>
    <div class="clip-empty-status" v-if="showList.length === 0">📪 无记录</div>
    <ClipItemList
      ref="ClipItemListRef"
      :showList="showList"
      :fullData="fullData"
      :isMultiple="isMultiple"
      :currentActiveTab="activeTab"
      :isSearchPanelExpand="isSearchPanelExpand"
      @onMultiCopyExecute="handleMultiCopyBtnClick"
      @toggleMultiSelect="handleToggleMultiSelect"
      @onDataChange="toggleFullData"
      @onDataRemove="handleDataRemove"
      @onItemDelete="handleItemDelete"
    >
    </ClipItemList>

    <Transition name="clear-panel">
      <div class="clear-panel" v-if="isClearDialogVisible" ref="clearDialogBodyRef">
        <div class="clear-panel-header">
          <div>
            <h3>清除记录</h3>
            <span class="clear-panel-sub">仅清除「{{ activeTabLabel }}」标签页内的记录。</span>
          </div>
          <button class="clear-panel-close" @click="closeClearDialog">✕</button>
        </div>
        <div class="clear-panel-body">
          <p class="clear-panel-tip" v-if="isClearingCollectTab">
            收藏内容将通过“取消收藏”完成清除。
          </p>
          <p class="clear-panel-tip" v-else>
            操作与多选删除一致，收藏内容不会受影响。
          </p>
          <el-radio-group v-model="clearRange" class="clear-range-group" size="small">
            <el-radio-button
              v-for="option in CLEAR_RANGE_OPTIONS"
              :key="option.value"
              :label="option.value"
              :data-range="option.value"
            >
              {{ option.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="clear-panel-footer">
          <el-button @click="closeClearDialog">取消</el-button>
          <el-button type="primary" :loading="isClearing" @click="handleClearConfirm">清除</el-button>
        </div>
      </div>
    </Transition>
    <div
      class="clear-panel-overlay"
      v-show="isClearDialogVisible"
      @click="closeClearDialog"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElButton, ElRadioGroup, ElRadioButton, ElTooltip } from 'element-plus'
import ClipItemList from '../cpns/ClipItemList.vue'
import ClipFullData from '../cpns/ClipFullData.vue'
import ClipSearch from '../cpns/ClipSearch.vue'
import ClipSwitch from '../cpns/ClipSwitch.vue'
import ClipFloatBtn from '../cpns/ClipFloatBtn.vue'
import notify from '../data/notify.json'

const CLEAR_RANGE_OPTIONS = [
  { label: '1 小时内', value: '1h' },
  { label: '5 小时内', value: '5h' },
  { label: '8 小时内', value: '8h' },
  { label: '24 小时内', value: '24h' },
  { label: '全部', value: 'all' }
]

const RANGE_DURATION_MAP = {
  '1h': 60 * 60 * 1000,
  '5h': 5 * 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  all: null
}

const notifyShown = ref(false) // 将在onMounted时根据此值判断是否显示通知
const storageNotify = utools.dbStorage.getItem('notify')
notifyShown.value = storageNotify ? storageNotify.version < notify.version : true
const DEBUG_KEYS = false

const isMultiple = ref(false)

const isSearchPanelExpand = ref(false)

const handleSearchEmpty = () => {
  filterText.value = ''
  isSearchPanelExpand.value = false
  window.focus()
}

const isClearDialogVisible = ref(false)
const clearRange = ref('1h')
const isClearing = ref(false)
const clearDialogBodyRef = ref(null)

const handleSearchBtnClick = () => {
  // 展开搜索框
  isSearchPanelExpand.value = true
  nextTick(() => window.focus())
}

const ClipItemListRef = ref(null)
const selectCount = ref(0)
const handleToggleMultiSelect = (val = true) => {
  isMultiple.value = Boolean(val)
}
const handleMultiCopyBtnClick = (isPaste) => {
  const itemList = ClipItemListRef.value.selectItemList
  // 如果包含了图片/文件 则转为文件合并 否则仅合并文本
  const isMergeFile =
    itemList.filter((item) => item.type === 'image' || item.type === 'file').length !== 0
  if (isMergeFile) {
    const filePathArray = []
    itemList.map((item) => {
      const { type } = item
      if (type === 'text') {
        const textFile = window.createFile(item)
        filePathArray.push({
          path: textFile
        })
      } else if (type === 'image') {
        const imageFile = window.createFile(item)
        filePathArray.push({
          path: imageFile
        })
      } else {
        // file
        const files = JSON.parse(item.data)
        filePathArray.push(...files)
      }
    })
    window.copy({
      type: 'file',
      data: JSON.stringify(filePathArray.reverse())
    })
  } else {
    const eol =
      (window?.exports && window.exports.os && window.exports.os.EOL) ||
      (navigator.userAgent.includes('Windows') ? '\r\n' : '\n')
    const result = itemList
      .map((item) => item.data)
      .reverse()
      .join(eol)
    window.copy({
      type: 'text',
      data: result
    })
  }
  ElMessage({
    message: '复制成功',
    type: 'success'
  })
  isPaste && window.paste()
  ClipItemListRef.value.emptySelectItemList()
  isMultiple.value = false
}

const GAP = 15 // 懒加载 每次添加的条数
const offset = ref(0) // 懒加载 偏移量
const filterText = ref('') // 搜索框绑定值
const list = ref([]) // 全部数据
const showList = ref([]) // 展示的数据

const textFilterCallBack = (item) => {
  // filterText & item
  if (filterText.value.trim()) {
    if (filterText.value.trim().indexOf(' ') !== -1) {
      // 有过滤词 有空格
      const hitArray = []
      for (const f of filterText.value.trim().split(' ')) {
        hitArray.push(item.data.toLowerCase().indexOf(f.toLowerCase()) !== -1)
      }
      // 只返回全命中的 只要存在 false即不返回
      return hitArray.indexOf(false) === -1
    } else {
      // 有过滤词 无空格 不区分大小写检索
      return item.data.toLowerCase().indexOf(filterText.value.trim().toLowerCase()) !== -1
    }
  } else {
    // 无过滤词 返回全部
    return true
  }
}

const getClearDialogFocusables = () => {
  const container = clearDialogBodyRef.value
  if (!container) return []
  const rangeButtons = Array.from(container.querySelectorAll('.clear-range-group button'))
  const footerButtons = Array.from(container.querySelectorAll('.clear-panel-footer button'))
  return [...rangeButtons, ...footerButtons].filter((el) => !el.disabled)
}

const handleClearDialogHotkeys = (e) => {
  const { key, ctrlKey, shiftKey } = e
  if (key === 'Escape') {
    e.preventDefault()
    closeClearDialog()
    return true
  }
  if (ctrlKey && key === 'Enter') {
    e.preventDefault()
    handleClearConfirm()
    return true
  }
  if (/^[1-5]$/.test(key)) {
    const index = parseInt(key, 10) - 1
    const targetOption = CLEAR_RANGE_OPTIONS[index]
    if (targetOption) {
      clearRange.value = targetOption.value
      focusRangeButton(targetOption.value)
      e.preventDefault()
      return true
    }
  }
  if (key === 'Tab') {
    const focusable = getClearDialogFocusables()
    if (!focusable.length) return false
    const active = document.activeElement
    let idx = focusable.indexOf(active)
    if (idx === -1) idx = 0
    idx = (idx + (shiftKey ? -1 : 1) + focusable.length) % focusable.length
    focusable[idx].focus()
    e.preventDefault()
    return true
  }
  return false
}

const updateShowList = (type, toTop = true) => {
  // 更新显示列表
  // 切换标签页时重置offset
  offset.value = 0

  let filteredList = list.value
  if (type === 'collect') {
    // 收藏标签页：从收藏列表中获取项目
    filteredList = window.db.getCollects()
  } else if (type === 'all') {
    // 全部标签页：显示所有数据（不受收藏影响）
    filteredList = list.value
  } else {
    // 其他类型标签页：按类型过滤
    filteredList = list.value.filter((item) => item.type === type)
  }

  showList.value = filteredList
    .filter((item) => (filterText.value ? item.type !== 'image' : item)) // 有过滤词 排除掉图片 DataURL
    .filter((item) => textFilterCallBack(item))
    .slice(0, GAP) // 重新切分懒加载列表
  toTop && window.toTop()
}

const getItemsByTab = (tabType) => {
  if (tabType === 'collect') {
    return window.db.getCollects()
  }
  const data = window.db.dataBase.data || []
  if (tabType === 'all') return [...data]
  return data.filter((item) => item.type === tabType)
}

const filterItemsByRange = (items, rangeValue, options = {}) => {
  const duration = RANGE_DURATION_MAP[rangeValue]
  if (!duration) return [...items]
  const { preferCollectTime = false } = options
  const cutoff = Date.now() - duration
  return items.filter((item) => {
    const time = preferCollectTime
      ? item.collectTime || item.updateTime || item.createTime || 0
      : item.updateTime || item.collectTime || item.createTime || 0
    return time >= cutoff
  })
}

const clearRegularTabItems = (tabType, rangeValue) => {
  const candidates = filterItemsByRange(getItemsByTab(tabType), rangeValue)
  let removed = 0
  let skippedLocked = 0
  candidates.forEach((item) => {
    const ok = window.remove(item)
    if (ok) removed++
    else if (item.locked) skippedLocked++
  })
  if (removed) {
    handleDataRemove()
    adjustActiveIndexAfterDelete(0)
  }
  return { removed, skippedLocked }
}

const clearCollectTabItems = (rangeValue) => {
  const candidates = filterItemsByRange(window.db.getCollects(), rangeValue, {
    preferCollectTime: true
  })
  let removed = 0
  let skippedLocked = 0
  candidates.forEach((item) => {
    if (item.locked) {
      skippedLocked++
      return
    }
    if (window.db.removeCollect(item.id, false) !== false) removed++
  })
  if (removed) {
    handleDataRemove()
  }
  return { removed, skippedLocked }
}

const focusRangeButton = (rangeValue) => {
  nextTick(() => {
    const container = clearDialogBodyRef.value
    const target = container?.querySelector(`[data-range="${rangeValue}"]`)
    target?.focus()
  })
}

const closeClearDialog = () => {
  isClearDialogVisible.value = false
  clearRange.value = '1h'
}

const handleClearBtnClick = () => {
  clearRange.value = '1h'
  isClearDialogVisible.value = true
  focusRangeButton(clearRange.value)
}

const handleClearConfirm = () => {
  if (isClearing.value) return
  isClearing.value = true
  const tabType = activeTab.value
  try {
    const { removed: removedCount, skippedLocked } =
      tabType === 'collect'
        ? clearCollectTabItems(clearRange.value)
        : clearRegularTabItems(tabType, clearRange.value)

    if (removedCount > 0) {
      ElMessage({
        type: 'success',
        message: skippedLocked > 0 ? `已清除 ${removedCount} 条记录，跳过锁定 ${skippedLocked} 条` : `已清除 ${removedCount} 条记录`
      })
      closeClearDialog()
    } else {
      ElMessage({
        type: 'info',
        message: skippedLocked > 0 ? `没有符合条件的记录（跳过锁定 ${skippedLocked} 条）` : '没有符合条件的记录'
      })
    }
  } catch (error) {
    console.error('[handleClearConfirm] 清除失败:', error)
    ElMessage({
      type: 'error',
      message: '清除失败，请稍后再试'
    })
  } finally {
    isClearing.value = false
  }
}

const fullData = ref({ type: 'text', data: '' })
const fullDataShow = ref(false)
const toggleFullData = (item) => {
  // 是否显示全部数据 (查看全部)
  fullData.value = item
  fullDataShow.value = !fullDataShow.value
}

const ClipSwitchRef = ref()

const handleDataRemove = () => {
  // 此函数须在挂载后执行
  list.value = window.db.dataBase.data
  // 重置offset以便重新加载
  offset.value = 0
  updateShowList(ClipSwitchRef.value.activeTab, false)
}

const getActiveIndex = () => {
  const ai = ClipItemListRef.value?.activeIndex
  if (typeof ai === 'number') return ai
  return ai?.value ?? 0
}

const setActiveIndex = (val) => {
  const ai = ClipItemListRef.value?.activeIndex
  if (typeof ai === 'number') {
    ClipItemListRef.value.activeIndex = val
  } else if (ai && typeof ai === 'object' && 'value' in ai) {
    ai.value = val
  }
}

const adjustActiveIndexAfterDelete = (baseIndex) => {
  nextTick(() => {
    if (!ClipItemListRef.value) return
    const newListLength = showList.value.length
    if (newListLength === 0) return
    const normalizedIndex = Math.min(
      Math.max(typeof baseIndex === 'number' ? baseIndex : getActiveIndex(), 0),
      newListLength - 1
    )
    setActiveIndex(normalizedIndex)
  })
}

const handleItemDelete = (item, metadata = {}) => {
  const { anchorIndex, isBatch = false, isLast = true, force = false } = metadata
  // 处理删除操作，复用 useClipOperate 的逻辑
  const activeTabValue = typeof ClipSwitchRef.value?.activeTab === 'object'
    ? ClipSwitchRef.value.activeTab.value
    : ClipSwitchRef.value?.activeTab || activeTab.value
  const isCollected = window.db.isCollected(item.id)

  if (activeTabValue === 'collect') {
    // 在"收藏"标签页：不允许删除，只能取消收藏
    ElMessage({
      message: '收藏内容不允许删除，请先取消收藏',
      type: 'warning'
    })
    return
  } else if (isCollected) {
    // 在其他标签页删除已收藏项目：不允许删除（收藏数据单独存储）
    ElMessage({
      message: '已收藏项目不允许删除，请先取消收藏',
      type: 'warning'
    })
    return
  } else {
    // 在其他标签页删除未收藏项目：完全删除
    // 记录删除前的高亮索引，用于删除后调整位置
    const currentActiveIndex =
      typeof anchorIndex === 'number' ? anchorIndex : getActiveIndex()
    const shouldAdjustAfterDelete = !isBatch || isLast

    window.remove(item, { force })
    handleDataRemove()

    // 删除后调整高亮位置：优先移动到下一个，如果没有则移动到上一个
    if (shouldAdjustAfterDelete) {
      adjustActiveIndexAfterDelete(currentActiveIndex)
    }
  }
}

const emit = defineEmits(['showSetting'])

const activeTab = ref('all')
const activeTabLabel = computed(() => {
  const tabs = ClipSwitchRef.value?.tabs || []
  return tabs.find((tab) => tab.type === activeTab.value)?.name || '全部'
})
const isClearingCollectTab = computed(() => activeTab.value === 'collect')

onMounted(() => {
  utools.onPluginEnter(() => {
    window.focus()
    document.activeElement?.blur?.()
  })
  // 获取挂载的导航组件 Ref
  const toggleNav = ClipSwitchRef.value.toggleNav
  const tabs = ClipSwitchRef.value.tabs

  watch(
    () => {
      const switchRef = ClipSwitchRef.value
      if (!switchRef || !switchRef.activeTab) return 'all'
      // activeTab 是一个 ref，需要获取其 .value
      return switchRef.activeTab.value || switchRef.activeTab
    },
    (newVal) => {
      activeTab.value = newVal
      updateShowList(newVal)
    },
    { immediate: true }
  )

  // 多选已选择的条数
  selectCount.value = computed(() => ClipItemListRef.value?.selectItemList?.length)

  // 初始化数据
  list.value = window.db.dataBase.data
  showList.value = list.value.slice(0, GAP) // 最初展示 10条
  updateShowList(activeTab.value)

  // 定期检查更新
  if (window.listener.listening) {
    // 监听器开启时
    window.listener.on('change', () => {
      list.value = window.db.dataBase.data
      updateShowList(activeTab.value)
    })
  } else {
    // 监听器启动失败时
    let prev = {}
    setInterval(() => {
      const now = window.db.dataBase.data[0]
      if (prev?.id === now?.id) {
      } else {
        // 有更新
        list.value = window.db.dataBase.data
        updateShowList(activeTab.value)
        prev = now
      }
    }, 800)
  }

  // 接收来自外部的触发视图更新事件
  // 进程虽然没有启动 但是可以接收emit
  window.listener.on('view-change', () => {
    // 检查到change事件 更新展示数据
    list.value = window.db.dataBase.data
    updateShowList(activeTab.value)
  })

  // 监听搜索框
  watch(filterText, (val) => updateShowList(activeTab.value))

  // 展示通知
  if (notifyShown.value) {
    ElMessageBox.alert(notify.content, notify.title, {
      confirmButtonText: '确定',
      dangerouslyUseHTMLString: true,
      callback: () => {
        utools.dbStorage.setItem('notify', {
          title: notify.title,
          content: notify.content,
          version: notify.version
        })
      }
    })
  }

  // 列表懒加载
  const scrollCallBack = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target.scrollingElement
    if (scrollTop + clientHeight + 5 >= scrollHeight) {
      offset.value += GAP
      let addition = []
      if (activeTab.value === 'collect') {
        // 收藏标签页：从收藏列表中获取
        const collectItems = window.db.getCollects()
        addition = collectItems.filter((item) => textFilterCallBack(item))
      } else if (activeTab.value !== 'all') {
        // 其他类型标签页：按类型过滤
        addition = list.value
          .filter((item) => item.type === activeTab.value)
          .filter((item) => textFilterCallBack(item))
      } else {
        // 全部标签页：显示所有数据
        addition = list.value.filter((item) => textFilterCallBack(item))
      }
      addition = addition.slice(offset.value, offset.value + GAP)
      if (addition.length) {
        showList.value.push(...addition)
      }
    }
  }

  // 监听键盘事件
  const keyDownCallBack = (e) => {
    const { key, ctrlKey, metaKey, altKey, shiftKey } = e
    if (DEBUG_KEYS) {
      console.log('[Main.keyDown] 按键:', key, 'ctrl:', ctrlKey, 'meta:', metaKey, 'alt:', altKey, 'shift:', shiftKey)
    }

    if (isClearDialogVisible.value) {
      handleClearDialogHotkeys(e)
      return
    }
    const isTab = key === 'Tab'
    const isSearch = ctrlKey && (key === 'F' || key === 'f')
    const isExit = key === 'Escape'
    const isAltNumber = altKey && /^[1-9]$/.test(key)
    const isCtrlDelete = ctrlKey && key === 'Delete'
    const isArrow = key === 'ArrowDown' || key === 'ArrowUp'
    const isEnter = key === 'Enter'
    const isAlt = altKey
    const isSpace = key === ' '
    if (e.repeat && (isTab || isCtrlDelete || isAltNumber)) {
      return
    }
    if (isTab) {
      e.preventDefault()
      const tabTypes = tabs.map((item) => item.type)
      const index = tabTypes.indexOf(activeTab.value)
      const target = shiftKey
        ? index <= 0
          ? tabTypes[tabTypes.length - 1]
          : tabTypes[index - 1]
        : index === tabTypes.length - 1
          ? tabTypes[0]
          : tabTypes[index + 1]
      toggleNav(target)
      updateShowList(target)
    } else if (isSearch) {
      window.focus()
    } else if (isCtrlDelete) {
      e.preventDefault()
      e.stopPropagation()
      handleClearBtnClick()
    } else if (isAltNumber) {
      const tabTypes = tabs.map((item) => item.type)
      const targetIndex = Math.min(parseInt(key, 10) - 1, tabTypes.length - 1)
      const target = tabTypes[targetIndex]
      if (target) {
        e.preventDefault()
        e.stopPropagation()
        toggleNav(target)
        updateShowList(target)
      }
    } else if (isExit) {
      if (filterText.value) {
        // 有筛选词 先清空筛选词
        filterText.value = ''
        window.focus()
        e.stopPropagation()
      } else if (isSearchPanelExpand.value) {
        // 移除焦点 隐藏搜索框
        window.focus(true)
        e.stopPropagation()
      } else if (isMultiple.value) {
        // 退出多选状态
        isMultiple.value = !isMultiple.value
        e.stopPropagation()
      } else {
        // 无上述情况 执行默认: 隐藏uTools主窗口
      }
    } else if (isArrow || isEnter) {
      e.preventDefault()
    } else if (ctrlKey || metaKey || isAlt) {
      // Ctrl: utools模拟执行粘贴时触发
      // Alt:
    } else if (isSpace) {
      // 空格向下多选
    } else if (key === 'Delete' || key === 'Backspace') {
      // 让 ClipItemList 的快捷键处理删除，避免强制聚焦搜索框
      return
    } else {
      const isPlainTextInput =
        key.length === 1 && !ctrlKey && !metaKey && !altKey && key !== ' '
      if (isPlainTextInput) {
        // 普通文字输入自动聚焦搜索框
        window.focus()
      }
    }
  }

  document.addEventListener('scroll', scrollCallBack)
  document.addEventListener('keydown', keyDownCallBack)

  onUnmounted(() => {
    document.removeEventListener('scroll', scrollCallBack)
    document.removeEventListener('keydown', keyDownCallBack)
  })
})
</script>

<style lang="less" scoped>
@import '../style';
.clip-break {
  height: 60px;
}
.clip-empty-status {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 50px;
}

:deep(.el-overlay) {
  background-color: rgba(16, 20, 37, 0.55);
}

:deep(.el-dialog) {
  border-radius: 16px;
  padding: 0 8px 12px;
  background: #fff;
  box-shadow:
    0 30px 80px rgba(25, 34, 68, 0.18),
    0 10px 30px rgba(25, 34, 68, 0.12);
}

:deep(.el-dialog__header) {
  text-align: center;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.clear-panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(22, 27, 45, 0.45);
  backdrop-filter: blur(2px);
  z-index: 180;
}

.clear-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  background: #fff;
  box-shadow: -12px 0 28px rgba(15, 23, 42, 0.18);
  z-index: 190;
  display: flex;
  flex-direction: column;
  padding: 22px 20px 18px;
  border-top-left-radius: 16px;
  border-bottom-left-radius: 16px;
}

.clear-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #2b2f3a;
  }
  .clear-panel-sub {
    display: block;
    margin-top: 2px;
    font-size: 13px;
    color: #7d8597;
  }
}

.clear-panel-close {
  border: none;
  background: #f2f4ff;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  color: #5c6c94;
}

.clear-panel-body {
  margin-top: 18px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  .clear-panel-tip {
    margin-bottom: 12px;
    color: #9094a6;
    font-size: 13px;
    line-height: 1.5;
  }
}

.clear-range-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(120px, 1fr));
  gap: 10px;
  :deep(.el-radio-button__inner) {
    width: 80px;
    text-align: center;
    border: none;
    border-radius: 10px !important;
    background: #f4f6fb;
    color: #5a5f73;
    box-shadow: inset 0 0 0 1px transparent;
    transition: all 0.2s ease;
    &:hover {
      background: #eef2ff;
      color: #4c63d9;
    }
  }
  :deep(.is-active .el-radio-button__inner) {
    background: #5c7cfa;
    color: #fff;
    box-shadow: 0 8px 16px rgba(92, 124, 250, 0.35);
  }
}

.clear-panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.clear-panel :focus-visible {
  outline: 2px solid #5c7cfa;
  outline-offset: 2px;
  border-radius: 8px;
}

.clear-panel-enter-active,
.clear-panel-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.clear-panel-enter-from,
.clear-panel-leave-to {
  transform: translateX(40px);
  opacity: 0;
}
</style>
