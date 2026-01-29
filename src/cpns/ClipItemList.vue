<template>
  <div class="clip-item-list">
    <div
      class="clip-item"
      v-for="(item, index) in showList"
      :key="item.createTime"
      @click.left="handleItemClick($event, item)"
      @click.right="handleItemClick($event, item)"
      @mouseenter.prevent="handleMouseOver(index)"
      :class="{
        active: !isMultiple && index === activeIndex,
        'multi-active': isMultiple && index === activeIndex,
        select: selectItemList.indexOf(item) !== -1
      }"
    >
      <div class="clip-info">
        <div class="clip-time">
          <span v-if="item.locked" class="clip-lock" title="已锁定" :key="`lock-${item.id}-${lockUpdateKey}`">🔒</span>
          <span class="relative-date" :title="new Date(item.updateTime).toLocaleString()">{{
            dateFormat(item.updateTime)
          }}</span>
        </div>
        <div class="clip-data">
          <template v-if="item.type === 'text'">
            <el-tooltip :content="item.data" placement="left" :show-after="200">
              <div :class="{ 'clip-over-sized-content': isOverSizedContent(item) }">
                {{ item.data.split(`\n`).slice(0, 6).join(`\n`).trim() }}
              </div>
            </el-tooltip>
          </template>
          <template v-if="item.type === 'image'">
            <div class="image-container" @click="handleImageClick(item)">
              <img 
                v-if="isValidImageData(item.data)"
                class="clip-data-image"
                :src="item.data"
                :alt="'Clipboard Image'"
                @error="handleImageError"
                @load="handleImageLoad"
                @mouseenter="showImagePreview($event, item)"
                @mouseleave="hideImagePreview"
              />
              <div v-else class="image-error-placeholder">
                <span>🖼️ 无效图片</span>
              </div>
            </div>
          </template>
          <template v-if="item.type === 'file'">
            <el-tooltip :content="formatFileNames(item)" placement="left" :show-after="200">
              <el-popover placement="left" trigger="hover" width="320">
                <template #reference>
                  <div :class="{ 'clip-over-sized-content': isOverSizedContent(item) }">
                    <div v-if="hasImageFiles(item)" class="file-with-images">
                      <div class="image-files-preview">
                        <span v-for="(imgFile, index) in getImageFiles(item).slice(0, 3)" :key="imgFile.path" class="image-file-indicator">
                          🖼️
                        </span>
                        <span v-if="getImageFiles(item).length > 3" class="more-images">
                          +{{ getImageFiles(item).length - 3 }}
                        </span>
                      </div>
                      <FileList :data="JSON.parse(item.data).slice(0, 6)" />
                    </div>
                    <FileList v-else :data="JSON.parse(item.data).slice(0, 6)" />
                  </div>
                </template>
                <div style="max-height: 260px; overflow: auto">
                  <div v-if="hasImageFiles(item)" class="image-files-section">
                    <div class="section-title">📷 图片文件 ({{ getImageFiles(item).length }})</div>
                    <div class="image-files-grid">
                      <div v-for="imgFile in getImageFiles(item)" :key="imgFile.path" class="image-file-item">
                        <div class="file-icon">🖼️</div>
                        <div class="file-name">{{ imgFile.path?.split('/').pop() || imgFile.name }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="all-files-section">
                    <div class="section-title">📁 所有文件</div>
                    <FileList :data="JSON.parse(item.data)" />
                  </div>
                  <div v-if="Array.isArray(item.originPaths) && item.originPaths.length" style="margin-top: 8px; opacity: 0.75">
                    <div>原始路径</div>
                    <div v-for="p in item.originPaths" :key="p" :title="p" style="font-size: 12px; word-break: break-all">
                      {{ p }}
                    </div>
                  </div>
                </div>
              </el-popover>
            </el-tooltip>
          </template>
        </div>
      </div>
      <ClipOperate
        v-show="!isMultiple && activeIndex === index"
        :item="item"
        :currentActiveTab="currentActiveTab"
        @onDataChange="() => emit('onDataChange', item)"
        @onDataRemove="() => emit('onDataRemove')"
      ></ClipOperate>
      <div class="clip-count" v-show="isMultiple || activeIndex !== index">
        {{ index + 1 }}
      </div>
    </div>
  </div>
  
  <!-- Custom Image Preview -->
  <div 
    v-if="imagePreview.show" 
    class="image-preview-modal"
    :style="imagePreview.style"
    @mouseenter="keepImagePreview"
    @mouseleave="hideImagePreview"
  >
    <div class="image-preview-content">
      <img 
        v-if="isValidImageData(imagePreview.src)"
        :src="imagePreview.src"
        :style="imagePreview.imageStyle"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <div v-else class="preview-error">
        <span>图片加载失败</span>
      </div>
    </div>
  </div>
  
  <ClipDrawerMenu
      :show="drawerShow"
      :items="drawerItems"
      :position="drawerPosition"
      :defaultActive="drawerDefaultActive"
      @select="handleDrawerSelect"
      @close="closeDrawer"
      @reorder="handleDrawerReorder"
  />
</template>

<script setup>
import {ref, onMounted, onUnmounted, watch, computed} from 'vue'
import {getCurrentLayer} from '../global/hotkeyLayers'
import { ElMessage } from 'element-plus'
import FileList from './FileList.vue'
import ClipOperate from './ClipOperate.vue'
import ClipDrawerMenu from './ClipDrawerMenu.vue'
import { dateFormat, isUToolsPlugin, copyWithSearchFocus, copyOnly } from '../utils'
import defaultOperation from '../data/operation.json'
import setting from '../global/readSetting'
import useClipOperate from '../hooks/useClipOperate'
const props = defineProps({
  showList: {
    type: Array,
    required: true
  },
  fullData: {
    type: Object,
    required: true
  },
  isMultiple: {
    type: Boolean,
    required: true
  },
  currentActiveTab: {
    type: String,
    required: true
  },
  isSearchPanelExpand: {
    type: Boolean,
    required: true
  }
})
const emit = defineEmits([
  'onDataChange',
  'onDataRemove',
  'onMultiCopyExecute',
  'toggleMultiSelect',
  'onItemDelete',
  'openCleanDialog'
])
const isOverSizedContent = (item) => {
  const { type, data } = item
  if (type === 'text') {
    // 没有换行的长文本也应当被纳入考虑
    return data.split(`\n`).length - 1 > 6 || data.length > 255
  } else if (type === 'file') {
    return JSON.parse(item.data).length >= 6
  }
}

// 图片数据验证
const isValidImageData = (data) => {
  if (!data || typeof data !== 'string') return false
  return data.startsWith('data:image/') && data.includes('base64,')
}

// 图片点击处理
const handleImageClick = (item) => {
  if (isValidImageData(item.data)) {
    copyWithSearchFocus(item)
  }
}

// 图片加载错误处理
const handleImageError = (event) => {
  console.warn('[ClipItemList] 图片加载失败:', event.target.src)
  event.target.style.display = 'none'
}

// 图片加载成功处理
const handleImageLoad = (event) => {
  console.log('[ClipItemList] 图片加载成功:', event.target.src)
}

// 显示图片预览
const showImagePreview = (event, item) => {
  if (!isValidImageData(item.data)) return
  
  // 清除之前的隐藏定时器
  if (imagePreviewHideTimer) {
    clearTimeout(imagePreviewHideTimer)
    imagePreviewHideTimer = null
  }
  
  // 获取窗口尺寸
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // 计算图片显示区域（留出边距）
  const margin = 100
  const maxWidth = windowWidth - margin * 2
  const maxHeight = windowHeight - margin * 2
  
  // 设置预览位置和样式
  imagePreview.value.src = item.data
  imagePreview.value.show = true
  imagePreview.value.style = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`
  }
  
  // 图片样式
  imagePreview.value.imageStyle = {
    maxWidth: `${maxWidth}px`,
    maxHeight: `${maxHeight}px`,
    objectFit: 'contain',
    display: 'block',
    borderRadius: '4px'
  }
}

// 隐藏图片预览
const hideImagePreview = () => {
  // 延迟隐藏，允许鼠标移动到预览区域
  imagePreviewHideTimer = setTimeout(() => {
    imagePreview.value.show = false
    imagePreviewHideTimer = null
  }, 200)
}

// 保持图片预览显示
const keepImagePreview = () => {
  if (imagePreviewHideTimer) {
    clearTimeout(imagePreviewHideTimer)
    imagePreviewHideTimer = null
  }
}

// Shift键长按处理
const handleShiftKeyDown = () => {
  if (shiftKeyTimer) return
  
  shiftKeyDownTime = Date.now()
  shiftKeyTimer = setTimeout(() => {
    // Shift键按住超过100ms，触发键盘预览
    keyboardTriggeredPreview.value = true
    // 如果当前有活跃的图片项，显示预览
    const currentItem = props.showList[activeIndex.value]
    if (currentItem && currentItem.type === 'image' && isValidImageData(currentItem.data)) {
      showImagePreview(null, currentItem)
    }
  }, 100) // 改为100ms
}

const handleShiftKeyUp = () => {
  if (shiftKeyTimer) {
    clearTimeout(shiftKeyTimer)
    shiftKeyTimer = null
  }
  
  // 如果是键盘触发的预览，隐藏预览
  if (keyboardTriggeredPreview.value) {
    keyboardTriggeredPreview.value = false
    // 使用更温和的方式隐藏预览，避免影响UI状态
    imagePreviewHideTimer = setTimeout(() => {
      imagePreview.value.show = false
      imagePreviewHideTimer = null
    }, 100) // 减少延迟时间
  }
}

// 键盘触发的图片预览
const triggerKeyboardImagePreview = () => {
  if (!keyboardTriggeredPreview.value) return
  
  const currentItem = props.showList[activeIndex.value]
  if (currentItem && currentItem.type === 'image' && isValidImageData(currentItem.data)) {
    showImagePreview(null, currentItem)
  }
}

// 检测文件中是否包含图片
const hasImageFiles = (item) => {
  if (item.type !== 'file') return false
  try {
    const files = JSON.parse(item.data)
    return files.some(file => {
      const extension = file.path?.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(extension)
    })
  } catch (e) {
    return false
  }
}

// 获取文件中的图片文件
const getImageFiles = (item) => {
  if (item.type !== 'file') return []
  try {
    const files = JSON.parse(item.data)
    return files.filter(file => {
      const extension = file.path?.split('.').pop()?.toLowerCase()
      return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico'].includes(extension)
    })
  } catch (e) {
    return []
  }
}

const formatFileNames = (item) => {
  try {
    const paths = JSON.parse(item.data)
      .map((f) => f.path)
      .filter(Boolean)
    const origin = Array.isArray(item.originPaths) ? item.originPaths.filter(Boolean) : []
    if (origin.length) {
      return [...paths, '---', ...origin].join('\n')
    }
    return paths.join('\n')
  } catch (e) {
    return ''
  }
}

const closeDrawer = () => {
  drawerShow.value = false
}

const handleDrawerSelect = (op, meta = {}) => {
  const currentItem = props.showList[activeIndex.value]
  if (!currentItem) return
  handleOperateClick(op, currentItem, meta)
  if (!meta.sub) {
    drawerShow.value = false
  }
}

const handleDrawerReorder = (list) => {
  drawerItems.value = list
  drawerOrder.value = list.map((op) => op.id)
  utools.dbStorage.setItem('drawer.order', drawerOrder.value)
}

const applyDrawerOrder = (list) => {
  if (!drawerOrder.value.length) return list
  const orderSet = new Set(drawerOrder.value)
  const ordered = drawerOrder.value
    .map((id) => list.find((op) => op.id === id))
    .filter(Boolean)
  const remaining = list.filter((op) => !orderSet.has(op.id))
  return [...ordered, ...remaining]
}
const isShiftDown = ref(false)
const selectItemList = ref([])
const allSelectedLocked = ref(false) // 临时标志：记录所有选中项是否都已锁定
const pendingLockOperations = ref(false) // 标记是否有待处理的锁定操作
const lockUpdateKey = ref(0) // 用于强制更新锁图标

// 图片预览相关
const imagePreview = ref({
  show: false,
  src: '',
  style: {},
  imageStyle: {}
})

// 图片预览隐藏定时器
let imagePreviewHideTimer = null

// Shift键长按相关
let shiftKeyDownTime = 0
let shiftKeyTimer = null
const keyboardTriggeredPreview = ref(false)
const activeIndex = ref(0) // 定义 activeIndex，需要在 defineExpose 之前
const drawerShow = ref(false)
const drawerPosition = ref({top: 0, left: 0})
const drawerItems = ref([])
const drawerDefaultActive = ref(0)
const drawerOrder = ref(Array.isArray(utools.dbStorage.getItem('drawer.order')) ? utools.dbStorage.getItem('drawer.order') : [])
const operations = computed(() => [...defaultOperation, ...setting.operation.custom])
const {handleOperateClick, filterOperate} = useClipOperate({emit, currentActiveTab: () => props.currentActiveTab})
const emptySelectItemList = () => (selectItemList.value = [])
defineExpose({
  selectItemList, // 暴露给 Main/Switch中的操作按钮以执行复制
  emptySelectItemList,
  activeIndex // 暴露当前高亮的索引
})
watch(
  () => props.isMultiple,
  (val) => {
    if (!val) {
      emptySelectItemList() // 退出多选状态 清空列表
      // 只有在没有待处理的锁定操作时才重置标志
      if (!pendingLockOperations.value) {
        allSelectedLocked.value = false // 重置锁定状态标志
      }
    } else if (val && selectItemList.value.length > 0) {
      // 进入多选模式且已有选中项时，初始化锁定状态标志
      updateAllSelectedLockedFlag()
    }
  }
)
// 更新所有选中项锁定状态的标志
const updateAllSelectedLockedFlag = () => {
  if (selectItemList.value.length === 0) {
    allSelectedLocked.value = false
    return
  }
  allSelectedLocked.value = selectItemList.value.every(item => item.locked === true)
}

// 保存选中项的ID列表，用于在数据更新后恢复选择
const selectedItemIds = ref([])
const preserveSelection = () => {
  selectedItemIds.value = selectItemList.value.map(item => item.id)
}

// 恢复选择状态
const restoreSelection = () => {
  if (!props.isMultiple || selectedItemIds.value.length === 0) return
  
  const newSelection = props.showList.filter(item => 
    selectedItemIds.value.includes(item.id)
  )
  selectItemList.value = newSelection
  selectedItemIds.value = []
  updateAllSelectedLockedFlag()
}

// 多选列表为空时自动退出多选状态
watch(
    () => selectItemList.value.length,
    (len) => {
      if (props.isMultiple && len === 0) {
        emit('toggleMultiSelect', false)
        allSelectedLocked.value = false // 重置锁定状态标志
      } else if (props.isMultiple && len > 0) {
        // 选中项发生变化时更新锁定状态标志
        updateAllSelectedLockedFlag()
      }
    }
)
const handleItemClick = (ev, item) => {
  if (props.isMultiple === true) {
    const i = selectItemList.value.indexOf(item) // 在已选中列表中的位置
    const index = props.showList.indexOf(item) // 在全部列表中的位置
    activeIndex.value = index
    if (selectItemList.value.length !== 0 && isShiftDown.value) {
      // 列表不为空 且 Shift按下 多选
      // 找到selectList的最高位与最低位
      // 如果index大于最高位/小于最低位 则将二者之间的全部历史都选中
      // 区分不同标签
      const tmpArray = selectItemList.value
        .filter((item) =>
          props.currentActiveTab === 'all' ? true : item.type === props.currentActiveTab
        )
        .sort((a, b) => selectItemList.value.indexOf(a) - selectItemList.value.indexOf(b))
      const h = props.showList.indexOf(tmpArray[0]) // 已选中的index最高位 实际上index是最小的
      const l = props.showList.indexOf(tmpArray[tmpArray.length - 1]) // 已选中的最低位 实际上index是最大的
      if (index < h) {
        // 更高: index从0开始计算
        // selectItemList.value = []
        for (let i = index; i <= h; i++) {
          selectItemList.value.push(props.showList[i])
        }
        // 数组去重
        selectItemList.value = selectItemList.value.filter(function (item, index) {
          return selectItemList.value.indexOf(item) === index
        })
      } else if (index > l) {
        // 更低
        // selectItemList.value = []
        for (let i = h; i <= index; i++) {
          selectItemList.value.push(props.showList[i])
        }
        // 数组去重
        selectItemList.value = selectItemList.value.filter(function (item, index) {
          return selectItemList.value.indexOf(item) === index
        })
      } else if (index <= l && index >= h) {
        // 单选操作 与下面代码相同
        if (i !== -1) {
          selectItemList.value.splice(i, 1) // 已经存在 点击移除
        } else {
          selectItemList.value.push(item) // 添加到已选列表中
        }
      }
    } else {
      // Shift未按下 单选
      if (i !== -1) {
        selectItemList.value.splice(i, 1) // 已经存在 点击移除
      } else {
        selectItemList.value.push(item) // 添加到已选列表中
      }
    }
  } else {
    const { button } = ev
    if (button === 0) {
      // 左键 复制（不改变插件内位置，可粘贴到外部）
      copyWithSearchFocus(item)
    } else if (button === 2) {
      // 右键 仅复制
      window.copy(item)
      ElMessage({
        message: '复制成功',
        type: 'success'
      })
    }
  }
}
const handleMouseOver = (index) => {
  if (!props.isMultiple) {
    activeIndex.value = index
  }
}
// 监听activeIndex变化，在Shift长按状态下触发图片预览
watch(
  () => activeIndex.value,
  (newIndex) => {
    if (keyboardTriggeredPreview.value) {
      triggerKeyboardImagePreview()
    }
  }
)

// 监听showList变化，恢复选择状态
watch(
  () => props.showList,
  (newList, oldList) => {
    if (newList && oldList && newList !== oldList) {
      restoreSelection()
    }
  },
  { deep: true }
)

// 父组件中改变了引用类型的地址 故要用 getter返回
watch(
  () => props.showList,
  (newList) => {
    if (!Array.isArray(newList) || newList.length === 0) {
      activeIndex.value = 0
      return
    }
    if (activeIndex.value >= newList.length) {
      activeIndex.value = newList.length - 1
    }
  }
)

const DEBUG_KEYS = false
let lastNavAt = 0

const keyDownCallBack = (e) => {
  if (e.__layerHandled) {
    return
  }
  if (getCurrentLayer()) {
    return
  }
  const {key, ctrlKey, metaKey, altKey, shiftKey} = e
  if (DEBUG_KEYS) {
    console.log('[keyDown] 按键:', key, 'ctrl:', ctrlKey, 'meta:', metaKey, 'alt:', altKey, 'shift:', shiftKey)
  }

  const isArrowUp = key === 'ArrowUp' || (ctrlKey && (key === 'K' || key === 'k'))
  const isArrowDown = key === 'ArrowDown' || (ctrlKey && (key === 'J' || key === 'j'))
  const isArrowRight = key === 'ArrowRight'
  const isArrowLeft = key === 'ArrowLeft'
  const isEnter = key === 'Enter'
  const isCtrlEnter = isEnter && (ctrlKey || metaKey)
  const isCopy = (ctrlKey || metaKey) && (key === 'C' || key === 'c')
  const isNumber = parseInt(key) <= 9 && parseInt(key) >= 0
  const isShift = key === 'Shift'
  const isSpace = key === ' '
  const isDelete = key === 'Delete' || key === 'Backspace'
  const isCollect = (ctrlKey || metaKey) && (key === 'D' || key === 'd')
  const isToggleLockHotkey = (ctrlKey || metaKey) && (key === 'U' || key === 'u')
  const isShiftDelete = shiftKey && (key === 'Delete' || key === 'Backspace')
  const isCtrl = ctrlKey || metaKey

  if (DEBUG_KEYS) {
    console.log('[keyDown] 快捷键状态:', {
      isArrowUp, isArrowDown, isArrowRight, isArrowLeft, isEnter, isCtrlEnter,
    isCopy, isNumber, isShift, isSpace, isDelete, isCollect, isToggleLockHotkey,
    isShiftDelete, isCtrl
    })
  }

  const isNav = isArrowUp || isArrowDown
  if (e.repeat) {
    if (isNav) {
      const now = Date.now()
      if (now - lastNavAt < 40) return
      lastNavAt = now
    } else if (isCopy || isEnter || isCtrlEnter || isDelete || isCollect || isToggleLockHotkey || isShiftDelete || isSpace) {
      return
    }
  }
  const activeNode = !props.isMultiple
    ? document.querySelector('.clip-item.active' + (isArrowDown ? '+.clip-item' : ''))
    : document.querySelector('.clip-item.multi-active' + (isArrowDown ? '+.clip-item' : ''))

  // 检查搜索框是否有焦点，以及是否可以删除条目
  const searchInput = document.querySelector('.clip-search-input')
  const isSearchInputFocused = document.activeElement === searchInput

  // Delete 键：如果事件对象上有 shouldDeleteItem 标记，或者搜索框没有焦点，或者光标在末尾，则可以删除条目
  // Backspace 键：只有在搜索框没有焦点时才能删除条目（搜索框有焦点时保持默认的删除文本行为）
  const isDeleteKey = key === 'Delete'
  const isBackspaceKey = key === 'Backspace'
  const isForceDeleteKey = (ctrlKey || metaKey) && (isDeleteKey || isBackspaceKey)
  const canDeleteItem = isForceDeleteKey || (isDeleteKey && (e.shouldDeleteItem || !isSearchInputFocused || (isSearchInputFocused && searchInput &&
    searchInput.selectionStart === searchInput.selectionEnd &&
    searchInput.selectionStart === searchInput.value.length)) ||
    (isBackspaceKey && !isSearchInputFocused))

  // 抽屉菜单打开时的 Ctrl+数字 / Ctrl+Shift+数字，由 ClipDrawerMenu 接管，避免重复触发
  if (drawerShow.value && isCtrl && isNumber) {
    return
  }

  // Ctrl+Shift+数字：抽屉子菜单快捷触发（抽屉未打开时）
  if (!drawerShow.value && isCtrl && shiftKey && isNumber) {
    const currentItem = props.showList[activeIndex.value]
    if (currentItem) {
      const available = operations.value.filter((op) => filterOperate(op, currentItem, false))
      const ordered = applyDrawerOrder(available)
      const num = parseInt(key, 10)
      if (!Number.isNaN(num) && num >= 1 && num <= ordered.length) {
        const target = ordered[num - 1]
        handleOperateClick(target, currentItem, { sub: true })
        e.preventDefault()
        e.stopPropagation()
        return
      }
    }
  }

  // 收藏快捷键：Ctrl/Command + D
  if (isCollect) {
    e.preventDefault()
    const targets = props.isMultiple && selectItemList.value.length
        ? [...selectItemList.value]
        : props.showList[activeIndex.value]
            ? [props.showList[activeIndex.value]]
            : []
    targets.forEach((item) => {
      const isCollected = window.db.isCollected(item.id)
      if (props.currentActiveTab === 'collect' || isCollected) {
        window.db.removeCollect(item.id)
      } else {
        window.db.addCollect(item.id)
      }
    })
    if (targets.length) {
      ElMessage({type: 'success', message: props.currentActiveTab === 'collect' ? '已取消收藏选中项' : '已更新收藏状态'})
      emit('onDataRemove')
    }
    return
  }

  if (isArrowRight) {
    // Navigate to next item
    if (activeIndex.value < props.showList.length - 1) {
      activeIndex.value++
      const nextNode = document.querySelector('.clip-item.active+.clip-item')
      if (nextNode) {
        nextNode.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
    e.preventDefault()
    e.stopPropagation()
    return
  }

  if (isArrowLeft) {
    // Navigate to previous item
    if (activeIndex.value > 0) {
      activeIndex.value--
      const prevNode = document.querySelector('.clip-item.active')?.previousElementSibling?.previousElementSibling
      if (prevNode) {
        prevNode.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
    e.preventDefault()
    e.stopPropagation()
    return
  }


  // 锁定开关：Ctrl/Command + U
  if (isToggleLockHotkey) {
    e.preventDefault()
    e.stopPropagation()
    if (e.repeat) return
    const targets = props.isMultiple && selectItemList.value.length
        ? [...selectItemList.value]
        : props.showList[activeIndex.value]
            ? [props.showList[activeIndex.value]]
            : []
    if (props.isMultiple && targets.length) {
      // 保存当前选择状态
      preserveSelection()
      // 使用临时标志决定操作：如果全部已锁定则解锁全部，否则锁定全部
      const shouldLock = !allSelectedLocked.value
      
      // 直接更新内存中的锁定状态，避免触发setLock的副作用
      targets.forEach((item) => {
        const target = window.db.dataBase.data.find((dbItem) => dbItem.id === item.id) ||
                      window.db.dataBase.collectData.find((dbItem) => dbItem.id === item.id)
        if (target) {
          target.locked = shouldLock
          // 同时更新showList中的item以保持UI同步
          item.locked = shouldLock
        }
      })
      
      // 更新数据库时间戳但不写入文件
      window.db.updateDataBase()
      
      // 更新临时标志
      allSelectedLocked.value = shouldLock
      // 标记有待处理的锁定操作
      pendingLockOperations.value = true
      
      // 强制更新锁图标显示
      lockUpdateKey.value++
      
      // 延迟清除待处理标志，但不写入文件以避免触发view-change
      setTimeout(() => {
        // 操作完成后清除待处理标志
        pendingLockOperations.value = false
        // 如果已经退出多选模式，现在重置标志
        if (!props.isMultiple) {
          allSelectedLocked.value = false
        }
      }, 50)
    } else {
      targets.forEach((item) => window.setLock(item.id, item.locked !== true))
    }
    return
  }

  // Shift+Delete: 打开清理对话框
  if (isShiftDelete) {
    e.preventDefault()
    e.stopPropagation()
    emit('openCleanDialog')
    return
  }

  // Ctrl+Enter: 复制+上锁（即使搜索框有焦点也生效）
  if (isCtrlEnter && !props.isMultiple && props.showList[activeIndex.value]) {
    e.preventDefault()
    e.stopPropagation()
    if (e.repeat) return
    const current = props.showList[activeIndex.value]
    copyWithSearchFocus(current)
    window.setLock(current.id, true)
    return
  }

  if (isDelete && canDeleteItem) {
    const forceDelete = (ctrlKey || metaKey) && (isDeleteKey || isBackspaceKey)
    const itemsToDelete = []
    const anchorIndex = activeIndex.value
    if (props.isMultiple) {
      if (selectItemList.value.length) {
        itemsToDelete.push(...selectItemList.value)
      } else if (props.showList[activeIndex.value]) {
        itemsToDelete.push(props.showList[activeIndex.value])
      }
    } else if (props.showList[activeIndex.value]) {
      itemsToDelete.push(props.showList[activeIndex.value])
    }

    const deletableItems = itemsToDelete.filter((item) => forceDelete || item.locked !== true)
    const skippedLocked = itemsToDelete.length - deletableItems.length

    if (deletableItems.length) {
      e.preventDefault()
      e.stopPropagation()
      if (props.isMultiple) {
        selectItemList.value = selectItemList.value.filter(
            (item) => !deletableItems.includes(item)
        )
      }
      deletableItems.forEach((item, index) =>
        emit('onItemDelete', item, {
          anchorIndex,
          isBatch: props.isMultiple && deletableItems.length > 1,
          isLast: index === deletableItems.length - 1,
          force: forceDelete
        })
      )
    }
    if (skippedLocked > 0 && !forceDelete) {
      ElMessage({type: 'info', message: `已跳过锁定 ${skippedLocked} 条，使用 Ctrl+Delete/Ctrl+Backspace 强制删除`})
    }
    if (props.isMultiple && forceDelete) {
      selectItemList.value = []
      emit('toggleMultiSelect', false)
    }
    return
  }

  if (isArrowUp) {
    if (activeIndex.value === 1) window.toTop()
    if (activeIndex.value > 0) {
      activeIndex.value--
      const prevNode = activeNode?.previousElementSibling?.previousElementSibling
      if (prevNode) {
        prevNode.scrollIntoView({
          block: 'nearest',
          inline: 'nearest'
        })
      }
    }
  } else if (isArrowDown) {
    if (activeIndex.value < props.showList.length - 1) {
      activeIndex.value++
      if (activeNode) {
        activeNode.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
  } else if (isCopy) {
    if (!props.fullData.data) {
      // 如果侧栏中有数据 证明侧栏是打开的 不执行复制
      if (!props.isMultiple) {
        if (props.showList[activeIndex.value]) {
          copyWithSearchFocus(props.showList[activeIndex.value])
          ElMessage({
            message: '复制成功',
            type: 'success'
          })
        }
      } else {
        e.preventDefault()
        e.stopPropagation()
        emit('onMultiCopyExecute', { paste: false, persist: true, exit: true })
      }
    }
  } else if (isEnter) {
    if (props.isMultiple) {
      e.preventDefault()
      e.stopPropagation()
      if (e.repeat) return
      emit('onMultiCopyExecute', { paste: isCtrlEnter, persist: true, exit: true })
      return
    }
    if (!props.isMultiple && !isCtrlEnter && props.showList[activeIndex.value]) {
      console.log('isEnter')
      copyWithSearchFocus(props.showList[activeIndex.value])
    }
  } else if ((ctrlKey || metaKey || altKey) && isNumber) {
    const targetItem = props.showList[parseInt(key) - 1]
    if (targetItem) {
      copyWithSearchFocus(targetItem)
      selectItemList.value = []
    }
  } else if (isShift) {
    // Shift键只用于图片预览，不应该影响导航或高亮
    // 防止Shift键影响activeIndex或选择状态
    e.preventDefault()
    e.stopPropagation()
    
    if (props.isMultiple) {
      isShiftDown.value = true
    }
    // 处理Shift键长按预览
    handleShiftKeyDown()
  } else if (isSpace) {
    if (props.isSearchPanelExpand) {
      // 搜索栏展开状态 不进入多选
      return
    }
    if (!props.isMultiple) {
      emit('toggleMultiSelect', true) // 仅在需要时开启多选
    }
    e.preventDefault()
    const currentItem = props.showList[activeIndex.value]
    if (!currentItem) return // 如果当前项不存在，直接返回
    const i = selectItemList.value.findIndex((item) => item === currentItem)
    if (i !== -1) {
      selectItemList.value.splice(i, 1) // 如果已选中 则取消选中
    } else {
      selectItemList.value.push(currentItem) // 如果未选中 则选中
      activeIndex.value++
      const nextNode = document.querySelector('.clip-item.multi-active+.clip-item')
      if (nextNode) {
        nextNode.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    }
  }
}
const keyUpCallBack = (e) => {
  const { key } = e
  const isShift = key === 'Shift'
  if (isShift) {
    // Shift键释放不应该影响任何UI状态
    e.preventDefault()
    e.stopPropagation()
    
    if (props.isMultiple) {
      isShiftDown.value = false
    }
    // 处理Shift键释放
    handleShiftKeyUp()
  }
}

onMounted(() => {
  // 监听键盘事件
  document.addEventListener('keydown', keyDownCallBack)
  document.addEventListener('keyup', keyUpCallBack)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keyDownCallBack)
  document.removeEventListener('keyup', keyUpCallBack)
  
  // 清理图片预览定时器
  if (imagePreviewHideTimer) {
    clearTimeout(imagePreviewHideTimer)
    imagePreviewHideTimer = null
  }
  
  // 清理Shift键定时器
  if (shiftKeyTimer) {
    clearTimeout(shiftKeyTimer)
    shiftKeyTimer = null
  }
})
</script>

<style lang="less" scoped>
@import '../style';
</style>
