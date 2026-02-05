<template>
  <div class="setting">
    <el-card class="setting-card">
      <div class="setting-card-content">
        <div class="sub-tab-nav">
          <el-button
            class="sub-tab-btn"
            :type="activeTab === 'basic' ? 'primary' : 'default'"
            :plain="activeTab !== 'basic'"
            @click="activeTab = 'basic'"
          >
            {{ activeTab === 'basic' ? '✅ ' : '' }}存储
          </el-button>
          <el-button
            class="sub-tab-btn"
            :type="activeTab === 'shortcut' ? 'primary' : 'default'"
            :plain="activeTab !== 'shortcut'"
            @click="activeTab = 'shortcut'"
          >
            {{ activeTab === 'shortcut' ? '✅ ' : '' }}快捷键
          </el-button>
          <el-button
            class="sub-tab-btn"
            :type="activeTab === 'feature' ? 'primary' : 'default'"
            :plain="activeTab !== 'feature'"
            @click="activeTab = 'feature'"
          >
            {{ activeTab === 'feature' ? '✅ ' : '' }}功能
          </el-button>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'basic'">
          <div class="setting-card-content-item">
            <div class="setting-section-title">存储</div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span>存储位置</span>
              <el-input class="path" v-model="path" :title="path" disabled></el-input>
              <el-button type="primary" @click="handlePathBtnClick('modify')">修改</el-button>
              <el-button @click="handlePathBtnClick('open')" v-show="path">打开</el-button>
              <input type="file" id="database-path" :style="{ display: 'none' }" />
            </div>
            <div class="setting-row">
              <span>最大历史条数</span>
              <el-select class="number-select" v-model="maxsize" fit-input-width placeholder="">
                <el-option label="无限" :value="unlimitedVal" />
                <el-option v-for="n in [500, 1000, 5000, 50000]" :key="n" :value="n" />
              </el-select>
              条
            </div>
            <div class="setting-row">
              <span>保存时间</span>
              <el-select class="number-select" v-model="maxage" fit-input-width placeholder="">
                <el-option label="无限" :value="unlimitedVal" />
                <el-option v-for="n in [1, 5, 7, 15, 30, 60, 90, 360]" :key="n" :value="n" />
              </el-select>
              天
            </div>
          </div>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'shortcut'">
          <div class="setting-card-content-item">
            <div class="setting-section-title">当前快捷键列表</div>
            <p class="shortcut-count">共 {{ shortcutCount }} 条快捷键</p>
            <el-divider></el-divider>
            <HotkeyTreeView
              :tree-data="hotkeyTreeRoot"
              body-max-height="420px"
            />
          </div>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'feature'">
          <div class="setting-card-content-item">
            <div class="setting-section-title">展示主页功能</div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span style="width: 70px">可多选: </span>
              <el-select
                class="operation-select"
                v-model="shown"
                multiple
                :multiple-limit="9"
                placeholder="请选择"
              >
                <el-option
                  v-for="o in allOperations"
                  :key="o.id"
                  :label="`${o.index}. ${o.icon} ${o.title}`"
                  :value="o.id"
                />
              </el-select>
            </div>
            <div class="setting-section-title" style="margin-top: 16px">功能列表</div>
            <p class="shortcut-count">共 {{ featureRows.length }} 条</p>
            <el-divider></el-divider>
            <SettingPagedTable
              :rows="featureRows"
              :columns="featureColumns"
              :total="featureRows.length"
              action-label="操作"
              :action-width="140"
              empty-text="暂无功能数据"
              :show-pagination="false"
              :draggable="true"
              :move-guard="allowFeatureDrag"
              body-max-height="420px"
              @drag-end="handleFeatureDragEnd"
            >
              <template #cell-drag="{ row }">
                <span class="drag-handle" title="拖拽排序">⋮⋮</span>
              </template>
              <template #cell-title="{ row }">
                <span class="feature-icon">{{ row.icon }}</span>
                <span class="feature-title">{{ row.title }}</span>
              </template>
              <template #cell-commandDisplay="{ row }">
                <span>{{ row.commandDisplay || '-' }}</span>
              </template>
              <template #actions="{ row }">
                <template v-if="row.isCustom">
                  <el-button link type="primary" size="small" @click="openCustomEdit(row.raw)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteCustom(row.raw)">删除</el-button>
                </template>
                <span v-else class="table-action-empty">-</span>
              </template>
            </SettingPagedTable>
            <el-button class="feature-add-btn" type="primary" plain @click="openCustomAdd">新增</el-button>
            <el-dialog
              v-model="customDialogVisible"
              :title="customDialogMode === 'add' ? '新增功能' : '编辑功能'"
              :fullscreen="true"
              :close-on-click-modal="false"
              class="feature-dialog"
              @closed="customFormRef?.resetFields?.()"
            >
              <el-form
                ref="customFormRef"
                class="feature-form"
                :model="customForm"
                :rules="customFormRules"
                label-width="90px"
              >
                <el-form-item label="标题" prop="title">
                  <el-input v-model="customForm.title" placeholder="功能标题" />
                </el-form-item>
                <el-form-item label="图标" prop="icon">
                  <el-input v-model="customForm.icon" placeholder="如 📌" maxlength="4" show-word-limit />
                </el-form-item>
                <el-form-item label="匹配" prop="matchStr">
                  <el-input v-model="customForm.matchStr" type="textarea" :rows="6" placeholder='JSON 数组，如 ["text","image"]' />
                </el-form-item>
                <el-form-item label="命令" prop="command">
                  <el-input v-model="customForm.command" placeholder="如 redirect:插件名" />
                </el-form-item>
              </el-form>
              <template #footer>
                <el-button @click="customDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="submitCustomForm">确定</el-button>
              </template>
            </el-dialog>
          </div>
        </div>
      </div>
      <div class="setting-card-footer">
        <el-button @click="handleRestoreBtnClick">重置</el-button>
        <el-button @click="emit('back')">返回</el-button>
        <el-button @click="handleSaveBtnClick" type="primary">保存</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import setting from '../global/readSetting'
