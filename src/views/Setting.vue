<template>
  <div class="setting">
    <el-card class="setting-card">
      <div class="setting-card-content">
        <div class="sub-tab-nav">
          <el-button
            class="sub-tab-btn"
            :class="{ 'is-current': activeTab === 'basic' }"
            @click="activeTab = 'basic'"
          >
            存储
          </el-button>
          <el-button
            class="sub-tab-btn"
            :class="{ 'is-current': activeTab === 'shortcut' }"
            @click="activeTab = 'shortcut'"
          >
            快捷键
          </el-button>
          <el-button
            class="sub-tab-btn"
            :class="{ 'is-current': activeTab === 'feature' }"
            @click="activeTab = 'feature'"
          >
            功能
          </el-button>
          <el-button
            class="sub-tab-btn"
            :class="{ 'is-current': activeTab === 'feature-config' }"
            @click="activeTab = 'feature-config'"
          >
            功能配置
          </el-button>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'basic'">
          <div class="setting-card-content-item">
            <div class="setting-section-title">存储</div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span class="setting-label">存储位置</span>
              <el-input class="path" v-model="path" :title="path" disabled></el-input>
              <el-button type="primary" @click="handlePathBtnClick('modify')">修改</el-button>
              <el-button @click="handlePathBtnClick('open')" v-show="path">打开</el-button>
              <input type="file" id="database-path" :style="{ display: 'none' }" />
            </div>
            <div class="setting-row">
              <span class="setting-label">最大历史条数</span>
              <el-select class="number-select" v-model="maxsize" fit-input-width placeholder="">
                <el-option label="无限" :value="unlimitedVal" />
                <el-option v-for="n in [500, 1000, 5000, 50000]" :key="n" :value="n" />
              </el-select>
              <span class="setting-unit">条</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">保存时间</span>
              <el-select class="number-select" v-model="maxage" fit-input-width placeholder="">
                <el-option label="无限" :value="unlimitedVal" />
                <el-option v-for="n in [1, 5, 7, 15, 30, 60, 90, 360]" :key="n" :value="n" />
              </el-select>
              <span class="setting-unit">天</span>
            </div>
          </div>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'shortcut'">
          <div class="setting-card-content-item">
            <div class="setting-section-head">
              <div class="setting-section-title">当前快捷键列表</div>
              <HelpHint
                marker="!"
                button-class="setting-help-btn"
                aria-label="查看快捷键列表说明"
                content="默认展开实际生效的快捷键；说明文本与实现同源。输入关键词后按 Enter 搜索，Ctrl/Cmd+F 可快速定位到搜索框，也可搜索 Ctrl/Cmd+Shift+U 查看有锁条件搜索切换。"
              />
            </div>
            <p class="shortcut-count">共 {{ shortcutCount }} 条快捷键</p>
            <div class="setting-search-row">
              <el-input
                ref="shortcutSearchInputRef"
                v-model="shortcutQueryInput"
                clearable
                placeholder="搜索层级、键位或功能说明"
                @clear="applyShortcutSearch"
                @keydown.enter.prevent="applyShortcutSearch"
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
              :default-expand-all="false"
            />
          </div>
        </div>
        <div class="sub-tab-content" v-show="activeTab === 'feature'">
          <div class="setting-card-content-item">
            <div class="setting-section-head">
              <div class="setting-section-title">展示主页功能</div>
              <HelpHint
                marker="!"
                button-class="setting-help-btn"
                aria-label="查看功能列表说明"
                content="默认功能标题与图标来自 src/data/operation.json，自定义功能来自当前设置数据。后续调整功能、标题、命令或匹配范围时，应同步更新 Settings 展示与说明。"
              />
            </div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span class="setting-label">可多选</span>
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
        <div class="sub-tab-content" v-show="activeTab === 'feature-config'">
          <div class="setting-card-content-item">
            <div class="setting-section-head">
              <div class="setting-section-title">预览配置</div>
              <HelpHint
                marker="!"
                button-class="setting-help-btn"
                aria-label="查看预览配置说明"
                content="保存后当前窗口会立即同步，无需重启插件；配置存储路径：userConfig.preview.hover"
              />
            </div>
            <el-divider></el-divider>
            <div class="feature-config-panel">
              <div class="feature-config-row">
                <div class="feature-config-meta">
                  <div class="feature-config-title-row">
                    <strong>启用鼠标悬浮预览</strong>
                    <HelpHint
                      aria-label="查看悬浮预览说明"
                      content="关闭后，列表项悬浮不再触发图片或长文本预览；Shift 长按预览不受影响"
                    />
                  </div>
                </div>
                <div class="feature-config-control">
                  <div class="feature-config-inline-row">
                    <div
                      class="feature-config-input inline"
                      :class="{ 'is-hidden': !hoverPreviewEnabled }"
                    >
                      <span class="feature-config-inline-label">触发时间</span>
                      <input
                        v-model.number="hoverPreviewDelay"
                        class="feature-config-native-input"
                        type="number"
                        :min="0"
                        :max="5000"
                        :step="50"
                        :disabled="!hoverPreviewEnabled"
                        :tabindex="hoverPreviewEnabled ? 0 : -1"
                      >
                      <span class="feature-config-unit">ms</span>
                    </div>
                  </div>
                  <div class="feature-toggle-group is-fixed-right">
                    <button
                      type="button"
                      class="toggle-pill"
                      :class="{ 'is-on': hoverPreviewEnabled, 'is-off': !hoverPreviewEnabled }"
                      :aria-pressed="hoverPreviewEnabled"
                      @click="toggleHoverPreview"
                    >
                      <span class="toggle-pill-track">
                        <span class="toggle-pill-knob"></span>
                      </span>
                      <span class="toggle-pill-text">{{ hoverPreviewEnabled ? '开' : '关' }}</span>
                    </button>
                    <HelpHint
                      aria-label="查看开关说明"
                      content="绿色表示已启用悬浮预览，红色表示已禁用；点击按钮可直接切换状态"
                    />
                  </div>
                </div>
              </div>
            </div>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import setting, { saveSetting, syncSetting, getHoverPreviewConfig } from '../global/readSetting'
