<template>
  <div class="main">
    <ClipFloatBtn :icon="'🧭'" @onBtnClick="restoreDataBase"></ClipFloatBtn>
    <ClipFullData
      :isShow="fullDataShow"
      :fullData="fullData"
      :currentActiveTab="activeTab"
      @onDataRemove="handleDataRemove"
      @onOverlayClick="toggleFullData({ type: 'text', data: '' })"
    ></ClipFullData>
    <ClipSwitch ref="ClipSwitchRef">
      <template #SidePanel>
        <div class="clip-switch-btn-list" v-show="!isSearchPanelExpand">
          <span class="clip-switch-btn clip-select-count" v-show="isMultiple">
            {{ selectCount }}
          </span>
          <span class="clip-switch-btn" v-show="isMultiple" @click="handleMultiCopyBtnClick(false)"
            >📄 复制</span
          >
          <span class="clip-switch-btn" v-show="isMultiple" @click="handleMultiCopyBtnClick(true)"
            >📑 粘贴</span
          >
          <span class="clip-switch-btn" @click="isMultiple = !isMultiple">{{
            isMultiple ? '❌ 退出多选' : '👆'
          }}</span>
          <span class="clip-switch-btn" v-show="!isMultiple" @click="emit('showSetting')">💡</span>
          <span
            class="clip-switch-btn clip-search-btn"
            v-show="!isMultiple"
            @click="handleSearchBtnClick"
          >
            🔍
          </span>
        </div>
          <ClipSearch
            v-show="isSearchPanelExpand"
            @onPanelHide="isSearchPanelExpand = false"
            v-model="filterText"
            :itemCount="list.length"
            :prioritizeCollect="prioritizeCollect"
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
      @onMultiDeleteExecute="handleMultiDeleteBtnClick"
      @onMultiRetainExecute="handleMultiRetainBtnClick"
      @toggleMultiSelect="() => (isMultiple = true)"
      @onDataChange="toggleFullData"
      @onDataRemove="handleDataRemove"
    >
    </ClipItemList>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick, h } from 'vue'
import { ElMessageBox, ElMessage, ElRadioGroup, ElRadio } from 'element-plus'
import ClipItemList from '../cpns/ClipItemList.vue'
import ClipFullData from '../cpns/ClipFullData.vue'
import ClipSearch from '../cpns/ClipSearch.vue'
import ClipSwitch from '../cpns/ClipSwitch.vue'
import ClipFloatBtn from '../cpns/ClipFloatBtn.vue'
import notify from '../data/notify.json'

const notifyShown = ref(false) // 将在onMounted时根据此值判断是否显示通知
const storageNotify = utools.dbStorage.getItem('notify')
notifyShown.value = storageNotify ? storageNotify.version < notify.version : true

const isMultiple = ref(false)

const isSearchPanelExpand = ref(false)

const handleSearchBtnClick = () => {
  // 展开搜索框
  isSearchPanelExpand.value = true
  nextTick(() => window.focus())
}

const ClipItemListRef = ref(null)
const selectCount = ref(0)
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
    const result = itemList
      .map((item) => item.data)
      .reverse()
      .join('\n')
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