import restoreSetting from '../global/restoreSetting'
import defaultOperation from '../data/operation.json'
import { getEffectiveBindings } from '../global/hotkeyBindings'
import { getLayerLabel, getFeatureLabel } from '../global/hotkeyLabels'
import { buildHotkeyTree } from '../global/hotkeyGraph'
import { getNativeId } from '../utils'
import SettingPagedTable from '../cpns/SettingPagedTable.vue'
import HotkeyTreeView from '../cpns/HotkeyTreeView.vue'

const emit = defineEmits(['back'])
const { database, operation } = setting
const nativeId = getNativeId()

const unlimitedVal = 'unlimited'
const path = ref(database.path[nativeId])
const maxsize = ref(database.maxsize ?? unlimitedVal)
const maxage = ref(database.maxage ?? unlimitedVal)

const custom = ref(operation.custom.map((c) => ({ ...c })))
const hotkeyOverrides = ref({ ...(setting.hotkeyOverrides || {}) })

const activeTab = ref('basic')

function sortShownByOrder(shownIds, order) {
  const orderMap = new Map(order.map((id, idx) => [id, idx]))
  return (Array.isArray(shownIds) ? shownIds.filter((id) => orderMap.has(id)) : []).sort(
    (a, b) => orderMap.get(a) - orderMap.get(b)
  )
}

const defaultOperationIds = defaultOperation.map((o) => o.id)

function buildFeatureOrder(savedOrder, customIds) {
  const allowed = new Set([...defaultOperationIds, ...customIds])
  const base = Array.isArray(savedOrder) ? savedOrder.filter((id) => allowed.has(id)) : []
  const rest = [...defaultOperationIds, ...customIds].filter((id) => !base.includes(id))
  return [...base, ...rest]
}

const featureOrder = ref(buildFeatureOrder(setting.operation?.order, custom.value.map((c) => c.id)))
const shown = ref(sortShownByOrder(operation.shown, featureOrder.value))
const hotkeyTreeRoot = computed(() => {
  const bindings = getEffectiveBindings()
  return buildHotkeyTree(bindings)
})

const shortcutCount = computed(() => {
  if (!Array.isArray(hotkeyTreeRoot.value)) return 0
  return hotkeyTreeRoot.value.reduce((total, layerNode) => {
    return total + (layerNode.shortcuts ? layerNode.shortcuts.length : 0)
  }, 0)
})

const customDialogVisible = ref(false)
const customDialogMode = ref('add')
const customFormRef = ref(null)
const customForm = ref({
  id: '',
  title: '',
  icon: '📌',
  matchStr: '["text"]',
  command: ''
})
const customFormRules = {
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  icon: [{ required: true, message: '请输入图标', trigger: 'blur' }],
  command: [{ required: true, message: '请输入命令', trigger: 'blur' }]
}
const customEditId = ref('')

const featureColumns = [
  { key: 'index', label: '序号', width: 70, align: 'center' },
  { key: 'drag', label: '', width: 40, align: 'center' },
  { key: 'typeLabel', label: '类型', width: 90 },
  { key: 'title', label: '功能', minWidth: 200 },
  { key: 'commandDisplay', label: '操作记录', minWidth: 220 }
]

