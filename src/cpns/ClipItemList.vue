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

  <!-- Long Text Preview (Shift hold) -->
  <div
    v-if="textPreview.show"
    class="text-preview-modal"
    :style="textPreview.style"
    @mouseenter="keepTextPreview"
    @mouseleave="hideTextPreview"
  >
    <div class="text-preview-content">{{ textPreview.text }}</div>
  </div>
  
  <ClipDrawerMenu
      :show="drawerShow"
      :items="drawerItems"
      :position="drawerPosition"
      :defaultActive="drawerDefaultActive"
      :placement="drawerPlacement"
      @select="handleDrawerSelect"
      @close="closeDrawer"
      @reorder="handleDrawerReorder"
  />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { registerFeature } from '../global/hotkeyRegistry'
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

  textPreview.value.show = false
  if (textPreviewHideTimer) {
    clearTimeout(textPreviewHideTimer)
    textPreviewHideTimer = null
  }

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

// Shift 持续按下预览：按 item 类型封装的预览入口
const SHIFT_PREVIEW_HOLD_MS = 100
const LONG_TEXT_THRESHOLD = 80

const isLongText = (item) => {
  if (!item || item.type !== 'text' || typeof item.data !== 'string') return false
  return item.data.length > LONG_TEXT_THRESHOLD || item.data.includes('\n')
}

/** 根据当前 item 类型执行预览（图片 / 长文本，其余类型暂不处理） */
const runPreviewForItem = (item) => {
  if (!item) return
  if (item.type === 'image' && isValidImageData(item.data)) {
    showImagePreview(null, item)
    return
  }
  if (item.type === 'text' && isLongText(item)) {
    showTextPreview(item)
    return
  }
}

// Shift键长按处理（普通层 100ms 持续即对所在 item 进行预览）
const handleShiftKeyDown = () => {
  if (shiftKeyTimer) return

  shiftKeyDownTime = Date.now()
  shiftKeyTimer = setTimeout(() => {
    keyboardTriggeredPreview.value = true
    const currentItem = props.showList[activeIndex.value]
    runPreviewForItem(currentItem)
  }, SHIFT_PREVIEW_HOLD_MS)
}

const handleShiftKeyUp = () => {
  if (shiftKeyTimer) {
    clearTimeout(shiftKeyTimer)
    shiftKeyTimer = null
  }

  if (keyboardTriggeredPreview.value) {
    keyboardTriggeredPreview.value = false
    imagePreviewHideTimer = setTimeout(() => {
      imagePreview.value.show = false
      imagePreviewHideTimer = null
    }, 100)
    textPreviewHideTimer = setTimeout(() => {
      textPreview.value.show = false
      textPreviewHideTimer = null
    }, 100)
  }
}

// 键盘触发的预览（Shift 长按后切换 item 时刷新预览）
const triggerKeyboardPreview = () => {
  if (!keyboardTriggeredPreview.value) return
  const currentItem = props.showList[activeIndex.value]
  runPreviewForItem(currentItem)
}

const showTextPreview = (item) => {
  imagePreview.value.show = false
  if (imagePreviewHideTimer) {
    clearTimeout(imagePreviewHideTimer)
    imagePreviewHideTimer = null
  }
  if (textPreviewHideTimer) {
    clearTimeout(textPreviewHideTimer)
    textPreviewHideTimer = null
  }
  const margin = 80
  const maxW = window.innerWidth - margin * 2
  const maxH = window.innerHeight - margin * 2
  textPreview.value.text = item.data || ''
  textPreview.value.show = true
  textPreview.value.style = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    borderRadius: '8px',
    padding: '16px 20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
    maxWidth: `${maxW}px`,
    maxHeight: `${maxH}px`,
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '14px',
    lineHeight: '1.5',
    color: '#e8e6e3'
  }
}

const hideTextPreview = () => {
  textPreviewHideTimer = setTimeout(() => {
    textPreview.value.show = false
    textPreviewHideTimer = null
  }, 200)
}

