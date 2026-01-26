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
          <span class="relative-date" :title="new Date(item.updateTime).toLocaleString()">{{
            dateFormat(item.updateTime)
          }}</span>
        </div>
        <div class="clip-data">
          <template v-if="item.type === 'text'">
            <div
              :class="{ 'clip-over-sized-content': isOverSizedContent(item) }"
              :title="item.data"
            >
              {{ item.data.split(`\n`).slice(0, 6).join(`\n`).trim() }}
            </div>
          </template>
          <template v-if="item.type === 'image'">
            <img class="clip-data-image" :src="item.data" alt="Image" />
          </template>
          <template v-if="item.type === 'file'">
            <div
              :class="{ 'clip-over-sized-content': isOverSizedContent(item) }"
              :title="
                JSON.parse(item.data)
                  .map((item) => item.path)
                  .join('\n')
              "
            >
              <FileList :data="JSON.parse(item.data).slice(0, 6)" />
            </div>
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import FileList from './FileList.vue'
import ClipOperate from './ClipOperate.vue'
import { dateFormat } from '../utils'
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
  'onItemDelete'
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
const isShiftDown = ref(false)
const selectItemList = ref([])
const activeIndex = ref(0) // 定义 activeIndex，需要在 defineExpose 之前
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
      // 左键 复制后粘贴
      window.copy(item)
      window.paste()
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
// 父组件中改变了引用类型的地址 故要用 getter返回
watch(
  () => props.showList,
  () => (activeIndex.value = 0)
)

const keyDownCallBack = (e) => {
  const { key, ctrlKey, metaKey, altKey } = e
  const isArrowUp = key === 'ArrowUp' || (ctrlKey && (key === 'K' || key === 'k'))
  const isArrowDown = key === 'ArrowDown' || (ctrlKey && (key === 'J' || key === 'j'))
  const isEnter = key === 'Enter'
  const isCopy = (ctrlKey || metaKey) && (key === 'C' || key === 'c')
  const isNumber = parseInt(key) <= 9 && parseInt(key) >= 0
  const isShift = key === 'Shift'
  const isSpace = key === ' '
  const isDelete = key === 'Delete' || key === 'Backspace'
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
  const canDeleteItem = isDeleteKey && (e.shouldDeleteItem || !isSearchInputFocused || (isSearchInputFocused && searchInput && 
    searchInput.selectionStart === searchInput.selectionEnd && 
    searchInput.selectionStart === searchInput.value.length)) ||
    (isBackspaceKey && !isSearchInputFocused)
  
  if (isDelete && canDeleteItem) {
    // Delete/Backspace: 删除高亮的条目
    if (!props.isMultiple && props.showList[activeIndex.value]) {
      const currentItem = props.showList[activeIndex.value]
      e.preventDefault()
      e.stopPropagation()
      // 触发删除事件，让父组件处理删除逻辑
      emit('onItemDelete', currentItem)
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
          window.copy(props.showList[activeIndex.value])
          ElMessage({
            message: '复制成功',
            type: 'success'
          })
        }
      } else {
        emit('onMultiCopyExecute', false)
      }
    }
  } else if (isEnter) {
    if (!props.isMultiple) {
      if (props.showList[activeIndex.value]) {
        console.log('isEnter')
        window.copy(props.showList[activeIndex.value])
        window.paste()
      }
    } else {
      emit('onMultiCopyExecute', true)
    }
  } else if ((ctrlKey || metaKey || altKey) && isNumber) {
    const targetItem = props.showList[parseInt(key) - 1]
    if (targetItem) {
      window.copy(targetItem)
      window.paste()
      selectItemList.value = []
    }
  } else if (isShift) {
    if (props.isMultiple) {
      isShiftDown.value = true
    }
  } else if (isSpace) {
    if (props.isSearchPanelExpand) {
      // 搜索栏展开状态 不进入多选
      return
    }
    if (!props.isMultiple) {
      emit('toggleMultiSelect') // 如果不是多选状态 则切换到多选状态
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
    if (props.isMultiple) {
      isShiftDown.value = false
    }
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
})
</script>

<style lang="less" scoped>
@import '../style';
</style>