const handleMultiDeleteBtnClick = () => {
  const itemList = ClipItemListRef.value.selectItemList
  if (!itemList || itemList.length === 0) {
    return
  }
  const isCollectTab = activeTab.value === 'collect'
  const targetList = isCollectTab ? itemList : itemList.filter((item) => !item.collect)
  const skippedCount = itemList.length - targetList.length
  if (targetList.length === 0) {
    ElMessage({
      message: '已收藏记录已跳过',
      type: 'info'
    })
    return
  }
  const actionText = isCollectTab ? '取消收藏' : '删除'
  const skipText = skippedCount > 0 ? `（${skippedCount}条已收藏记录将被跳过）` : ''
  ElMessageBox.confirm(`确认${actionText}${targetList.length}条记录${skipText}？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    autofocus: true
  })
    .then(() => {
      if (isCollectTab) {
        targetList.forEach((item) => {
          item.collect = undefined
        })
        window.db.updateDataBaseLocal()
      } else {
        targetList.forEach((item) => window.db.removeItemViaId(item.id))
      }
      ClipItemListRef.value.emptySelectItemList()
      isMultiple.value = false
      handleDataRemove()
      ElMessage({
        message: `已${actionText}${targetList.length}条记录`,
        type: 'success'
      })
    })
    .catch(() => {})
}

const handleMultiRetainBtnClick = () => {
  const itemList = ClipItemListRef.value.selectItemList
  if (!itemList || itemList.length === 0) {
    return
  }
  const hasUnretained = itemList.some((item) => !item.retain)
  const now = new Date().getTime()
  itemList.forEach((item) => {
    if (hasUnretained) {
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
  ElMessage({
    message: hasUnretained ? '已添加保留标记' : '已移除保留标记',
    type: 'success'
  })
}

const quickDeleteOptions = [1, 3, 6, 12, 24, 28, 48, 72]
const quickDeleteHours = ref(1)

const handleQuickDelete = () => {
  ElMessageBox({
    title: '快速删除',
    message: h('div', null, [
      h('div', { style: 'margin-bottom: 8px;' }, '选择要删除的时间范围（已收藏/已保留将被跳过）'),
      h(
        ElRadioGroup,
        {
          modelValue: quickDeleteHours.value,
          'onUpdate:modelValue': (val) => (quickDeleteHours.value = val)
        },
        () => quickDeleteOptions.map((n) => h(ElRadio, { label: n }, () => `${n}小时`))
      )
    ]),
    showCancelButton: true,
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      const cutoffTime = new Date().getTime() - quickDeleteHours.value * 60 * 60 * 1000
      const targetList = list.value.filter(
        (item) => item.updateTime >= cutoffTime && !item.collect && !item.retain
      )
      if (!targetList.length) {
        ElMessage({
          message: '没有符合条件的记录',
          type: 'info'
        })
        return
      }
      targetList.forEach((item) => window.db.removeItemViaId(item.id))
      handleDataRemove()
      ElMessage({
        message: `已删除${targetList.length}条记录`,
        type: 'success'
      })
    })
    .catch(() => {})
}

const GAP = 15 // 懒加载 每次添加的条数
const offset = ref(0) // 懒加载 偏移量
const filterText = ref('') // 搜索框绑定值
const list = ref([]) // 全部数据
const showList = ref([]) // 展示的数据
const prioritizeCollect = ref(false)

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

const updateShowList = (type, toTop = true) => {
  // 更新显示列表
  let result = list.value
    .filter((item) =>
      type === 'collect' ? item.collect === true : type === 'all' ? item : item.type === type
    ) // 是 collect则返回所有收藏 否则按照 type返回
    .filter((item) => (filterText.value ? item.type !== 'image' : item)) // 有过滤词 排除掉图片 DataURL
    .filter((item) => textFilterCallBack(item))
  if (filterText.value && prioritizeCollect.value) {
    result = result.sort((a, b) => {
      if (!!a.collect === !!b.collect) {
        return b.updateTime - a.updateTime
      }
      return a.collect ? -1 : 1
    })
  }
  showList.value = result.slice(0, GAP) // 重新切分懒加载列表
  toTop && window.toTop()
}

const restoreDataBase = () => {
  // 清空数据库
  ElMessageBox.confirm('即将清空剪贴板记录(包括收藏内容)', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      window.db.emptyDataBase()
      updateShowList('all')
    })
    .catch(() => {})
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
  updateShowList(ClipSwitchRef.value.activeTab, false)
}

const emit = defineEmits(['showSetting'])

const activeTab = ref('all')

onMounted(() => {
  // 获取挂载的导航组件 Ref
  const toggleNav = ClipSwitchRef.value.toggleNav
  const tabs = ClipSwitchRef.value.tabs

  watch(
    () => ClipSwitchRef.value.activeTab,
    (newVal) => {
      activeTab.value = newVal
      updateShowList(newVal)
    }
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
      if (activeTab.value !== 'all') {
        addition = list.value
          .filter((item) => item.type === activeTab.value)
          .filter((item) => textFilterCallBack(item))
      } else {
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
    const { key, ctrlKey, metaKey, shiftKey, altKey } = e
    const isTab = key === 'Tab'
    const isSearch =
      (ctrlKey && (key === 'F' || key === 'f')) || (ctrlKey && (key === 'L' || key === 'l'))
    const isExit = key === 'Escape'
    const isArrow = key === 'ArrowDown' || key === 'ArrowUp'
    const isEnter = key === 'Enter'
    const isShift = key === 'Shift'
    const isAlt = key === 'Alt'
    const isSpace = key === ' '
    const isDelete = key === 'Delete'
    const isNumber = parseInt(key) <= 9 && parseInt(key) >= 0
    if (altKey && isTab) {
      const tabTypes = tabs.map((item) => item.type)
      const index = tabTypes.indexOf(activeTab.value)
      const target = index === tabTypes.length - 1 ? tabTypes[0] : tabTypes[index + 1]
      toggleNav(target)
      updateShowList(activeTab.value)
      e.preventDefault()
    } else if (altKey && isNumber) {
      const targetIndex = key === '0' ? tabs.length - 1 : parseInt(key) - 1
      if (targetIndex >= 0 && targetIndex < tabs.length) {
        const target = tabs[targetIndex].type
        toggleNav(target)
        updateShowList(activeTab.value)
      }
      e.preventDefault()
    } else if (isTab) {
      const tabTypes = tabs.map((item) => item.type)
      const index = tabTypes.indexOf(activeTab.value)
      const target = index === tabTypes.length - 1 ? tabTypes[0] : tabTypes[index + 1]
      toggleNav(target)
      updateShowList(activeTab.value)
    } else if (isSearch) {
      window.focus()
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
    } else if (isShift) {
      // Shift: 多选操作
      if (!isSearchPanelExpand.value) {
        if (!isMultiple.value) {
          isMultiple.value = !isMultiple.value
        }
      }
    } else if (ctrlKey && isEnter && (isSearchPanelExpand.value || filterText.value)) {
      prioritizeCollect.value = !prioritizeCollect.value
      updateShowList(activeTab.value)
      ElMessage({
        message: prioritizeCollect.value ? '收藏优先显示' : '按时间排序',
        type: 'info'
      })
      e.preventDefault()
    } else if (ctrlKey && shiftKey && isDelete) {
      handleQuickDelete()
      e.preventDefault()
    } else if (isArrow || isEnter) {
      e.preventDefault()
    } else if (ctrlKey || metaKey || isAlt) {
      // Ctrl: utools模拟执行粘贴时触发
      // Alt:
    } else if (isSpace) {
      // 空格向下多选
    } else {
      window.focus() // 其他键盘事件 直接聚焦搜索框
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
</style>