import restoreSetting from '../global/restoreSetting'
import defaultOperation from '../data/operation.json'
import { getEffectiveBindings } from '../global/hotkeyBindings'
import { activateLayer, deactivateLayer } from '../global/hotkeyLayers'
import { getLayerLabel, getFeatureLabel } from '../global/hotkeyLabels'
import { buildHotkeyTree } from '../global/hotkeyGraph'
import { getNativeId } from '../utils'
import SettingPagedTable from '../cpns/SettingPagedTable.vue'
import HotkeyTreeView from '../cpns/HotkeyTreeView.vue'
import HelpHint from '../cpns/HelpHint.vue'

const emit = defineEmits(['back'])
const { database, operation } = setting
const nativeId = getNativeId()

const unlimitedVal = 'unlimited'
const path = ref(database.path[nativeId])
const maxsize = ref(database.maxsize ?? unlimitedVal)
const maxage = ref(database.maxage ?? unlimitedVal)

const custom = ref(operation.custom.map((c) => ({ ...c })))
const hotkeyOverrides = ref({ ...(setting.hotkeyOverrides || {}) })
const initialHoverPreviewConfig = getHoverPreviewConfig(setting)
const hoverPreviewEnabled = ref(initialHoverPreviewConfig.enabled)
const hoverPreviewDelay = ref(initialHoverPreviewConfig.delay)

const activeTab = ref('basic')
const settingTabs = ['basic', 'shortcut', 'feature', 'feature-config']
const shortcutQuery = ref('')
const shortcutQueryInput = ref('')
const featureQuery = ref('')
const shortcutScope = ref('all')
const shortcutSearchInputRef = ref(null)

function isEditableTarget(target) {
  if (!target || typeof target.closest !== 'function') return false
  if (target.isContentEditable) return true
  return Boolean(
    target.closest(
      'input, textarea, [contenteditable="true"], .el-input, .el-textarea, .el-select, .el-input-number'
    )
  )
}

