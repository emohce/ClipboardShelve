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
            {{ activeTab === 'basic' ? '当前 · ' : '' }}存储
          </el-button>
          <el-button
            class="sub-tab-btn"
            :type="activeTab === 'shortcut' ? 'primary' : 'default'"
            :plain="activeTab !== 'shortcut'"
            @click="activeTab = 'shortcut'"
          >
            {{ activeTab === 'shortcut' ? '当前 · ' : '' }}快捷键
          </el-button>
          <el-button
            class="sub-tab-btn"
            :type="activeTab === 'feature' ? 'primary' : 'default'"
            :plain="activeTab !== 'feature'"
            @click="activeTab = 'feature'"
          >
            {{ activeTab === 'feature' ? '当前 · ' : '' }}功能
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
            <div class="shortcut-summary">
              <div class="shortcut-summary-card">
                <span class="shortcut-summary-label">展示规则</span>
                <strong>默认展开</strong>
                <p>首次进入时展开所有层级，优先看到主界面和弹窗层的实际生效快捷键。</p>
              </div>
              <div class="shortcut-summary-card">
                <span class="shortcut-summary-label">说明来源</span>
                <strong>与实现同源</strong>
                <p>说明文本直接来自 `hotkeyBindings.js` 与 `hotkeyLabels.js`，后续功能变更时应同步更新这里的说明。</p>
              </div>
            </div>
            <div class="setting-search-row">
              <el-input
                v-model="shortcutQuery"
                clearable
                placeholder="搜索层级、键位或功能说明"
              />
            </div>
            <div class="filter-chip-row">
              <button
                type="button"
                class="filter-chip"
                :class="{ active: shortcutScope === 'all' }"
                @click="shortcutScope = 'all'"
              >
                全部
              </button>
              <button
                type="button"
                class="filter-chip"
                :class="{ active: shortcutScope === 'main' }"
                @click="shortcutScope = 'main'"
              >
                主界面
              </button>
              <button
                type="button"
                class="filter-chip"
                :class="{ active: shortcutScope === 'dialog' }"
                @click="shortcutScope = 'dialog'"
              >
                弹窗层
              </button>
            </div>
            <el-divider></el-divider>
            <HotkeyTreeView
              :tree-data="filteredHotkeyTreeRoot"
              body-max-height="420px"
              :default-expand-all="true"
            />
          </div>
        </div>
        <div class="sub-tab-content" v-show="activeTab === 'feature'">
          <div class="setting-card-content-item">
            <div class="setting-section-title">展示主页功能</div>
            <div class="shortcut-summary feature-summary">
              <div class="shortcut-summary-card">
                <span class="shortcut-summary-label">来源</span>
                <strong>默认功能与配置同源</strong>
                <p>默认功能标题与图标来自 `src/data/operation.json`，自定义功能来自当前设置数据。</p>
              </div>
              <div class="shortcut-summary-card">
                <span class="shortcut-summary-label">维护约定</span>
                <strong>功能变更同步更新</strong>
                <p>后续你调整功能、标题、命令或匹配范围时，我会同步更新 Settings 展示与说明，保证看到的内容与实际实现一致。</p>
              </div>
            </div>
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
            <div class="setting-search-row">
              <el-input
                v-model="featureQuery"
                clearable
                placeholder="搜索功能标题、类型或命令"
              />
            </div>
            <p v-if="isFeatureFilterActive" class="filter-hint">
              当前处于过滤状态，已禁用拖拽排序，清空搜索后恢复全量排序。
            </p>
            <div class="setting-section-title" style="margin-top: 16px">功能列表</div>
            <p class="shortcut-count">共 {{ filteredFeatureRows.length }} / {{ featureRows.length }} 条</p>
            <el-divider></el-divider>
            <SettingPagedTable
              :rows="filteredFeatureRows"
              :columns="featureColumns"
              :total="filteredFeatureRows.length"
              action-label="操作"
              :action-width="140"
              empty-text="暂无功能数据"
              :show-pagination="false"
              :draggable="!isFeatureFilterActive"
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
const shortcutQuery = ref('')
const featureQuery = ref('')
const shortcutScope = ref('all')

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