const featureRows = computed(() => {
  const defaults = defaultOperation.map((o) => ({
    id: o.id,
    title: o.title,
    icon: o.icon,
    typeLabel: '默认',
    isCustom: false,
    matchDisplay: '',
    commandDisplay: '',
    raw: o
  }))
  const customs = custom.value.map((o) => ({
    id: o.id,
    title: o.title,
    icon: o.icon,
    typeLabel: '自定义',
    isCustom: true,
    matchDisplay: Array.isArray(o.match) ? o.match.join(', ') : '',
    commandDisplay: o.command || '',
    raw: o
  }))
  const map = new Map([...defaults, ...customs].map((item) => [item.id, item]))
  return featureOrder.value
    .map((id, idx) => {
      const item = map.get(id)
      if (!item) return null
      return { ...item, index: idx + 1 }
    })
    .filter(Boolean)
})

const orderedOperations = computed(() =>
  featureRows.value.map((row) => ({ id: row.id, title: row.title, icon: row.icon, index: row.index }))
)

const allOperations = computed(() => orderedOperations.value)

function syncShownOrder() {
  const sorted = sortShownByOrder(shown.value, featureOrder.value)
  const changed = sorted.length !== shown.value.length || sorted.some((id, idx) => id !== shown.value[idx])
  if (changed) shown.value = sorted
}

function allowFeatureDrag(evt) {
  return true
}

function handleFeatureDragEnd({ rows }) {
  if (!Array.isArray(rows) || !rows.length) return
  featureOrder.value = rows.map((row) => row.id)
  custom.value = rows.filter((row) => row.isCustom).map((row) => row.raw)
  syncShownOrder()
}

function openCustomAdd() {
  customDialogMode.value = 'add'
  customForm.value = {
    id: '',
    title: '',
    icon: '📌',
    matchStr: '["text"]',
    command: ''
  }
  customEditId.value = ''
  customDialogVisible.value = true
}

function openCustomEdit(item) {
  customDialogMode.value = 'edit'
  customEditId.value = item.id
  customForm.value = {
    id: item.id,
    title: item.title,
    icon: item.icon,
    matchStr: Array.isArray(item.match) ? JSON.stringify(item.match, null, 2) : '[]',
    command: item.command || ''
  }
  customDialogVisible.value = true
}

function parseMatch(str) {
  if (!str || typeof str !== 'string') return []
  const s = str.trim()
  if (!s) return []
  try {
    const v = JSON.parse(s)
    return Array.isArray(v) ? v : []
  } catch (_) {
    return []
  }
}

function submitCustomForm() {
  customFormRef.value?.validate?.((valid) => {
    if (!valid) return
    const match = parseMatch(customForm.value.matchStr)
    const payload = {
      id: customForm.value.id || `custom.${Date.now()}`,
      title: customForm.value.title.trim(),
      icon: (customForm.value.icon || '📌').trim(),
      match,
      command: (customForm.value.command || '').trim()
    }
    if (customDialogMode.value === 'add') {
      custom.value.push(payload)
    } else {
      const idx = custom.value.findIndex((c) => c.id === customEditId.value)
      if (idx !== -1) custom.value.splice(idx, 1, payload)
    }
    customDialogVisible.value = false
    ElMessage.success('已更新，保存后生效')
  })
}

function deleteCustom(item) {
  ElMessageBox.confirm(`确定删除「${item.title}」吗？`, '删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      custom.value = custom.value.filter((c) => c.id !== item.id)
      if (shown.value.includes(item.id)) {
        shown.value = shown.value.filter((id) => id !== item.id)
      }
      ElMessage.success('已删除，保存后生效')
    })
    .catch(() => {})
}

watch(
  () => custom.value.map((c) => c.id),
  (ids) => {
    featureOrder.value = buildFeatureOrder(featureOrder.value, ids)
    syncShownOrder()
  }
)

watch(
  () => featureOrder.value,
  () => {
    syncShownOrder()
  },
  { deep: true }
)

function validateCustom() {
  for (const c of custom.value) {
    if (!c.id || !c.title || !c.icon) {
      ElMessage.error('自定义功能项须包含 id、标题、图标')
      return false
    }
  }
  return true
}

const handleSaveBtnClick = () => {
  if (path.value === '') {
    ElMessage.error('数据库路径不能为空')
    return
  }
  if (path.value.indexOf('_utools_clipboard_manager_storage') === -1) {
    ElMessage.error('数据库路径不正确')
    return
  }
  if (!validateCustom()) return

  const payload = {
    database: {
      path: { ...database.path, [nativeId]: path.value },
      maxsize: maxsize.value === unlimitedVal ? null : maxsize.value,
      maxage: maxage.value === unlimitedVal ? null : maxage.value
    },
    operation: {
      shown: shown.value,
      custom: custom.value,
      order: featureOrder.value
    },
    hotkeyOverrides: hotkeyOverrides.value
  }
  utools.dbStorage.setItem('setting', JSON.parse(JSON.stringify(payload)))
  ElMessage.success('保存成功 重启插件生效')
}

