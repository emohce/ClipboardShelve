<template>
  <div class="setting-paged-table">
    <el-pagination
      v-if="showTopPager && showPagination"
      class="table-pagination table-pagination-top"
      background
      :layout="topPagerLayout"
      :total="total"
      :page-size="pageSize"
      :current-page="page"
      @current-change="handlePageChange"
    />
    <div class="table-header">
      <div
        v-for="col in columns"
        :key="col.key"
        class="table-cell"
        :style="colStyle(col)"
      >
        {{ col.label }}
      </div>
      <div
        v-if="showActions"
        class="table-cell table-action-cell"
        :style="{ width: actionWidthStyle }"
      >
        {{ actionLabel }}
      </div>
    </div>

    <div v-if="!displayRows.length" class="table-empty">{{ emptyText }}</div>

    <draggable
      v-else-if="draggable"
      v-model="localRows"
      item-key="id"
      class="table-body"
      :style="bodyStyle"
      :handle="dragHandle"
      :move="handleMove"
      @end="handleDragEnd"
    >
      <template #item="{ element, index }">
        <div class="table-row">
          <div
            v-for="col in columns"
            :key="col.key"
            class="table-cell"
            :style="colStyle(col)"
          >
            <slot :name="`cell-${col.key}`" :row="element" :index="index">
              {{ formatCell(element, col) }}
            </slot>
          </div>
          <div
            v-if="showActions"
            class="table-cell table-action-cell"
            :style="{ width: actionWidthStyle }"
          >
            <slot name="actions" :row="element" :index="index" />
          </div>
        </div>
      </template>
    </draggable>

    <div v-else class="table-body" :style="bodyStyle">
      <div v-for="(row, index) in displayRows" :key="row[rowKey] ?? index" class="table-row">
        <div
          v-for="col in columns"
          :key="col.key"
          class="table-cell"
          :style="colStyle(col)"
        >
          <slot :name="`cell-${col.key}`" :row="row" :index="index">
            {{ formatCell(row, col) }}
          </slot>
        </div>
        <div
          v-if="showActions"
          class="table-cell table-action-cell"
          :style="{ width: actionWidthStyle }"
        >
          <slot name="actions" :row="row" :index="index" />
        </div>
      </div>
    </div>

    <el-pagination
      v-if="showBottomPager && showPagination"
      class="table-pagination"
      background
      layout="total, sizes, prev, pager, next"
      :total="total"
      :page-sizes="pageSizes"
      :page-size="pageSize"
      :current-page="page"
      @size-change="handleSizeChange"
      @current-change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import draggable from 'vuedraggable'

const props = defineProps({
  rows: {
    type: Array,
    default: () => []
  },
  columns: {
    type: Array,
    default: () => []
  },
  rowKey: {
    type: String,
    default: 'id'
  },
  total: {
    type: Number,
    default: 0
  },
  page: {
    type: Number,
    default: 1
  },
  pageSize: {
    type: Number,
    default: 10
  },
  pageSizes: {
    type: Array,
    default: () => [10, 30, 50]
  },
  emptyText: {
    type: String,
    default: '暂无数据'
  },
  showTopPager: {
    type: Boolean,
    default: false
  },
  topPagerLayout: {
    type: String,
    default: 'prev, next'
  },
  showBottomPager: {
    type: Boolean,
    default: true
  },
  showPagination: {
    type: Boolean,
    default: true
  },
  bodyMaxHeight: {
    type: [Number, String],
    default: ''
  },
  showActions: {
    type: Boolean,
    default: true
  },
  actionLabel: {
    type: String,
    default: '操作'
  },
  actionWidth: {
    type: [Number, String],
    default: 140
  },
  draggable: {
    type: Boolean,
    default: false
  },
  dragHandle: {
    type: String,
    default: '.drag-handle'
  },
  moveGuard: {
    type: Function,
    default: null
  }
})

const emit = defineEmits(['update:page', 'update:pageSize', 'drag-end'])

const localRows = ref([])
const displayRows = computed(() => (props.draggable ? localRows.value : props.rows))

const bodyStyle = computed(() => {
  if (!props.bodyMaxHeight) return null
  const height = typeof props.bodyMaxHeight === 'number' ? `${props.bodyMaxHeight}px` : props.bodyMaxHeight
  return { maxHeight: height, overflowY: 'auto' }
})

watch(
  () => props.rows,
  (val) => {
    localRows.value = Array.isArray(val) ? val.map((row) => row) : []
  },
  { immediate: true }
)

const actionWidthStyle = computed(() => {
  if (typeof props.actionWidth === 'number') return `${props.actionWidth}px`
  return props.actionWidth
})

function colStyle(col) {
  const style = { textAlign: col.align || 'left' }
  if (col.width) {
    style.width = typeof col.width === 'number' ? `${col.width}px` : col.width
    style.flex = '0 0 auto'
  } else if (col.minWidth) {
    style.minWidth = typeof col.minWidth === 'number' ? `${col.minWidth}px` : col.minWidth
    style.flex = '1 1 0'
  } else {
    style.flex = '1 1 0'
  }
  return style
}

function formatCell(row, col) {
  const val = row?.[col.key]
  return val === '' || val === undefined || val === null ? '-' : val
}

function handleSizeChange(size) {
  emit('update:pageSize', size)
  emit('update:page', 1)
}

function handlePageChange(page) {
  emit('update:page', page)
}

function handleMove(evt) {
  if (typeof props.moveGuard === 'function') {
    return props.moveGuard(evt)
  }
  return true
}

function handleDragEnd(evt) {
  emit('drag-end', { rows: localRows.value.slice(), oldIndex: evt?.oldIndex, newIndex: evt?.newIndex })
}
</script>

<style lang="less" scoped>
.setting-paged-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-header,
.table-row {
  display: flex;
  align-items: center;
}

.table-header {
  border: 1px solid var(--text-bg-color-lighter);
  border-bottom: none;
  background: var(--text-bg-color);
  font-weight: 600;
}

.table-body {
  border: 1px solid var(--text-bg-color-lighter);
  border-top: none;
}

.table-row {
  border-bottom: 1px solid var(--text-bg-color-lighter);
}

.table-row:last-child {
  border-bottom: none;
}

.table-cell {
  padding: 8px 10px;
  border-right: 1px solid var(--text-bg-color-lighter);
  display: flex;
  align-items: center;
  gap: 6px;
}

.table-cell:last-child {
  border-right: none;
}

.table-action-cell {
  justify-content: flex-end;
  text-align: right;
}

.table-empty {
  border: 1px solid var(--text-bg-color-lighter);
  padding: 16px;
  text-align: center;
  color: var(--text-color-lighter);
}

.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin: 4px 0 0;
}
.table-pagination-top {
  justify-content: space-between;
}
</style>