const keepTextPreview = () => {
  if (textPreviewHideTimer) {
    clearTimeout(textPreviewHideTimer)
    textPreviewHideTimer = null
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

// 全部信息内的菜单：与主层 ClipOperate 一致，filterOperate + applyDrawerOrder，用于右侧抽屉
const getDrawerFullMenuItems = (currentItem) => {
  if (!currentItem) return []
  const available = operations.value.filter((op) => filterOperate(op, currentItem, false))
  return applyDrawerOrder(available)
}

// 打开当前 item 的快捷菜单抽屉（右侧抽屉，展示全部菜单；右方向键/鼠标右键/c-s-序号 调用）
const openDrawerForCurrentItem = (ev, defaultActiveIndex = 0) => {
  const currentItem = props.showList[activeIndex.value]
  if (!currentItem) return
  const fullMenu = getDrawerFullMenuItems(currentItem)
  if (!fullMenu.length) return
  nextTick(() => {
    const el = ev?.target?.closest?.('.clip-item') || document.querySelector('.clip-item.active')
    const rect = el?.getBoundingClientRect()
    drawerPosition.value = rect ? { top: rect.bottom + 4, left: rect.left } : { top: 100, left: 100 }
    drawerItems.value = fullMenu
    drawerDefaultActive.value = Math.min(defaultActiveIndex, Math.max(0, fullMenu.length - 1))
    drawerPlacement.value = 'right'
    drawerShow.value = true
  })
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

// 长文本预览相关
const textPreview = ref({
  show: false,
  text: '',
  style: {}
})

// 图片预览隐藏定时器
let imagePreviewHideTimer = null
// 长文本预览隐藏定时器
let textPreviewHideTimer = null

// Shift键长按相关
let shiftKeyDownTime = 0
let shiftKeyTimer = null
const keyboardTriggeredPreview = ref(false)
const activeIndex = ref(0) // 定义 activeIndex，需要在 defineExpose 之前
const drawerShow = ref(false)
const drawerPosition = ref({ top: 0, left: 0 })
const drawerItems = ref([])
const drawerDefaultActive = ref(0)
const drawerPlacement = ref('right')
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
// 多选普通删除后：用于在 showList 更新时恢复高亮（若高亮项被删则下移，最后一个则上移）
const pendingHighlightedItemId = ref(null)
const pendingActiveIndexAfterDelete = ref(null)
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
      // 右键 打开抽屉（与右方向键一致）
      activeIndex.value = props.showList.indexOf(item)
      openDrawerForCurrentItem(ev)
      ev.preventDefault()
    }
  }
}
const handleMouseOver = (index) => {
  if (!props.isMultiple) {
    activeIndex.value = index
  }
}
// 监听activeIndex变化，在Shift长按状态下触发预览
watch(
  () => activeIndex.value,
  () => {
    if (keyboardTriggeredPreview.value) {
      triggerKeyboardPreview()
    }
  }
)