const handlePathBtnClick = (param) => {
  if (param === 'modify') {
    const file = document.getElementById('database-path')
    file.click()
    file.onchange = (e) => {
      const { files } = e.target
      if (files.length > 0) {
        path.value = files[0].path
      }
      handleSaveBtnClick()
    }
  } else if (param === 'open') {
    utools.shellShowItemInFolder(path.value)
  }
}

const handleRestoreBtnClick = () => {
  ElMessageBox.confirm('确定要重置设置吗', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      const restored = restoreSetting()
      path.value = restored.database.path[nativeId]
      maxsize.value = restored.database.maxsize ?? unlimitedVal
      maxage.value = restored.database.maxage ?? unlimitedVal
      shown.value = sortShownByOrder(restored.operation?.shown || [], featureOrder.value)
      custom.value = (restored.operation?.custom || []).map((c) => ({ ...c }))
      featureOrder.value = buildFeatureOrder(restored.operation?.order, custom.value.map((c) => c.id))
      syncShownOrder()
      hotkeyOverrides.value = { ...(restored.hotkeyOverrides || {}) }
      ElMessage.success('重置成功 重启插件生效')
    })
    .catch(() => {})
}

const keyDownHandler = (e) => {
  if (e.key === 'Escape' && !customDialogVisible.value) {
    emit('back')
    e.stopPropagation()
  }
}

onMounted(() => {
  document.addEventListener('keydown', keyDownHandler)
})

onUnmounted(() => {
  document.removeEventListener('keydown', keyDownHandler)
})
</script>

<style lang="less" scoped>
@media (prefers-color-scheme: dark) {
  .setting {
    --primary-color: #448bd2;
    --primary-color-lighter: #4997e1;
    --text-color: #e8e6e3;
    --text-color-lighter: rgb(181, 181, 181);
    --text-bg-color: #656565;
    --text-bg-color-lighter: #4e4e4e;
    --nav-bg-color: #222426;
    --nav-hover-bg-color: #2b2e30;
    --bg-color: #181a1b;
  }
}

@media (prefers-color-scheme: light) {
  .setting {
    --primary-color: #3271ae;
    --primary-color-lighter: #4997e1;
    --text-color: #333;
    --text-color-lighter: rgb(138, 138, 138);
    --text-bg-color: #f2f2f2;
    --text-bg-color-lighter: #eeeaf3;
    --nav-bg-color: #eeeeee;
    --nav-hover-bg-color: #dedede;
    --bg-color: #fff;
  }
}

@primary-color: var(--primary-color);
@text-color: var(--text-color);
@text-bg-color: var(--text-bg-color);
@text-bg-color-lighter: var(--text-bg-color-lighter);

.setting-card-content {
  padding: 12px 6px 4px;
}
.sub-tab-nav {
  display: flex;
  gap: 8px;
  padding: 4px 0 12px;
  border-bottom: 1px solid var(--text-bg-color-lighter);
}
.sub-tab-btn {
  font-size: 14px;
}
.sub-tab-content {
  padding: 16px 12px;
  min-height: 280px;
}
.shortcut-count {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-color-lighter);
}
.setting-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #2b2f3a;
}
.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}
.path {
  flex: 1;
}
.number-select {
  width: 110px;
}
.operation-select {
  min-width: 240px;
}

.shortcut-key-cell {
  padding: 4px 8px;
  background: var(--text-bg-color);
  border: 1px solid var(--text-bg-color-lighter);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary-color);
}
.shortcut-desc-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}
.drag-handle {
  cursor: grab;
  color: var(--text-color-lighter);
  font-size: 14px;
  user-select: none;
}
.feature-icon {
  font-size: 18px;
}
.feature-title {
  flex: 1;
  font-size: 14px;
}
.feature-add-btn {
  align-self: flex-start;
  margin-top: 10px;
}
.table-action-empty {
  color: var(--text-color-lighter);
}
.feature-dialog :deep(.el-dialog__body) {
  padding: 24px 32px 12px;
}
.feature-form {
  max-width: 760px;
  margin: 0 auto;
}
.feature-form :deep(.el-form-item) {
  margin-bottom: 18px;
}
.feature-form :deep(.el-textarea__inner) {
  min-height: 200px;
}
</style>