const filteredHotkeyTreeRoot = computed(() => {
  const keyword = shortcutQuery.value.trim().toLowerCase()
  const scope = shortcutScope.value
  const scopedRows = (hotkeyTreeRoot.value || []).filter((layerNode) => {
    if (scope === 'all') return true
    if (scope === 'main') return layerNode.layer === 'main'
    return layerNode.layer !== 'main'
  })
  if (!keyword) return scopedRows

  return scopedRows
    .map((layerNode) => {
      const layerLabel = getLayerLabel(layerNode.layer, layerNode.state).toLowerCase()
      const matchedShortcuts = (layerNode.shortcuts || []).filter((shortcut) => {
        const shortcutId = String(shortcut.shortcutId || '').toLowerCase()
        const featureText = (shortcut.features || [])
          .map((feature) => getFeatureLabel(feature))
          .join(' ')
          .toLowerCase()
        return (
          layerLabel.includes(keyword) ||
          shortcutId.includes(keyword) ||
          featureText.includes(keyword)
        )
      })

      if (layerLabel.includes(keyword)) {
        return layerNode
      }
      if (!matchedShortcuts.length) return null
      return { ...layerNode, shortcuts: matchedShortcuts }
    })
    .filter(Boolean)
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

const filteredFeatureRows = computed(() => {
  const keyword = featureQuery.value.trim().toLowerCase()
  if (!keyword) return featureRows.value
  return featureRows.value.filter((row) => {
    return [
      row.title,
      row.typeLabel,
      row.commandDisplay,
      row.id
    ]
      .filter(Boolean)
      .some((field) => String(field).toLowerCase().includes(keyword))
  })
})
const isFeatureFilterActive = computed(() => Boolean(featureQuery.value.trim()))

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
  if (isFeatureFilterActive.value) return false
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
.setting {
  min-height: 100%;
  color: var(--text-color);
  background: var(--bg-color);
}

.setting-card-content {
  padding: 12px 6px 4px;
}
.sub-tab-nav {
  display: flex;
  gap: 8px;
  padding: 4px 0 12px;
  border-bottom: 1px solid var(--border-color);
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
.shortcut-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}
.feature-summary {
  margin: 12px 0 0;
}
.shortcut-summary-card {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
  box-shadow: 0 14px 28px var(--shadow-color);
  strong {
    display: block;
    margin-top: 4px;
    font-size: 15px;
    color: var(--text-color);
  }
  p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-color-lighter);
  }
}
.shortcut-summary-label {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--primary-color);
  background: var(--bg-soft-color);
}
.setting-section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}
.setting-search-row {
  margin-top: 14px;
}
.filter-chip-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}
.filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-elevated-color);
  color: var(--text-color-lighter);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
  &:hover {
    color: var(--text-color);
    border-color: var(--border-color-strong);
    background: var(--nav-hover-bg-color);
  }
  &.active {
    color: var(--primary-color);
    border-color: rgba(53, 95, 157, 0.26);
    background: var(--bg-soft-color);
    font-weight: 600;
  }
}
.filter-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--text-color-lighter);
}
.setting-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: var(--text-color);
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
.setting :deep(.el-card__body) {
  padding: 18px 20px 16px;
}
.setting :deep(.el-divider) {
  border-color: var(--border-color);
}
.setting :deep(.el-input),
.setting :deep(.el-select),
.setting :deep(.el-textarea) {
  --el-border-radius-base: 14px;
  --el-border-radius-small: 12px;
}
.setting :deep(.el-input__wrapper),
.setting :deep(.el-select__wrapper),
.setting :deep(.el-textarea__inner) {
  background: var(--bg-elevated-color);
  box-shadow: 0 0 0 1px var(--border-color) inset;
  border-radius: 14px;
  transition: box-shadow 0.18s ease, background-color 0.18s ease;
}
.setting :deep(.el-input__wrapper:hover),
.setting :deep(.el-select__wrapper:hover),
.setting :deep(.el-textarea__inner:hover) {
  box-shadow: 0 0 0 1px var(--border-color-strong) inset;
}
.setting :deep(.el-input__wrapper.is-focus),
.setting :deep(.el-select__wrapper.is-focused),
.setting :deep(.el-textarea__inner:focus) {
  box-shadow:
    0 0 0 1px var(--primary-color) inset,
    0 0 0 4px rgba(53, 95, 157, 0.10);
}
.setting :deep(.el-input__inner),
.setting :deep(.el-textarea__inner) {
  color: var(--text-color);
}
.setting :deep(.el-input__inner::placeholder),
.setting :deep(.el-textarea__inner::placeholder) {
  color: var(--text-color-lighter);
}
.setting :deep(.el-card) {
  background: var(--bg-elevated-color);
  border-color: var(--border-color);
  border-radius: 20px;
  box-shadow: 0 20px 40px var(--shadow-color);
}
.setting :deep(.el-button:not(.is-link)) {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 12px;
  border-color: var(--border-color);
  background: var(--bg-elevated-color);
  color: var(--text-color);
  transition: all 0.18s ease;
}
.setting :deep(.el-button:not(.is-link):hover) {
  border-color: var(--border-color-strong);
  background: var(--nav-hover-bg-color);
  color: var(--text-color);
}
.setting :deep(.el-button.is-plain) {
  background: var(--bg-elevated-color);
}
.setting :deep(.el-button--primary) {
  border-color: var(--primary-color);
  background: var(--primary-color);
  color: #fff;
  box-shadow: 0 12px 24px rgba(53, 95, 157, 0.18);
}
.setting :deep(.el-button--primary:hover) {
  border-color: var(--primary-color-lighter);
  background: var(--primary-color-lighter);
  color: #fff;
}
.setting :deep(.el-button.is-link) {
  color: var(--primary-color);
}
.setting :deep(.el-button.is-link:hover) {
  color: var(--primary-color-lighter);
}
.setting :deep(.el-pagination) {
  --el-pagination-bg-color: var(--bg-elevated-color);
  --el-pagination-text-color: var(--text-color-lighter);
  --el-pagination-button-color: var(--text-color);
  --el-pagination-button-disabled-color: var(--text-color-lighter);
  --el-pagination-button-disabled-bg-color: var(--bg-soft-color);
  --el-pagination-hover-color: var(--primary-color);
}
.setting :deep(.el-pagination .btn-prev),
.setting :deep(.el-pagination .btn-next),
.setting :deep(.el-pagination .el-pager li) {
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
}
.setting :deep(.el-pagination .el-pager li:hover),
.setting :deep(.el-pagination .btn-prev:hover),
.setting :deep(.el-pagination .btn-next:hover) {
  border-color: var(--border-color-strong);
  background: var(--nav-hover-bg-color);
}
.setting :deep(.el-pagination .el-pager li.is-active) {
  border-color: var(--primary-color);
  background: rgba(53, 95, 157, 0.12);
  color: var(--primary-color);
}
.setting :deep(.el-dialog) {
  border-radius: 22px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
  box-shadow: 0 28px 60px var(--shadow-color);
}
.setting :deep(.el-dialog__header) {
  padding: 20px 24px 0;
}
.setting :deep(.el-dialog__title) {
  color: var(--text-color);
  font-weight: 600;
}
.setting :deep(.el-dialog__footer) {
  padding: 8px 24px 24px;
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

@media (max-width: 900px) {
  .shortcut-summary {
    grid-template-columns: 1fr;
  }
}
</style>