function switchSettingTabByOffset(delta) {
  const index = settingTabs.indexOf(activeTab.value)
  if (index === -1 || settingTabs.length === 0) return false
  const nextIndex = (index + delta + settingTabs.length) % settingTabs.length
  activeTab.value = settingTabs[nextIndex]
  return true
}

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
        const shortcutId = (shortcut.shortcutIds || [])
          .map((id) => String(id || '').toLowerCase())
          .join(' ')
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

function applyShortcutSearch() {
  shortcutQuery.value = shortcutQueryInput.value.trim()
}

function focusShortcutSearch() {
  nextTick(() => {
    shortcutSearchInputRef.value?.focus?.()
  })
}

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

function normalizeHoverPreviewDelay(value = hoverPreviewDelay.value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0) return 500
  return Math.round(numeric)
}

function ensureHoverPreviewDelay() {
  hoverPreviewDelay.value = normalizeHoverPreviewDelay()
}

function toggleHoverPreview() {
  if (!hoverPreviewEnabled.value) {
    ensureHoverPreviewDelay()
  }
  hoverPreviewEnabled.value = !hoverPreviewEnabled.value
}

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

function validateFeatureConfig() {
  if (!hoverPreviewEnabled.value) return true
  const delay = Number(hoverPreviewDelay.value)
  if (!Number.isFinite(delay) || delay < 0) {
    ElMessage.error('预览触发时间需为不小于 0 的数字')
    return false
  }
  hoverPreviewDelay.value = Math.round(delay)
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
  if (!validateFeatureConfig()) return

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
    hotkeyOverrides: hotkeyOverrides.value,
    userConfig: {
      preview: {
        hover: {
          enabled: hoverPreviewEnabled.value,
          delay: hoverPreviewEnabled.value ? normalizeHoverPreviewDelay() : normalizeHoverPreviewDelay()
        }
      }
    }
  }
  saveSetting(payload)
  ElMessage.success('保存成功，配置已热更新')
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
      syncSetting(restored)
      path.value = restored.database.path[nativeId]
      maxsize.value = restored.database.maxsize ?? unlimitedVal
      maxage.value = restored.database.maxage ?? unlimitedVal
      shown.value = sortShownByOrder(restored.operation?.shown || [], featureOrder.value)
      custom.value = (restored.operation?.custom || []).map((c) => ({ ...c }))
      featureOrder.value = buildFeatureOrder(restored.operation?.order, custom.value.map((c) => c.id))
      syncShownOrder()
      hotkeyOverrides.value = { ...(restored.hotkeyOverrides || {}) }
      const restoredHoverPreviewConfig = getHoverPreviewConfig(restored)
      hoverPreviewEnabled.value = restoredHoverPreviewConfig.enabled
      hoverPreviewDelay.value = restoredHoverPreviewConfig.delay
      ElMessage.success('重置成功，配置已热更新')
    })
    .catch(() => {})
}