// 监听showList变化，恢复选择状态并恢复高亮
watch(
  () => props.showList,
  (newList, oldList) => {
    if (newList && oldList && newList !== oldList) {
      restoreSelection()
      if (props.isMultiple && pendingHighlightedItemId.value != null && pendingActiveIndexAfterDelete.value != null) {
        const id = pendingHighlightedItemId.value
        const oldIdx = pendingActiveIndexAfterDelete.value
        pendingHighlightedItemId.value = null
        pendingActiveIndexAfterDelete.value = null
        const idx = newList.findIndex((item) => item.id === id)
        if (idx !== -1) {
          activeIndex.value = idx
        } else {
          activeIndex.value = Math.min(oldIdx, newList.length - 1)
        }
      }
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

function registerListHotkeyFeatures() {
  const getCanDeleteItem = (e, forceDelete) => {
    const searchInput = document.querySelector('.clip-search-input')
    const isSearchInputFocused = document.activeElement === searchInput
    const isDeleteKey = e.key === 'Delete'
    const isBackspaceKey = e.key === 'Backspace'
    if (forceDelete) return true
    if (isDeleteKey && (e.shouldDeleteItem || !isSearchInputFocused || (isSearchInputFocused && searchInput && searchInput.selectionStart === searchInput.selectionEnd && searchInput.selectionStart === searchInput.value.length))) return true
    if (isBackspaceKey && !isSearchInputFocused) return true
    return false
  }

  registerFeature('list-nav-up', () => {
    if (activeIndex.value === 1) window.toTop()
    if (activeIndex.value > 0) {
      activeIndex.value--
      const prevNode = document.querySelector('.clip-item.active')?.previousElementSibling?.previousElementSibling
      prevNode?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    return true
  })
  registerFeature('list-nav-down', () => {
    if (activeIndex.value < props.showList.length - 1) {
      activeIndex.value++
      const activeNode = document.querySelector('.clip-item.active')
      activeNode?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    return true
  })
  registerFeature('list-nav-left', () => {
    if (activeIndex.value > 0) {
      activeIndex.value--
      const prevNode = document.querySelector('.clip-item.active')?.previousElementSibling?.previousElementSibling
      prevNode?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    return true
  })
  registerFeature('list-nav-right', () => {
    if (activeIndex.value < props.showList.length - 1) {
      activeIndex.value++
      const nextNode = document.querySelector('.clip-item.active+.clip-item')
      nextNode?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    return true
  })
  registerFeature('list-drawer-open', () => {
    openDrawerForCurrentItem()
    return true
  })
  registerFeature('list-enter', (e) => {
    if (props.isMultiple) {
      emit('onMultiCopyExecute', { paste: false, persist: true, exit: true })
      return true
    }
    if (props.showList[activeIndex.value]) copyWithSearchFocus(props.showList[activeIndex.value])
    return true
  })
  registerFeature('list-ctrl-enter', () => {
    if (!props.isMultiple && props.showList[activeIndex.value]) {
      const current = props.showList[activeIndex.value]
      copyWithSearchFocus(current)
      window.setLock(current.id, true)
      return true
    }
    return false
  })
  registerFeature('list-copy', () => {
    if (props.fullData.data) {
      emit('onMultiCopyExecute', { paste: false, persist: true, exit: true })
      return true
    }
    if (!props.isMultiple && props.showList[activeIndex.value]) {
      copyWithSearchFocus(props.showList[activeIndex.value])
      ElMessage({ message: '复制成功', type: 'success' })
      return true
    }
    return false
  })
  registerFeature('list-collect', () => {
    const targets = props.isMultiple && selectItemList.value.length
      ? [...selectItemList.value]
      : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : []
    targets.forEach((item) => {
      const isCollected = window.db.isCollected(item.id)
      if (props.currentActiveTab === 'collect' || isCollected) window.db.removeCollect(item.id)
      else window.db.addCollect(item.id)
    })
    if (targets.length) {
      ElMessage({ type: 'success', message: props.currentActiveTab === 'collect' ? '已取消收藏选中项' : '已更新收藏状态' })
      emit('onDataRemove')
    }
    return true
  })
  registerFeature('list-lock', () => {
    const targets = props.isMultiple && selectItemList.value.length
      ? [...selectItemList.value]
      : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : []
    if (props.isMultiple && targets.length) {
      preserveSelection()
      const shouldLock = !allSelectedLocked.value
      targets.forEach((item) => {
        const target = window.db.dataBase.data.find((dbItem) => dbItem.id === item.id) || window.db.dataBase.collectData.find((dbItem) => dbItem.id === item.id)
        if (target) { target.locked = shouldLock; item.locked = shouldLock }
      })
      window.db.updateDataBase()
      allSelectedLocked.value = shouldLock
      pendingLockOperations.value = true
      lockUpdateKey.value++
      setTimeout(() => { pendingLockOperations.value = false; if (!props.isMultiple) allSelectedLocked.value = false }, 50)
    } else {
      targets.forEach((item) => window.setLock(item.id, item.locked !== true))
    }
    return true
  })
  registerFeature('list-delete', (e) => {
    if (!getCanDeleteItem(e, false)) return false
    const itemsToDelete = props.isMultiple
      ? (selectItemList.value.length ? [...selectItemList.value] : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : [])
      : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : []
    const deletableItems = itemsToDelete.filter((item) => item.locked !== true)
    const skippedLocked = itemsToDelete.length - deletableItems.length
    if (deletableItems.length) {
      if (props.isMultiple) {
        const toKeep = selectItemList.value.filter((item) => !deletableItems.includes(item))
        selectedItemIds.value = toKeep.map((item) => item.id)
        selectItemList.value = selectItemList.value.filter((item) => !deletableItems.includes(item))
        const highlighted = props.showList[activeIndex.value]
        if (highlighted) {
          pendingHighlightedItemId.value = highlighted.id
          pendingActiveIndexAfterDelete.value = activeIndex.value
        }
      }
      deletableItems.forEach((item, index) =>
        emit('onItemDelete', item, { anchorIndex: activeIndex.value, isBatch: props.isMultiple && deletableItems.length > 1, isLast: index === deletableItems.length - 1, force: false })
      )
    }
    if (skippedLocked > 0) ElMessage({ type: 'info', message: `已跳过锁定 ${skippedLocked} 条，使用 Ctrl+Delete/Ctrl+Backspace 强制删除` })
    return true
  })
  registerFeature('list-force-delete', (e) => {
    const itemsToDelete = props.isMultiple
      ? (selectItemList.value.length ? [...selectItemList.value] : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : [])
      : props.showList[activeIndex.value] ? [props.showList[activeIndex.value]] : []
    if (itemsToDelete.length) {
      if (props.isMultiple) {
        selectItemList.value = selectItemList.value.filter((item) => !itemsToDelete.includes(item))
        itemsToDelete.forEach((item, index) =>
          emit('onItemDelete', item, { anchorIndex: activeIndex.value, isBatch: true, isLast: index === itemsToDelete.length - 1, force: true })
        )
        selectItemList.value = []
        emit('toggleMultiSelect', false)
      } else {
        itemsToDelete.forEach((item, index) =>
          emit('onItemDelete', item, { anchorIndex: activeIndex.value, isBatch: false, isLast: true, force: true })
        )
      }
      return true
    }
    return false
  })
  registerFeature('list-space', () => {
    if (props.isSearchPanelExpand) return false
    if (!props.isMultiple) emit('toggleMultiSelect', true)
    const currentItem = props.showList[activeIndex.value]
    if (!currentItem) return true
    const i = selectItemList.value.findIndex((item) => item === currentItem)
    if (i !== -1) selectItemList.value.splice(i, 1)
    else {
      selectItemList.value.push(currentItem)
      activeIndex.value++
      document.querySelector('.clip-item.multi-active+.clip-item')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
    return true
  })
  registerFeature('list-shift', () => {
    if (props.isMultiple) isShiftDown.value = true
    handleShiftKeyDown()
    return true
  })
  for (let n = 1; n <= 9; n++) {
    registerFeature(`list-quick-copy-${n}`, () => {
      const targetItem = props.showList[n - 1]
      if (targetItem) { copyWithSearchFocus(targetItem); selectItemList.value = []; return true }
      return false
    })
  }
  for (let n = 1; n <= 9; n++) {
    const num = n
    registerFeature(`list-drawer-sub-${num}`, () => {
      const currentItem = props.showList[activeIndex.value]
      if (!currentItem) return false
      openDrawerForCurrentItem(null, num - 1)
      return true
    })
  }
}

const keyUpCallBack = (e) => {
  const { key } = e
  const isShift = key === 'Shift'
  if (isShift) {
    e.preventDefault()
    e.stopPropagation()
    if (props.isMultiple) isShiftDown.value = false
    handleShiftKeyUp()
  }
}

onMounted(() => {
  registerListHotkeyFeatures()
  document.addEventListener('keyup', keyUpCallBack)
})

onUnmounted(() => {
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

  // 清理长文本预览定时器
  if (textPreviewHideTimer) {
    clearTimeout(textPreviewHideTimer)
    textPreviewHideTimer = null
  }
})
</script>

<style lang="less" scoped>
@import '../style';

.text-preview-modal {
  .text-preview-content {
    white-space: pre-wrap;
    word-break: break-word;
    max-height: inherit;
    overflow: auto;
  }
}
</style>