const keyDownHandler = (e) => {
  if (isEditableTarget(e.target)) return
  const isSearchShortcut = (e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'f'
  if (isSearchShortcut && activeTab.value === 'shortcut') {
    e.preventDefault()
    e.stopPropagation()
    focusShortcutSearch()
    return
  }
  if (e.key === 'ArrowLeft') {
    if (switchSettingTabByOffset(-1)) {
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }
  if (e.key === 'ArrowRight') {
    if (switchSettingTabByOffset(1)) {
      e.preventDefault()
      e.stopPropagation()
    }
    return
  }
  if (e.key === 'Escape' && !customDialogVisible.value) {
    emit('back')
    e.stopPropagation()
  }
}

onMounted(() => {
  activateLayer('setting')
  document.addEventListener('keydown', keyDownHandler)
})

watch(hoverPreviewEnabled, (enabled) => {
  if (enabled) {
    ensureHoverPreviewDelay()
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', keyDownHandler)
  deactivateLayer('setting')
})
</script>

<style lang="less" scoped>
.setting {
  min-height: 100%;
  color: var(--text-color);
  background:
    radial-gradient(circle at top left, rgba(53, 95, 157, 0.08), transparent 280px),
    linear-gradient(180deg, #f7fafe 0%, var(--bg-color) 100%);
}

.setting-card-content {
  padding: 18px 18px 8px;
}
.sub-tab-nav {
  display: inline-flex;
  flex-wrap: nowrap;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--border-color-strong);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(232, 238, 245, 0.88));
  box-shadow:
    0 12px 28px rgba(15, 23, 42, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.sub-tab-btn {
  position: relative;
  font-size: 14px;
  font-weight: 600;
  min-height: 42px;
  min-width: 84px;
  border-color: transparent;
  background: transparent;
  color: var(--text-color);
  &.is-current {
    border-color: rgba(53, 95, 157, 0.30);
    background: linear-gradient(180deg, #ffffff 0%, #eef4fb 100%);
    color: var(--primary-color);
    box-shadow:
      0 10px 22px rgba(53, 95, 157, 0.14),
      0 0 0 1px rgba(53, 95, 157, 0.10) inset;
  }
  &.is-current::after {
    content: '';
    position: absolute;
    left: 14px;
    right: 14px;
    bottom: 4px;
    height: 2px;
    border-radius: 999px;
    background: currentColor;
    opacity: 0.9;
  }
}
.sub-tab-content {
  padding: 22px 4px 12px;
  min-height: 0;
}
.setting-card-content-item {
  display: block;
  margin: 0;
  padding: 0 10px;
  background: transparent;
  box-shadow: none;
}
.setting-section-head {
  display: flex;
  align-items: center;
  gap: 12px;
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
  font-size: 18px;
  font-weight: 700;
  color: var(--text-color);
  letter-spacing: 0.01em;
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
  gap: 12px;
  margin: 14px 0;
  color: var(--text-color);
}
.setting-label {
  min-width: 92px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
}
.setting-unit {
  font-size: 13px;
  color: var(--text-color-lighter);
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
.feature-config-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.feature-config-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: nowrap;
  width: 100%;
  padding: 18px 20px;
  border: 1px solid var(--border-color-strong);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 253, 0.98));
  box-shadow:
    0 18px 36px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background-color 0.18s ease;
  &:hover {
    border-color: var(--border-color-strong);
    box-shadow: 0 22px 42px var(--shadow-color);
  }
}
.feature-config-meta {
  flex: 0 0 auto;
  min-width: 0;
}
.feature-config-title-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  strong {
    display: block;
    font-size: 15px;
    color: var(--text-color);
  }
}
.feature-config-control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: nowrap;
  flex: 1 1 auto;
  min-width: 0;
  margin-left: auto;
}
.feature-config-inline-row {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  flex: 0 1 auto;
  width: 152px;
  justify-content: flex-end;
}
.feature-toggle-group {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}
.feature-toggle-group.is-fixed-right {
  min-width: 96px;
  justify-content: flex-end;
}
.toggle-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 84px;
  height: 38px;
  padding: 0 10px 0 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  color: #fff;
  box-shadow:
    0 12px 20px rgba(15, 23, 42, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
  &.is-on {
    background: linear-gradient(180deg, #42c86f 0%, #249e4f 100%);
  }
  &.is-off {
    background: linear-gradient(180deg, #f15a5a 0%, #cb3030 100%);
  }
  &:hover {
    transform: translateY(-1px);
  }
}
.toggle-pill-track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
}
.toggle-pill-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
  transition: transform 0.18s ease;
}
.toggle-pill.is-off .toggle-pill-knob {
  transform: translateX(16px);
}
.toggle-pill-text {
  min-width: 20px;
  text-align: center;
}
.feature-config-input {
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  &.inline {
    padding: 7px 10px 7px 12px;
    border: 1px solid var(--border-color-strong);
    border-radius: 14px;
    background: linear-gradient(180deg, #f5f9fd 0%, #edf3f9 100%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.96),
      0 10px 18px rgba(15, 23, 42, 0.04);
  }
  &.is-hidden {
    visibility: hidden;
    pointer-events: none;
  }
}
.feature-config-inline-label {
  font-size: 12px;
  color: var(--text-color);
  margin-right: 8px;
  font-weight: 600;
  white-space: nowrap;
}
.feature-config-unit {
  font-size: 12px;
  color: var(--text-color-lighter);
  margin-left: 8px;
  min-width: 20px;
}
.feature-config-native-input {
  width: 88px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color-strong);
  border-radius: 12px;
  background: #fff;
  color: var(--text-color);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
  &:hover {
    border-color: rgba(53, 95, 157, 0.24);
  }
  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(53, 95, 157, 0.12);
  }
}
.table-action-empty {
  color: var(--text-color-lighter);
}
.setting :deep(.el-card__body) {
  padding: 0;
}
.setting :deep(.el-divider) {
  border-color: var(--border-color);
  margin: 18px 0 22px;
}
.setting :deep(.el-input),
.setting :deep(.el-select),
.setting :deep(.el-textarea),
.setting :deep(.el-input-number) {
  --el-border-radius-base: 14px;
  --el-border-radius-small: 12px;
}
.setting :deep(.el-input__wrapper),
.setting :deep(.el-select__wrapper),
.setting :deep(.el-textarea__inner),
.setting :deep(.el-input-number) {
  background: #fff;
  box-shadow:
    0 0 0 1px var(--border-color-strong) inset,
    0 2px 4px rgba(15, 23, 42, 0.04);
  border-radius: 14px;
  transition: box-shadow 0.18s ease, background-color 0.18s ease;
}
.setting :deep(.el-input__wrapper:hover),
.setting :deep(.el-select__wrapper:hover),
.setting :deep(.el-textarea__inner:hover),
.setting :deep(.el-input-number:hover) {
  box-shadow:
    0 0 0 1px rgba(53, 95, 157, 0.24) inset,
    0 4px 10px rgba(53, 95, 157, 0.06);
}
.setting :deep(.el-input__wrapper.is-focus),
.setting :deep(.el-select__wrapper.is-focused),
.setting :deep(.el-textarea__inner:focus),
.setting :deep(.el-input-number.is-controls-right .el-input__wrapper.is-focus) {
  box-shadow:
    0 0 0 1px var(--primary-color) inset,
    0 0 0 4px rgba(53, 95, 157, 0.10);
}
.setting :deep(.el-input__inner),
.setting :deep(.el-textarea__inner),
.setting :deep(.el-input-number .el-input__inner) {
  color: var(--text-color);
  font-weight: 500;
}
.setting :deep(.el-input__inner::placeholder),
.setting :deep(.el-textarea__inner::placeholder) {
  color: var(--text-color-lighter);
}
.setting :deep(.el-card) {
  overflow: hidden;
  background: rgba(255, 255, 255, 0.94);
  border-color: var(--border-color-strong);
  border-radius: 24px;
  box-shadow:
    0 26px 56px var(--shadow-color),
    inset 0 1px 0 rgba(255, 255, 255, 0.96);
}
.setting-card-footer {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
  padding: 18px 20px 20px;
  border-top: 1px solid var(--border-color);
  background: linear-gradient(180deg, rgba(247, 250, 254, 0.92), rgba(239, 244, 249, 0.96));
}
.setting :deep(.el-button:not(.is-link)) {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 14px;
  border-color: var(--border-color-strong);
  background: linear-gradient(180deg, #ffffff 0%, #f6f9fc 100%);
  color: var(--text-color);
  transition: all 0.18s ease;
}
.setting :deep(.el-button:not(.is-link):hover) {
  border-color: var(--border-color-strong);
  background: var(--nav-hover-bg-color);
  color: var(--text-color);
}
.setting :deep(.el-button.is-plain) {
  background: #fff;
}
.setting :deep(.el-button--primary) {
  border-color: var(--primary-color);
  background: linear-gradient(180deg, var(--primary-color-lighter) 0%, var(--primary-color) 100%);
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

@media (max-width: 640px) {
  .shortcut-summary {
    grid-template-columns: 1fr;
  }
  .feature-config-row {
    flex-wrap: wrap;
    align-items: flex-start;
  }
  .feature-config-control {
    width: 100%;
    justify-content: flex-start;
    margin-left: 0;
    flex-wrap: wrap;
  }
  .feature-config-inline-row {
    width: auto;
  }
}
</style>
