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
            命令
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
              <span class="setting-label">数据根路径</span>
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
            <el-divider></el-divider>
            <div class="setting-section-title">存储模式</div>
            <div class="setting-row">
              <span class="setting-label">存储引擎</span>
              <span class="setting-static-value" :class="storageModeClass">{{ storageModeLabel }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">迁移状态</span>
              <span class="setting-static-value">{{ storageMigrationLabel }}</span>
              <el-button
                v-if="storageStatus.migrationStatus === 'failed'"
                type="primary"
                size="small"
                :loading="isRetryingMigration"
                @click="handleRetryStorageMigration"
              >
                再次尝试迁移
              </el-button>
            </div>
            <div class="setting-row">
              <span class="setting-label">SQLite 文件</span>
              <span class="setting-static-value" :title="storageSqlitePath">{{ storageSqlitePath }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">JSON 备份</span>
              <span class="setting-static-value" :title="storageJsonPath">{{ storageJsonPath }}</span>
            </div>
            <div class="setting-row">
              <span class="setting-label">素材目录</span>
              <span class="setting-static-value" :title="storageAssetDir">{{ storageAssetDir }}</span>
            </div>
            <div class="setting-row" v-if="isStorageMigrationActive || storageStatus.migrationStatus === 'failed'">
              <span class="setting-label">当前步骤</span>
              <div class="storage-progress">
                <el-progress
                  :percentage="storageStatus.progress"
                  :status="storageStatus.migrationStatus === 'failed' ? 'exception' : undefined"
                />
                <span class="setting-inline-hint">{{ storageStatus.stepText || '等待存储状态' }}</span>
              </div>
            </div>
            <div class="setting-row" v-if="storageStatus.errorMessage">
              <span class="setting-label">错误信息</span>
              <span class="setting-static-value setting-static-value--danger" :title="storageStatus.errorMessage">
                {{ storageStatus.errorMessage }}
              </span>
            </div>
            <div class="setting-row" v-if="storageStatus.migrationStatus === 'failed'">
              <span class="setting-label">排查方式</span>
              <span class="setting-inline-hint">
                失败详情已记录在 uTools dbStorage 的 storageRuntimeStatus.errorMessage；dev 模式也会输出到控制台。
              </span>
            </div>
            <div class="setting-row">
              <span class="setting-label">更新时间</span>
              <span class="setting-static-value">{{ storageUpdatedAtLabel }}</span>
            </div>
            <div class="setting-row setting-row--hint">
              <span class="setting-inline-hint">
                旧 JSON 会保留为备份；正常运行优先使用 SQLite，迁移失败时临时使用 JSON 降级模式。
              </span>
            </div>
          </div>
        </div>

        <div class="sub-tab-content" v-show="activeTab === 'shortcut'">
          <div class="setting-card-content-item">
            <div class="setting-section-head">
              <div class="setting-section-title">命令与快捷键</div>
              <HelpHint
                marker="!"
                button-class="setting-help-btn"
                aria-label="查看命令列表说明"
                :content="shortcutHelpContent"
              />
            </div>
            <p class="shortcut-count">{{ commandSystemSummary }}</p>
            <div
              class="shortcut-storage-status"
              :class="{ fallback: shortcutCommandStorageMode !== SHORTCUT_STORAGE_MODE_SQLITE }"
              :title="shortcutStorageHint"
              role="status"
              :aria-label="`${shortcutStorageLabel}。${shortcutStorageHint}`"
            >
              <span class="shortcut-storage-dot"></span>
              <span>{{ shortcutStorageLabel }}</span>
            </div>
            <div class="setting-search-row">
              <el-input
                ref="shortcutSearchInputRef"
                v-model="shortcutQueryInput"
                clearable
                placeholder="搜索 command、动作、键位、when、来源或作用域"
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
              <button
                type="button"
                class="filter-chip"
                :class="{ active: shortcutScope === 'user' }"
                @click="shortcutScope = 'user'"
              >
                已修改
              </button>
              <button
                type="button"
                class="filter-chip"
                :class="{ active: shortcutScope === 'risk' }"
                @click="shortcutScope = 'risk'"
              >
                高风险
              </button>
            </div>
            <el-divider></el-divider>
            <SettingPagedTable
              :rows="filteredShortcutCommandRows"
              :columns="shortcutColumns"
              :total="filteredShortcutCommandRows.length"
              row-key="id"
              empty-text="暂无命令绑定数据"
              :show-pagination="false"
              action-label="配置"
              :action-width="150"
              body-max-height="420px"
            >
              <template #cell-commandTitle="{ row }">
                <div class="shortcut-command-cell">
                  <div class="shortcut-command-title-row">
                    <span class="shortcut-command-title">{{ row.commandTitle }}</span>
                    <span v-if="row.risk === 'data-write'" class="shortcut-risk-tag">写入</span>
                  </div>
                  <div class="shortcut-command-meta">
                    <span>{{ row.commandId }}</span>
                    <span>{{ row.scopeLabel }}</span>
                  </div>
                </div>
              </template>
              <template #cell-shortcutId="{ row }">
                <span class="shortcut-key-cell">{{ formatShortcutDisplay(row.shortcutId) }}</span>
              </template>
              <template #cell-when="{ row }">
                <span class="shortcut-when-cell" :title="row.when">{{ row.when || '始终' }}</span>
              </template>
              <template #cell-sourceLabel="{ row }">
                <span class="shortcut-source-tag" :class="{ user: row.source === 'user' }">{{ row.sourceLabel }}</span>
              </template>
              <template #actions="{ row }">
                <el-button link type="primary" size="small" @click="openShortcutEdit(row)">改键</el-button>
                <el-button link type="primary" size="small" @click="openWhenEdit(row)">When</el-button>
                <el-button
                  v-if="row.source === 'user' || row.source === 'removed'"
                  link
                  type="primary"
                  size="small"
                  @click="restoreShortcutDefault(row)"
                >
                  默认
                </el-button>
                <el-button
                  v-if="!row.disabled"
                  link
                  type="danger"
                  size="small"
                  @click="disableShortcut(row)"
                >
                  禁用
                </el-button>
              </template>
            </SettingPagedTable>
          </div>
        </div>
        <el-dialog
          v-model="shortcutRecordVisible"
          title="录制快捷键"
          width="420px"
          class="shortcut-record-dialog"
          :close-on-click-modal="false"
          @opened="focusShortcutRecorder"
          @closed="resetShortcutRecorder"
        >
          <div
            ref="shortcutRecorderRef"
            class="shortcut-recorder"
            tabindex="0"
            @keydown.stop.prevent="handleShortcutRecordKeydown"
          >
            <div class="shortcut-recorder-label">按下新的快捷键</div>
            <div class="shortcut-recorder-key">
              {{ recordedShortcutId ? formatShortcutDisplay(recordedShortcutId) : '等待输入' }}
            </div>
            <div class="shortcut-recorder-meta">
              {{ shortcutRecordRow?.commandTitle || '' }}
            </div>
          </div>
          <el-input
            v-model="recordedShortcutInput"
            class="shortcut-recorder-manual"
            placeholder="也可手动输入，如 ctrl+shift+f"
            @keydown.stop
          />
          <template #footer>
            <el-button @click="shortcutRecordVisible = false">取消</el-button>
            <el-button type="primary" :disabled="!normalizedRecordedShortcutId" @click="submitShortcutRecord">确定</el-button>
          </template>
        </el-dialog>
        <el-dialog
          v-model="whenEditVisible"
          title="编辑 When 条件"
          width="640px"
          class="when-edit-dialog"
          :close-on-click-modal="false"
          @closed="resetWhenEditor"
        >
          <div class="when-editor-head">
            <div class="when-editor-title">{{ whenEditRow?.commandTitle || '' }}</div>
            <div class="when-editor-meta">{{ whenEditRow?.commandId || '' }}</div>
          </div>
          <div class="when-editor-mode-row">
            <button
              type="button"
              class="filter-chip"
              :class="{ active: whenEditMode === 'builder' }"
              @click="switchWhenEditMode('builder')"
            >
              图形
            </button>
            <button
              type="button"
              class="filter-chip"
              :class="{ active: whenEditMode === 'text' }"
              @click="switchWhenEditMode('text')"
            >
              文本
            </button>
            <span class="when-editor-summary">{{ getWhenBuilderSummary(whenEditInput) }}</span>
          </div>
          <div v-if="whenEditMode === 'builder'" class="when-builder">
            <div class="when-builder-toolbar">
              <span>条件关系</span>
              <button
                type="button"
                class="filter-chip"
                :class="{ active: whenBuilderOperator === '&&' }"
                @click="setWhenBuilderOperator('&&')"
              >
                全部满足
              </button>
              <button
                type="button"
                class="filter-chip"
                :class="{ active: whenBuilderOperator === '||' }"
                @click="setWhenBuilderOperator('||')"
              >
                任一满足
              </button>
            </div>
            <div class="when-builder-groups">
              <div v-for="group in WHEN_CONTEXT_GROUPS" :key="group.id" class="when-builder-group">
                <div class="when-builder-group-title">{{ group.title }}</div>
                <div class="when-builder-options">
                  <div v-for="item in group.keys" :key="item.key" class="when-builder-option">
                    <span class="when-builder-option-label">{{ item.label }}</span>
                    <div class="when-builder-option-actions">
                      <button
                        type="button"
                        class="when-state-btn"
                        :class="{ active: whenBuilderStates[item.key] === 'include' }"
                        @click="setWhenBuilderState(item.key, 'include')"
                      >
                        是
                      </button>
                      <button
                        type="button"
                        class="when-state-btn"
                        :class="{ active: whenBuilderStates[item.key] === 'exclude' }"
                        @click="setWhenBuilderState(item.key, 'exclude')"
                      >
                        否
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <el-input
            v-show="whenEditMode === 'text'"
            v-model="whenEditInput"
            type="textarea"
            :rows="4"
            placeholder="例如 mainFocus && !inputFocus"
            @input="validateWhenEdit"
          />
          <div class="when-editor-status" :class="{ error: whenEditError }">
            {{ whenEditError || whenEditConflictLabel || 'When 表达式有效' }}
          </div>
          <div class="when-editor-examples">
            <button
              v-for="preset in WHEN_PRESETS"
              :key="preset.label"
              type="button"
              class="filter-chip"
              @click="applyWhenEditPreset(preset.when)"
            >
              {{ preset.label }}
            </button>
          </div>
          <template #footer>
            <el-button @click="whenEditVisible = false">取消</el-button>
            <el-button type="primary" :disabled="Boolean(whenEditError)" @click="submitWhenEdit">确定</el-button>
          </template>
        </el-dialog>
        <div class="sub-tab-content" v-show="activeTab === 'feature'">
          <div class="setting-card-content-item">
            <div class="setting-section-head">
              <div class="setting-section-head-main">
                <div class="setting-section-title">展示主页功能</div>
                <p class="setting-section-subtitle">用更少的配置管理常用动作，默认与自定义功能统一排序。</p>
              </div>
              <HelpHint
                marker="!"
                button-class="setting-help-btn"
                aria-label="查看功能列表说明"
                content="默认功能标题与图标来自 src/data/operation.json，自定义功能来自当前设置数据。后续调整功能、标题、命令或匹配范围时，应同步更新 Settings 展示与说明。"
              />
            </div>
            <div class="feature-toolbar">
              <div class="feature-toolbar-main">
                <div class="feature-quick-card">
                  <div class="feature-quick-card-head">
                    <span class="feature-field-label">主页展示</span>
                    <el-popover
                      placement="bottom-start"
                      :width="320"
                      trigger="click"
                      popper-class="feature-select-popover"
                    >
                      <template #reference>
                        <button type="button" class="feature-inline-trigger">
                          已选 {{ shown.length }}/9
                        </button>
                      </template>
                      <div class="feature-select-popover-body">
                        <div class="feature-select-popover-title">选择显示在主页的功能</div>
                        <el-select
                          class="operation-select operation-select--popover"
                          v-model="shown"
                          multiple
                          :multiple-limit="9"
                          collapse-tags
                          collapse-tags-tooltip
                          placeholder="选择显示在主页的功能"
                        >
                          <el-option
                            v-for="o in allOperations"
                            :key="o.id"
                            :label="`${o.index}. ${o.icon} ${o.title}`"
                            :value="o.id"
                          />
                        </el-select>
                      </div>
                    </el-popover>
                  </div>
                  <p class="feature-quick-card-desc">点击查看并调整主页展示功能，最多保留 9 个。</p>
                </div>
                <div class="feature-field feature-field-search">
                  <span class="feature-field-label">快速筛选</span>
                  <el-input
                    v-model="featureQuery"
                    clearable
                    placeholder="搜索功能标题、类型或命令"
                  />
                </div>
              </div>
              <el-button class="feature-add-btn" type="primary" plain @click="openCustomAdd">新增自定义功能</el-button>
            </div>
            <p v-if="isFeatureFilterActive" class="filter-hint">
              当前处于过滤状态，已禁用拖拽排序，清空搜索后恢复全量排序。
            </p>
            <div class="feature-table-head">
              <div>
                <div class="setting-section-title feature-table-title">功能列表</div>
                <p class="shortcut-count">共 {{ filteredFeatureRows.length }} / {{ featureRows.length }} 条</p>
              </div>
              <span class="feature-table-tip">拖拽手柄可直接调整顺序</span>
            </div>
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
                <div class="feature-cell-main">
                  <div class="feature-cell-title-row">
                    <span class="feature-icon">{{ row.icon }}</span>
                    <span class="feature-title">{{ row.title }}</span>
                  </div>
                  <div class="feature-meta-row">
                    <span class="feature-meta-chip" :class="{ custom: row.isCustom }">{{ row.typeLabel }}</span>
                    <span v-if="row.matchDisplay" class="feature-meta-text">匹配 {{ row.matchDisplay }}</span>
                    <span v-else class="feature-meta-text">内置功能</span>
                  </div>
                </div>
              </template>
              <template #cell-commandDisplay="{ row }">
                <div class="feature-command-cell">
                  <span class="feature-command-text">{{ row.commandDisplay || '内置动作' }}</span>
                  <button
                    v-if="row.shortcutSummary.count"
                    type="button"
                    class="feature-shortcut-link"
                    :title="row.shortcutSummary.hint"
                    :aria-label="`查看 ${row.title} 的 command 快捷键：${row.shortcutSummary.label}`"
                    @click="openFeatureShortcut(row)"
                  >
                    {{ row.shortcutSummary.label }}
                  </button>
                  <span v-else class="feature-shortcut-muted" :title="row.shortcutSummary.hint">
                    {{ row.shortcutSummary.label }}
                  </span>
                </div>
              </template>
              <template #actions="{ row }">
                <template v-if="row.isCustom">
                  <el-button link type="primary" size="small" @click="openCustomEdit(row.raw)">编辑</el-button>
                  <el-button link type="danger" size="small" @click="deleteCustom(row.raw)">删除</el-button>
                </template>
                <span v-else class="table-action-empty">-</span>
              </template>
            </SettingPagedTable>
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
              <div class="feature-config-row">
                <div class="feature-config-meta">
                  <div class="feature-config-title-row">
                    <strong>全局快捷粘贴</strong>
                    <HelpHint
                      aria-label="查看快捷粘贴说明"
                      content="这是 uTools 全局功能快捷键，不占用系统粘贴键；顶部项按当前剪贴板、置顶项、当前筛选普通顶部项的顺序粘贴，组合项按已保存组合循环粘贴"
                    />
                  </div>
                  <p class="feature-config-desc">
                    建议分别绑定 Ctrl/Command+Shift+V 与 Ctrl/Command+Shift+P。
                  </p>
                </div>
                <div class="feature-config-control feature-config-actions">
                  <el-button
                    type="primary"
                    plain
                    class="feature-config-action"
                    @click="openUtoolsHotkeySetting('粘贴置顶顶部项')"
                  >
                    绑定顶部项
                  </el-button>
                  <el-button
                    type="primary"
                    plain
                    class="feature-config-action"
                    @click="openUtoolsHotkeySetting('循环粘贴置顶组合项')"
                  >
                    绑定组合项
                  </el-button>
                </div>
              </div>
              <div class="feature-config-row">
                <div class="feature-config-meta">
                  <div class="feature-config-title-row">
                    <strong>命令与动作</strong>
                    <HelpHint
                      aria-label="查看命令快捷键说明"
                      content="本地 command/keybinding 优先读取 SQLite 快照与 override 表；SQLite 不可用时回退 setting.hotkeyOverrides。组合命令支持配置快捷键、When、串行 delay，并在运行时动态注册执行。"
                    />
                  </div>
                  <p class="feature-config-desc">
                    {{ commandSystemConfigSummary }}
                  </p>
                  <p class="feature-config-desc">
                    {{ commandMacroSummary }}
                  </p>
                  <p class="feature-config-desc">
                    {{ contextMenuActionSummary }}
                  </p>
                </div>
                <div class="feature-config-control feature-config-actions">
                  <span
                    class="feature-config-status"
                    :class="{ fallback: shortcutCommandStorageMode !== SHORTCUT_STORAGE_MODE_SQLITE }"
                    :title="shortcutStorageHint"
                  >
                    {{ shortcutCommandStorageMode === SHORTCUT_STORAGE_MODE_SQLITE ? 'SQLite' : 'Fallback' }}
                  </span>
                  <span
                    class="feature-config-status"
                    :class="{ fallback: commandMacroStorageMode !== COMMAND_MACRO_STORAGE_MODE_SQLITE }"
                    :title="commandMacroStorageHint"
                  >
                    {{ commandMacroStorageMode === COMMAND_MACRO_STORAGE_MODE_SQLITE ? 'Macro SQLite' : 'Macro Draft' }}
                  </span>
                  <el-button
                    type="primary"
                    plain
                    class="feature-config-action"
                    @click="openShortcutSystemConfig"
                  >
                    配置命令
                  </el-button>
                  <el-button
                    plain
                    class="feature-config-action"
                    @click="commandMacroDialogVisible = true"
                  >
                    查看组合
                  </el-button>
                  <el-button
                    plain
                    class="feature-config-action"
                    @click="contextMenuDialogVisible = true"
                  >
                    右键菜单
                  </el-button>
                  <el-button
                    plain
                    class="feature-config-action"
                    @click="openCommandMacroDraftAdd"
                  >
                    新增组合
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <el-dialog
          v-model="commandMacroDialogVisible"
          title="组合命令"
          width="720px"
          class="command-macro-dialog"
        >
          <SettingPagedTable
            :rows="commandMacroRows"
            :columns="commandMacroColumns"
            :total="commandMacroRows.length"
            row-key="id"
            empty-text="暂无组合命令"
            :show-pagination="false"
            body-max-height="360px"
          >
            <template #cell-title="{ row }">
              <div class="command-macro-cell">
                <div class="command-macro-title">{{ row.title }}</div>
                <div class="command-macro-meta">{{ row.id }}</div>
              </div>
            </template>
            <template #cell-steps="{ row }">
              <span class="command-macro-steps" :title="row.stepHint">{{ row.stepSummary }}</span>
            </template>
            <template #cell-runtimeLabel="{ row }">
              <span class="shortcut-source-tag" :class="{ user: row.runtimeStatus === 'running' || row.runtimeStatus === 'completed' }">
                {{ row.runtimeLabel }}
              </span>
            </template>
            <template #cell-storageLabel="{ row }">
              <span class="shortcut-source-tag">{{ row.storageLabel }}</span>
            </template>
            <template #actions="{ row }">
              <el-button v-if="row.canCancel" link type="warning" size="small" @click="cancelCommandMacroRuntime(row)">取消</el-button>
              <el-button link type="primary" size="small" @click="openCommandMacroDraftEdit(row.raw)">编辑</el-button>
              <el-button link type="danger" size="small" @click="deleteCommandMacroDraft(row.raw)">删除</el-button>
            </template>
          </SettingPagedTable>
          <p class="command-macro-dialog-note">
            组合命令会在快捷键刷新时动态注册为 macro.* command；当前仍只允许非写入 command 进入组合。
          </p>
        </el-dialog>
        <el-dialog
          v-model="contextMenuDialogVisible"
          title="右键菜单"
          width="720px"
          class="command-macro-dialog"
        >
          <SettingPagedTable
            :rows="contextMenuActionRows"
            :columns="contextMenuActionColumns"
            :total="contextMenuActionRows.length"
            row-key="id"
            empty-text="暂无右键菜单项"
            :show-pagination="false"
            body-max-height="360px"
            draggable
            drag-handle=".context-menu-drag-handle"
            :move-guard="allowContextMenuActionDrag"
            @drag-end="handleContextMenuActionDragEnd"
          >
            <template #cell-drag="{ row }">
              <span
                v-if="row.orderable"
                class="drag-handle context-menu-drag-handle"
                title="拖拽调整右键菜单顺序"
              >⋮⋮</span>
              <span
                v-else
                class="feature-shortcut-muted"
                title="该动作固定在第 2 位"
              >固定</span>
            </template>
            <template #cell-title="{ row }">
              <div class="command-macro-cell">
                <div class="command-macro-title">
                  <span class="context-menu-action-icon">{{ row.icon }}</span>
                  <span>{{ row.title }}</span>
                  <span v-if="row.risk === 'data-write'" class="shortcut-risk-tag">写入</span>
                </div>
                <div class="command-macro-meta">{{ row.id }}</div>
              </div>
            </template>
            <template #cell-shortcut="{ row }">
              <button
                v-if="row.shortcutSummary.count"
                type="button"
                class="feature-shortcut-link"
                :title="row.shortcutSummary.hint"
                :aria-label="`查看 ${row.title} 的 command 快捷键：${row.shortcutSummary.label}`"
                @click="openContextMenuShortcut(row)"
              >
                {{ row.shortcutSummary.label }}
              </button>
              <span v-else class="feature-shortcut-muted" :title="row.shortcutSummary.hint">
                {{ row.shortcutSummary.label }}
              </span>
            </template>
            <template #cell-sourceLabel="{ row }">
              <span class="shortcut-source-tag" :class="{ user: row.source !== 'system' }">{{ row.sourceLabel }}</span>
            </template>
          </SettingPagedTable>
          <p class="command-macro-dialog-note">
            右键抽屉渲染、数字序号执行和本列表共用同一 action 模型；当前仅管理顺序审计和恢复默认，不隐藏业务动作。
          </p>
          <template #footer>
            <el-button
              plain
              :disabled="!contextMenuDrawerOrder.length"
              @click="restoreContextMenuOrder"
            >
              恢复默认顺序
            </el-button>
            <el-button @click="contextMenuDialogVisible = false">关闭</el-button>
          </template>
        </el-dialog>
        <el-dialog
          v-model="commandMacroDraftDialogVisible"
          :title="commandMacroDraftMode === 'add' ? '新增组合命令' : '编辑组合命令'"
          width="560px"
          class="command-macro-dialog"
          :close-on-click-modal="false"
        >
          <el-form class="feature-form" :model="commandMacroDraftForm" label-width="92px">
            <el-form-item label="标题">
              <el-input v-model="commandMacroDraftForm.title" placeholder="例如 打开设置并切换页签" />
            </el-form-item>
            <el-form-item label="快捷键">
              <el-input v-model="commandMacroDraftForm.shortcutId" placeholder="例如 ctrl+shift+1" />
            </el-form-item>
            <el-form-item label="When">
              <el-input v-model="commandMacroDraftForm.when" placeholder="例如 mainFocus" />
            </el-form-item>
            <el-form-item label="步骤">
              <div class="command-macro-step-list">
                <div
                  v-for="(step, index) in commandMacroDraftForm.steps"
                  :key="index"
                  class="command-macro-step-row"
                >
                  <span class="command-macro-step-index">{{ index + 1 }}</span>
                  <el-select v-model="step.command" filterable clearable placeholder="选择 command">
                    <el-option
                      v-for="command in macroCommandOptions"
                      :key="command.id"
                      :label="`${command.id} - ${command.title}`"
                      :value="command.id"
                    />
                  </el-select>
                  <input
                    v-model.number="step.delayMs"
                    class="command-macro-delay-input"
                    type="number"
                    :min="0"
                    :max="COMMAND_MACRO_MAX_DELAY_MS"
                    :step="50"
                    title="执行前延迟 ms"
                  >
                  <el-button
                    link
                    type="danger"
                    size="small"
                    :disabled="commandMacroDraftForm.steps.length <= 1"
                    @click="removeCommandMacroDraftStep(index)"
                  >
                    删除
                  </el-button>
                </div>
                <el-button
                  plain
                  size="small"
                  :disabled="commandMacroDraftForm.steps.length >= COMMAND_MACRO_MAX_STEPS"
                  @click="addCommandMacroDraftStep"
                >
                  添加步骤
                </el-button>
              </div>
            </el-form-item>
          </el-form>
          <p class="command-macro-dialog-note">
            当前只允许非写入 command 进入组合命令，避免删除、清空、锁定等副作用被组合放大。
          </p>
          <template #footer>
            <el-button @click="commandMacroDraftDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitCommandMacroDraft">{{ commandMacroDraftMode === 'add' ? '保存草稿' : '保存修改' }}</el-button>
          </template>
        </el-dialog>
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
import setting, { saveSetting, getHoverPreviewConfig } from '../global/readSetting'
import restoreSetting from '../global/restoreSetting'
import defaultOperation from '../data/operation.json'
import { activateLayer, deactivateLayer } from '../global/hotkeyLayers'
import { getFeatureLabel } from '../global/hotkeyLabels'
import { COMMANDS } from '../global/commandDefaults.js'
import {
  buildContextMenuDrawerOrderFromRows,
  buildContextMenuActionRows,
  getContextMenuActionSummary
} from '../global/contextMenuActions'
import { formatShortcutDisplay, normalizeShortcutId } from '../global/shortcutKey'
import {
  applyShortcutOverrideValue,
  buildShortcutOverrideValue,
  disableShortcutOverride,
  filterShortcutCommandRows,
  getOperationShortcutSummary
} from '../global/shortcutCommandRows'
import { getShortcutCommandRowConflicts } from '../global/keybindingConflicts'
import { parseWhenExpression } from '../global/whenExpression'
import {
  WHEN_CONTEXT_GROUPS,
  WHEN_PRESETS,
  buildWhenExpression,
  getWhenBuilderSummary,
  parseWhenToSelection
} from '../global/whenBuilder'
import { eventLikeToShortcutId, isRecordableShortcutId } from '../global/shortcutRecorder'
import { registerCommandFeaturePairs } from '../global/hotkeyRegistry'
import { COMMAND_MACRO_MAX_DELAY_MS, COMMAND_MACRO_MAX_STEPS } from '../global/commandMacro.js'
import {
  SHORTCUT_STORAGE_MODE_SQLITE,
  getEffectiveShortcutCommandRows,
  getEffectiveShortcutOverrides,
  saveShortcutSettingsPayload
} from '../global/shortcutStore'
import {
  COMMAND_MACRO_STORAGE_MODE_SQLITE,
  getEffectiveCommandMacros,
  saveCommandMacros
} from '../global/commandMacroStore'
import {
  COMMAND_MACRO_RUNTIME_EVENT,
  getCommandMacroRuntimeSnapshot,
  requestCancelCommandMacroRun
} from '../global/commandMacroRuntime'
import { getNativeId } from '../utils'
import SettingPagedTable from '../cpns/SettingPagedTable.vue'
import HelpHint from '../cpns/HelpHint.vue'
import {
  STORAGE_STATUS_EVENT,
  getStorageRuntimeStatus,
  markStorageNoticeRead
} from '../storage/storageRuntimeStatus'

const emit = defineEmits(['back'])
const { database, operation } = setting
const nativeId = getNativeId()

const unlimitedVal = 'unlimited'
const path = ref(database.path[nativeId])
const maxsize = ref(database.maxsize ?? unlimitedVal)
const maxage = ref(database.maxage ?? unlimitedVal)
const sqlitePath = computed(() => (path.value ? `${path.value}.sqlite` : ''))
const assetDir = computed(() => (path.value ? `${path.value}.sqlite.assets` : ''))
const storageStatus = ref(getStorageRuntimeStatus())
const isRetryingMigration = ref(false)
const refreshStorageStatus = (event) => {
  storageStatus.value = event?.detail || getStorageRuntimeStatus()
}
let disposeSettingCommandHandlers = null
const storageSqlitePath = computed(() => storageStatus.value.sqlitePath || sqlitePath.value)
const storageJsonPath = computed(() => storageStatus.value.jsonPath || path.value)
const storageAssetDir = computed(() => storageStatus.value.assetDir || assetDir.value)
const storageModeLabel = computed(() => {
  if (storageStatus.value.mode === 'sqlite') return 'SQLite 索引库 + 文件映射'
  if (storageStatus.value.mode === 'json-fallback') return 'JSON 降级模式'
  return '检测中'
})
const storageModeClass = computed(() => ({
  'setting-static-value--danger': storageStatus.value.mode === 'json-fallback'
}))
const storageMigrationLabel = computed(() => {
  const map = {
    idle: '未开始',
    checking: '检查中',
    migrating: '迁移中',
    migrated: '已迁移并应用 SQLite',
    'already-migrated': 'SQLite 已是最新',
    failed: '迁移失败'
  }
  return map[storageStatus.value.migrationStatus] || storageStatus.value.migrationStatus || '未知'
})
const isStorageMigrationActive = computed(() =>
  ['checking', 'migrating'].includes(storageStatus.value.migrationStatus)
)
const storageUpdatedAtLabel = computed(() => {
  const ts = Number(storageStatus.value.updatedAt)
  if (!ts) return '暂无'
  return new Date(ts).toLocaleString()
})

const custom = ref(operation.custom.map((c) => ({ ...c })))
const initialShortcutStorage = getEffectiveShortcutOverrides({ setting })
const hotkeyOverrides = ref(initialShortcutStorage.hotkeyOverrides)
const shortcutStorageMode = ref(initialShortcutStorage.storageMode)
const initialCommandMacroStorage = getEffectiveCommandMacros({ warn: () => {} })
const commandMacros = ref(initialCommandMacroStorage.macros)
const commandMacroStorageMode = ref(initialCommandMacroStorage.storageMode)
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
const shortcutRecordVisible = ref(false)
const shortcutRecordRow = ref(null)
const shortcutRecorderRef = ref(null)
const commandMacroDialogVisible = ref(false)
const commandMacroDraftDialogVisible = ref(false)
const contextMenuDialogVisible = ref(false)
const commandMacroDraftMode = ref('add')
const commandMacroEditId = ref('')
const commandMacroRuntimeSnapshot = ref(getCommandMacroRuntimeSnapshot())
const commandMacroDraftForm = ref({
  title: '',
  shortcutId: '',
  when: 'mainFocus',
  steps: [{ command: '', delayMs: 0 }]
})
const recordedShortcutId = ref('')
const recordedShortcutInput = ref('')
const whenEditVisible = ref(false)
const whenEditRow = ref(null)
const whenEditInput = ref('')
const whenEditError = ref('')
const whenEditConflictLabel = ref('')
const whenEditMode = ref('builder')
const whenBuilderOperator = ref('&&')
const whenBuilderStates = ref({})
const normalizedRecordedShortcutId = computed(() => {
  const value = recordedShortcutInput.value.trim() || recordedShortcutId.value
  const normalized = normalizeShortcutId(value)
  return isRecordableShortcutId(normalized) ? normalized : ''
})

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

function scrollSettingBy(delta) {
  window.scrollBy({ top: delta, behavior: 'smooth' })
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
const shortcutColumns = [
  { key: 'commandTitle', label: 'Command', minWidth: 220 },
  { key: 'shortcutId', label: '快捷键', width: 112 },
  { key: 'when', label: 'When', minWidth: 170 },
  { key: 'sourceLabel', label: '来源', width: 74, align: 'center' }
]
const commandMacroColumns = [
  { key: 'title', label: '组合命令', minWidth: 220 },
  { key: 'shortcutDisplay', label: '快捷键', width: 112 },
  { key: 'runtimeLabel', label: '状态', width: 96, align: 'center' },
  { key: 'stepCount', label: '步骤', width: 72, align: 'center' },
  { key: 'steps', label: '步骤摘要', minWidth: 260 },
  { key: 'storageLabel', label: '来源', width: 110, align: 'center' }
]
const contextMenuActionColumns = [
  { key: 'drag', label: '', width: 44, align: 'center' },
  { key: 'currentIndex', label: '序号', width: 70, align: 'center' },
  { key: 'title', label: '右键动作', minWidth: 240 },
  { key: 'shortcut', label: 'Command 快捷键', minWidth: 160 },
  { key: 'sourceLabel', label: '来源', width: 88, align: 'center' }
]

const effectiveShortcutCommandResult = computed(() =>
  getEffectiveShortcutCommandRows({
    setting: {
      hotkeyOverrides: hotkeyOverrides.value
    },
    getFeatureLabel
  })
)

const shortcutCommandRows = computed(() => effectiveShortcutCommandResult.value.rows)
const shortcutCommandStorageMode = computed(() => effectiveShortcutCommandResult.value.storageMode)
const macroConflictRows = computed(() =>
  commandMacros.value
    .filter((macro) => macro?.shortcutId)
    .map((macro) => ({
      id: macro.id || `macro:${macro.shortcutId}`,
      commandId: macro.id || '',
      commandTitle: macro.title || macro.id || '未命名组合命令',
      shortcutId: macro.shortcutId || '',
      key: macro.shortcutId || '',
      when: macro.when || 'mainFocus',
      source: 'user',
      sourceLabel: '组合',
      disabled: macro.enabled === false,
      scopeLabel: '组合命令',
      type: 'macro'
    }))
)
const shortcutConflictRows = computed(() => [...shortcutCommandRows.value, ...macroConflictRows.value])

const shortcutHelpContent = computed(() =>
  [
    '以 command 形式展示实际生效的快捷键；输入关键词后按 Enter 搜索，Ctrl/Cmd+F 可快速定位到搜索框。',
    '支持录制快捷键、禁用、恢复默认和编辑 When 条件；SQLite 可用时优先写入快捷键表，异常时自动回退设置存储。'
  ].join(' ')
)

const shortcutStorageLabel = computed(() =>
  shortcutCommandStorageMode.value === SHORTCUT_STORAGE_MODE_SQLITE
    ? '快捷键配置存储：SQLite'
    : '快捷键配置存储：设置 fallback'
)

const shortcutStorageHint = computed(() =>
  shortcutCommandStorageMode.value === SHORTCUT_STORAGE_MODE_SQLITE
    ? '当前快捷键改动会优先写入 SQLite override 表，并同步 setting 作为兼容副本。'
    : '当前快捷键改动会保存到 setting.hotkeyOverrides；SQLite 不可用或写入失败时使用该 fallback。'
)

function getShortcutSaveMessage(result, actionLabel = '保存') {
  const storageLabel = result?.sqliteSaved ? 'SQLite' : '设置 fallback'
  return `${actionLabel}成功，快捷键已写入${storageLabel}，配置已热更新`
}

function showShortcutSaveMessage(result, actionLabel = '保存') {
  const message = getShortcutSaveMessage(result, actionLabel)
  if (result?.sqliteSaved || shortcutStorageMode.value === SHORTCUT_STORAGE_MODE_SQLITE) {
    ElMessage.success(message)
  } else {
    ElMessage.warning(message)
  }
}

const filteredShortcutCommandRows = computed(() => {
  return filterShortcutCommandRows(shortcutCommandRows.value, {
    keyword: shortcutQuery.value,
    scope: shortcutScope.value,
    formatShortcut: formatShortcutDisplay
  })
})
const shortcutModifiedCount = computed(
  () => shortcutCommandRows.value.filter((row) => row.source === 'user' || row.source === 'removed').length
)
const commandSystemSummary = computed(
  () => `共 ${filteredShortcutCommandRows.value.length} / ${shortcutCommandRows.value.length} 条 command keybinding`
)
const commandMacroStorageHint = computed(() =>
  commandMacroStorageMode.value === COMMAND_MACRO_STORAGE_MODE_SQLITE
    ? '组合命令已可从 SQLite commandMacros repository 读写；配置快捷键后会在运行时注册执行。'
    : '组合命令当前使用内存草稿 fallback；SQLite 不可用或读取失败时不会阻断命令快捷键配置。'
)
const commandMacroSummary = computed(() =>
  `组合命令 ${commandMacros.value.length} 个，${commandMacroStorageMode.value === COMMAND_MACRO_STORAGE_MODE_SQLITE ? 'SQLite 已接入' : '内存草稿模式'}；已接入快捷键运行时执行。`
)
const contextMenuDrawerOrder = ref(
  Array.isArray(utools.dbStorage.getItem('drawer.order'))
    ? utools.dbStorage.getItem('drawer.order')
    : []
)
const contextMenuOperations = computed(() => [
  ...defaultOperation,
  ...custom.value
])
const contextMenuActionRows = computed(() =>
  buildContextMenuActionRows({
    operations: contextMenuOperations.value,
    drawerOrder: contextMenuDrawerOrder.value,
    shortcutRows: shortcutCommandRows.value,
    formatShortcut: formatShortcutDisplay
  })
)
const contextMenuActionSummary = computed(() => getContextMenuActionSummary(contextMenuActionRows.value))
const commandSystemConfigSummary = computed(
  () => `当前 ${shortcutCommandRows.value.length} 条 command keybinding，${shortcutModifiedCount.value} 条已修改或禁用。`
)
const commandMacroRows = computed(() => {
  const storageLabel = commandMacroStorageMode.value === COMMAND_MACRO_STORAGE_MODE_SQLITE ? 'SQLite' : '草稿'
  const runtimeMap = new Map(commandMacroRuntimeSnapshot.value.map((state) => [state.macroId, state]))
  return commandMacros.value.map((macro) => {
    const steps = Array.isArray(macro.steps) ? macro.steps : []
    const runtime = runtimeMap.get(macro.id)
    const runtimeStatus = runtime?.status || 'idle'
    const stepIds = steps.map((step) => step.command).filter(Boolean)
    const stepSummary = steps.length
      ? steps.slice(0, 3).map((step) => `${step.command || 'empty'}${step.delayMs ? ` +${step.delayMs}ms` : ''}`).join(' -> ')
      : '无步骤'
    const suffix = stepIds.length > 3 ? ` +${stepIds.length - 3}` : ''
    return {
      id: macro.id || '',
      title: macro.title || macro.id || '未命名组合命令',
      shortcutDisplay: macro.shortcutId ? formatShortcutDisplay(macro.shortcutId) : '未绑定',
      runtimeStatus,
      runtimeLabel: getCommandMacroRuntimeLabel(runtime),
      stepCount: steps.length,
      stepSummary: `${stepSummary}${suffix}`,
      stepHint: steps.map((step) => `${step.command || 'empty'} (${step.delayMs || 0}ms)`).join(' -> ') || '无步骤',
      storageLabel,
      canCancel: runtimeStatus === 'running' || runtimeStatus === 'cancelling',
      raw: macro
    }
  })
})
const macroCommandOptions = computed(() =>
  COMMANDS.filter((command) => command.risk !== 'data-write' && command.category !== 'macro')
    .map((command) => ({
      id: command.id,
      title: command.title || command.id
    }))
)

function refreshCommandMacroState() {
  const result = getEffectiveCommandMacros({ warn: () => {} })
  commandMacros.value = result.macros
  commandMacroStorageMode.value = result.storageMode
}

function refreshCommandMacroRuntime(event) {
  commandMacroRuntimeSnapshot.value = Array.isArray(event?.detail)
    ? event.detail
    : getCommandMacroRuntimeSnapshot()
}

function getCommandMacroRuntimeLabel(runtime) {
  const status = runtime?.status || 'idle'
  const labels = {
    idle: '空闲',
    running: runtime?.currentStep >= 0 ? `执行 ${runtime.currentStep + 1}/${runtime.totalSteps || '?'}` : '执行中',
    cancelling: '取消中',
    cancelled: '已取消',
    failed: '失败',
    completed: '完成'
  }
  return labels[status] || status
}

function openCommandMacroDraftAdd() {
  commandMacroDraftMode.value = 'add'
  commandMacroEditId.value = ''
  commandMacroDraftForm.value = {
    title: '',
    shortcutId: '',
    when: 'mainFocus',
    steps: [{ command: '', delayMs: 0 }]
  }
  commandMacroDraftDialogVisible.value = true
}

function openCommandMacroDraftEdit(macro) {
  const steps = Array.isArray(macro?.steps) ? macro.steps : []
  commandMacroDraftMode.value = 'edit'
  commandMacroEditId.value = macro?.id || ''
  commandMacroDraftForm.value = {
    title: macro?.title || '',
    shortcutId: macro?.shortcutId || '',
    when: macro?.when || 'mainFocus',
    steps: steps.length
      ? steps.map((step) => ({ command: step.command || '', delayMs: step.delayMs || 0 }))
      : [{ command: '', delayMs: 0 }]
  }
  commandMacroDraftDialogVisible.value = true
}

function addCommandMacroDraftStep() {
  if (commandMacroDraftForm.value.steps.length >= COMMAND_MACRO_MAX_STEPS) return
  commandMacroDraftForm.value.steps.push({ command: '', delayMs: 0 })
}

function removeCommandMacroDraftStep(index) {
  if (commandMacroDraftForm.value.steps.length <= 1) return
  commandMacroDraftForm.value.steps.splice(index, 1)
}

function buildCommandMacroDraftPayload() {
  const title = commandMacroDraftForm.value.title.trim()
  const shortcutId = normalizeShortcutId(commandMacroDraftForm.value.shortcutId || '')
  const when = (commandMacroDraftForm.value.when || '').trim() || 'mainFocus'
  const steps = commandMacroDraftForm.value.steps
    .filter((step) => step.command)
    .map((step) => ({ command: step.command, delayMs: step.delayMs || 0 }))
  return {
    id: commandMacroDraftMode.value === 'edit' && commandMacroEditId.value
      ? commandMacroEditId.value
      : `macro.${Date.now()}`,
    title: title || '未命名组合命令',
    shortcutId,
    when,
    steps
  }
}

function persistCommandMacrosDrafts(nextMacros, successMessage) {
  const result = saveCommandMacros(nextMacros, {
    warn: () => {}
  })
  if (!result.ok) {
    const message = result.errors?.[0]?.errors?.[0]?.message || '组合命令校验失败'
    ElMessage.error(message)
    return false
  }
  commandMacros.value = result.macros
  commandMacroStorageMode.value = result.storageMode
  refreshCommandMacroState()
  ElMessage.success(successMessage || (result.sqliteSaved ? '组合命令已写入 SQLite' : '组合命令已保存在内存模式'))
  return true
}

async function submitCommandMacroDraft() {
  const draft = buildCommandMacroDraftPayload()
  if (!draft.steps.length) {
    ElMessage.error('请至少选择一个 command')
    return
  }
  if (!draft.shortcutId || !isRecordableShortcutId(draft.shortcutId)) {
    ElMessage.error('请填写有效快捷键')
    return
  }
  try {
    if (draft.when) parseWhenExpression(draft.when)
  } catch (err) {
    ElMessage.error(`When 表达式无效：${err?.message || err}`)
    return
  }
  const conflicts = getShortcutCommandRowConflicts(
    {
      id: draft.id,
      shortcutId: draft.shortcutId,
      when: draft.when
    },
    shortcutConflictRows.value,
    {
      shortcutId: draft.shortcutId,
      when: draft.when
    }
  )
  if (conflicts.length) {
    const ok = await confirmShortcutConflictRows(conflicts, draft.shortcutId)
    if (!ok) return
  }
  const nextMacros = commandMacroDraftMode.value === 'edit'
    ? commandMacros.value.map((macro) => (macro.id === draft.id ? draft : macro))
    : [...commandMacros.value, draft]
  if (!persistCommandMacrosDrafts(
    nextMacros,
    commandMacroDraftMode.value === 'edit' ? '组合命令已更新' : '组合命令草稿已保存'
  )) return
  commandMacroDraftDialogVisible.value = false
  commandMacroDialogVisible.value = true
}

async function deleteCommandMacroDraft(macro) {
  if (!macro?.id) return
  try {
    await ElMessageBox.confirm(`确定删除组合命令“${macro.title || macro.id}”吗？`, '删除组合命令', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    })
    persistCommandMacrosDrafts(
      commandMacros.value.filter((item) => item.id !== macro.id),
      '组合命令已删除'
    )
  } catch (_) {}
}

function cancelCommandMacroRuntime(row) {
  if (!row?.id) return
  if (requestCancelCommandMacroRun(row.id)) {
    ElMessage.warning(`已请求取消组合命令：${row.title || row.id}`)
  }
}

function applyShortcutSearch() {
  shortcutQuery.value = shortcutQueryInput.value.trim()
}

function focusShortcutSearch() {
  nextTick(() => {
    shortcutSearchInputRef.value?.focus?.()
  })
}

function getShortcutConflictRows(row, nextShortcutId) {
  return getShortcutConflictRowsWithWhen(row, nextShortcutId, row.when)
}

function getShortcutConflictRowsWithWhen(row, nextShortcutId, nextWhen) {
  return getShortcutCommandRowConflicts(row, shortcutConflictRows.value, {
    shortcutId: nextShortcutId,
    when: nextWhen
  })
}

async function confirmShortcutConflict(row, nextShortcutId) {
  const conflicts = getShortcutConflictRows(row, nextShortcutId)
  return confirmShortcutConflictRows(conflicts, nextShortcutId)
}

async function confirmShortcutConflictRows(conflicts, nextShortcutId) {
  if (!conflicts.length) return true
  const names = conflicts
    .slice(0, 5)
    .map((item) => `${formatShortcutDisplay(item.shortcutId)} / ${item.commandTitle} / ${item.scopeLabel} / ${getWhenBuilderSummary(item.when)}`)
    .join('；')
  try {
    await ElMessageBox.confirm(
      `该快捷键可能与 ${conflicts.length} 个命令冲突：${names}。仍要保存这个绑定吗？`,
      '快捷键冲突提醒',
      {
        confirmButtonText: '仍然保存',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    return true
  } catch (_) {
    return false
  }
}

function setShortcutOverride(row, overrideValue) {
  hotkeyOverrides.value = applyShortcutOverrideValue(hotkeyOverrides.value, row, overrideValue)
}

function openShortcutEdit(row) {
  shortcutRecordRow.value = row
  recordedShortcutId.value = ''
  recordedShortcutInput.value = row.disabled ? row.defaultShortcutId : row.shortcutId
  shortcutRecordVisible.value = true
}

function focusShortcutRecorder() {
  nextTick(() => {
    shortcutRecorderRef.value?.focus?.()
  })
}

function resetShortcutRecorder() {
  shortcutRecordRow.value = null
  recordedShortcutId.value = ''
  recordedShortcutInput.value = ''
}

function handleShortcutRecordKeydown(e) {
  if (e.key === 'Escape') {
    shortcutRecordVisible.value = false
    return
  }
  const nextShortcutId = eventLikeToShortcutId(e)
  if (!isRecordableShortcutId(nextShortcutId)) {
    recordedShortcutId.value = nextShortcutId
    recordedShortcutInput.value = ''
    return
  }
  recordedShortcutId.value = nextShortcutId
  recordedShortcutInput.value = nextShortcutId
}

async function submitShortcutRecord() {
  const row = shortcutRecordRow.value
  const nextShortcutId = normalizedRecordedShortcutId.value
  if (!row || !nextShortcutId) {
    ElMessage.error('请先录制有效快捷键')
    return
  }
  const ok = await confirmShortcutConflict(row, nextShortcutId)
  if (!ok) return
  setShortcutOverride(row, buildShortcutOverrideValue(row, { shortcutId: nextShortcutId }))
  shortcutRecordVisible.value = false
  ElMessage.success('快捷键已更新，点击保存后生效')
}

function openWhenEdit(row) {
  whenEditRow.value = row
  whenEditInput.value = row.when || ''
  syncWhenBuilderFromInput()
  whenEditVisible.value = true
  validateWhenEdit()
}

function resetWhenEditor() {
  whenEditRow.value = null
  whenEditInput.value = ''
  whenEditError.value = ''
  whenEditConflictLabel.value = ''
  whenEditMode.value = 'builder'
  whenBuilderOperator.value = '&&'
  whenBuilderStates.value = {}
}

function syncWhenBuilderFromInput() {
  const parsed = parseWhenToSelection(whenEditInput.value)
  whenBuilderOperator.value = parsed.selection.operator || '&&'
  whenBuilderStates.value = { ...(parsed.selection.states || {}) }
  whenEditMode.value = parsed.mode === 'builder' ? 'builder' : 'text'
}

function syncWhenInputFromBuilder() {
  whenEditInput.value = buildWhenExpression({
    operator: whenBuilderOperator.value,
    states: whenBuilderStates.value
  })
  validateWhenEdit()
}

function setWhenBuilderState(key, state) {
  const next = { ...whenBuilderStates.value }
  if (!state || next[key] === state) delete next[key]
  else next[key] = state
  whenBuilderStates.value = next
  syncWhenInputFromBuilder()
}

function setWhenBuilderOperator(operator) {
  whenBuilderOperator.value = operator === '||' ? '||' : '&&'
  syncWhenInputFromBuilder()
}

function switchWhenEditMode(mode) {
  if (mode === 'builder') {
    syncWhenBuilderFromInput()
    if (whenEditMode.value !== 'builder') {
      ElMessage.warning('当前 When 较复杂，已保留文本模式')
    }
    return
  }
  whenEditMode.value = 'text'
}

function validateWhenEdit() {
  const row = whenEditRow.value
  whenEditError.value = ''
  whenEditConflictLabel.value = ''
  try {
    if (whenEditInput.value.trim()) parseWhenExpression(whenEditInput.value)
  } catch (err) {
    whenEditError.value = `When 表达式无效：${err?.message || err}`
    return
  }
  if (!row) return
  const conflicts = getShortcutConflictRowsWithWhen(row, row.shortcutId, whenEditInput.value.trim())
  if (conflicts.length) {
    whenEditConflictLabel.value = `可能与 ${conflicts.length} 个同快捷键命令冲突`
  }
}

function applyWhenEditPreset(nextWhen) {
  whenEditInput.value = nextWhen
  syncWhenBuilderFromInput()
  validateWhenEdit()
}

async function submitWhenEdit() {
  const row = whenEditRow.value
  const nextWhen = whenEditInput.value.trim()
  if (!row) return
  validateWhenEdit()
  if (whenEditError.value) return
  const conflicts = getShortcutConflictRowsWithWhen(row, row.shortcutId, nextWhen)
  if (conflicts.length) {
    const ok = await confirmShortcutConflictRows(conflicts, row.shortcutId)
    if (!ok) return
  }
  setShortcutOverride(row, buildShortcutOverrideValue(row, { when: nextWhen }))
  whenEditVisible.value = false
  ElMessage.success('When 已更新，点击保存后生效')
}

async function disableShortcut(row) {
  try {
    await ElMessageBox.confirm(`确定禁用“${row.commandTitle}”的快捷键 ${formatShortcutDisplay(row.shortcutId)} 吗？`, '禁用快捷键', {
      confirmButtonText: '禁用',
      cancelButtonText: '取消',
      type: 'warning'
    })
    hotkeyOverrides.value = disableShortcutOverride(hotkeyOverrides.value, row)
    ElMessage.success('快捷键已禁用，点击保存后生效')
  } catch (_) {}
}

function restoreShortcutDefault(row) {
  setShortcutOverride(row, undefined)
  ElMessage.success('已恢复默认，点击保存后生效')
}

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
  { key: 'title', label: '功能', minWidth: 260 },
  { key: 'commandDisplay', label: '动作 / 命令', minWidth: 240 }
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
    shortcutSummary: getOperationShortcutSummary(o.id, shortcutCommandRows.value, formatShortcutDisplay),
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
    shortcutSummary: {
      count: 0,
      activeCount: 0,
      label: '无直接快捷键',
      query: '',
      hint: '自定义功能暂未接入 command 快捷键'
    },
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
      row.shortcutSummary?.label,
      row.shortcutSummary?.hint,
      row.shortcutSummary?.query,
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

function openFeatureShortcut(row) {
  const query = row?.shortcutSummary?.query || row?.id || ''
  activeTab.value = 'shortcut'
  shortcutQueryInput.value = query
  shortcutQuery.value = query
  focusShortcutSearch()
}

function openShortcutSystemConfig() {
  activeTab.value = 'shortcut'
  shortcutScope.value = 'all'
  shortcutQueryInput.value = ''
  shortcutQuery.value = ''
  focusShortcutSearch()
}

function openContextMenuShortcut(row) {
  const query = row?.shortcutSummary?.query || row?.commandId || row?.id || ''
  contextMenuDialogVisible.value = false
  activeTab.value = 'shortcut'
  shortcutScope.value = 'all'
  shortcutQueryInput.value = query
  shortcutQuery.value = query
  focusShortcutSearch()
}

function allowContextMenuActionDrag(evt) {
  return evt?.draggedContext?.element?.orderable !== false
}

function handleContextMenuActionDragEnd({ rows }) {
  if (!Array.isArray(rows) || !rows.length) return
  contextMenuDrawerOrder.value = buildContextMenuDrawerOrderFromRows(rows)
  utools.dbStorage.setItem('drawer.order', contextMenuDrawerOrder.value)
  ElMessage.success('右键菜单顺序已更新')
}

function restoreContextMenuOrder() {
  contextMenuDrawerOrder.value = []
  utools.dbStorage.setItem('drawer.order', [])
  ElMessage.success('右键菜单已恢复默认顺序')
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

function openUtoolsHotkeySetting(label) {
  if (typeof utools !== 'undefined' && typeof utools?.redirectHotKeySetting === 'function') {
    utools.redirectHotKeySetting(label)
    return
  }
  ElMessage.info(`当前环境不支持跳转，请在 uTools 全局功能中搜索“${label}”并绑定快捷键`)
}

async function handleRetryStorageMigration() {
  if (typeof window.retryStorageMigration !== 'function') {
    ElMessage.error('当前环境不支持手动迁移重试')
    return
  }
  isRetryingMigration.value = true
  try {
    await window.retryStorageMigration()
    refreshStorageStatus()
    ElMessage.success('迁移重试成功，已切换到 SQLite')
  } catch (err) {
    refreshStorageStatus()
    ElMessage.error(`迁移重试失败：${err?.message || err}`)
  } finally {
    isRetryingMigration.value = false
  }
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
      order: featureOrder.value,
      drawerOrder: contextMenuDrawerOrder.value
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
  const shortcutSaveResult = saveShortcutSettingsPayload(payload, {
    overrides: hotkeyOverrides.value,
    saveSetting
  })
  shortcutStorageMode.value = shortcutSaveResult.storageMode
  hotkeyOverrides.value = shortcutSaveResult.hotkeyOverrides
  showShortcutSaveMessage(shortcutSaveResult, '保存')
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
      const shortcutRestoreResult = saveShortcutSettingsPayload(restored, {
        overrides: restored.hotkeyOverrides || {},
        saveSetting
      })
      const restoredSetting = shortcutRestoreResult.setting
      path.value = restoredSetting.database.path[nativeId]
      maxsize.value = restoredSetting.database.maxsize ?? unlimitedVal
      maxage.value = restoredSetting.database.maxage ?? unlimitedVal
      shown.value = sortShownByOrder(restoredSetting.operation?.shown || [], featureOrder.value)
      custom.value = (restoredSetting.operation?.custom || []).map((c) => ({ ...c }))
      featureOrder.value = buildFeatureOrder(restoredSetting.operation?.order, custom.value.map((c) => c.id))
      contextMenuDrawerOrder.value = Array.isArray(restoredSetting.operation?.drawerOrder)
        ? restoredSetting.operation.drawerOrder
        : []
      utools.dbStorage.setItem('drawer.order', contextMenuDrawerOrder.value)
      syncShownOrder()
      hotkeyOverrides.value = shortcutRestoreResult.hotkeyOverrides
      shortcutStorageMode.value = shortcutRestoreResult.storageMode
      const restoredHoverPreviewConfig = getHoverPreviewConfig(restoredSetting)
      hoverPreviewEnabled.value = restoredHoverPreviewConfig.enabled
      hoverPreviewDelay.value = restoredHoverPreviewConfig.delay
      showShortcutSaveMessage(shortcutRestoreResult, '重置')
    })
    .catch(() => {})
}

const keyDownHandler = (e) => {
  if (e.__hotkeyHandled) return
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
  window.addEventListener(STORAGE_STATUS_EVENT, refreshStorageStatus)
  window.addEventListener(COMMAND_MACRO_RUNTIME_EVENT, refreshCommandMacroRuntime)
  refreshStorageStatus()
  refreshCommandMacroRuntime()
  if (storageStatus.value.noticeUnread) {
    storageStatus.value = markStorageNoticeRead()
  }
  disposeSettingCommandHandlers = registerCommandFeaturePairs([
    { featureId: 'setting-scroll-up', commandId: 'setting.scroll.up', handler: () => scrollSettingBy(-120) },
    { featureId: 'setting-scroll-down', commandId: 'setting.scroll.down', handler: () => scrollSettingBy(120) },
    { featureId: 'setting-tab-prev', commandId: 'setting.tab.prev', handler: () => switchSettingTabByOffset(-1) },
    { featureId: 'setting-tab-next', commandId: 'setting.tab.next', handler: () => switchSettingTabByOffset(1) }
  ])
  activateLayer('setting')
  document.addEventListener('keydown', keyDownHandler)
})

watch(hoverPreviewEnabled, (enabled) => {
  if (enabled) {
    ensureHoverPreviewDelay()
  }
})

onUnmounted(() => {
  window.removeEventListener(STORAGE_STATUS_EVENT, refreshStorageStatus)
  window.removeEventListener(COMMAND_MACRO_RUNTIME_EVENT, refreshCommandMacroRuntime)
  document.removeEventListener('keydown', keyDownHandler)
  disposeSettingCommandHandlers?.()
  disposeSettingCommandHandlers = null
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
  justify-content: space-between;
  gap: 12px;
}
.setting-section-head-main {
  min-width: 0;
}
.setting-section-subtitle {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-color-lighter);
}
.shortcut-count {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-color-lighter);
}
.shortcut-storage-status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 26px;
  margin-top: 8px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(28, 113, 82, 0.18);
  background: rgba(28, 113, 82, 0.08);
  color: #16684a;
  font-size: 12px;
  font-weight: 600;
  &.fallback {
    color: var(--text-color-lighter);
    border-color: var(--border-color);
    background: var(--bg-soft-color);
    .shortcut-storage-dot {
      background: var(--text-color-lighter);
      box-shadow: none;
    }
  }
}
.shortcut-storage-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #1c7152;
  box-shadow: 0 0 0 3px rgba(28, 113, 82, 0.12);
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
.setting-static-value {
  display: inline-flex;
  align-items: center;
  max-width: min(520px, 58vw);
  min-height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  background: var(--bg-soft-color);
  border: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.setting-static-value--danger {
  color: #b42318;
  border-color: rgba(180, 35, 24, 0.28);
  background: rgba(255, 241, 240, 0.88);
}
.storage-progress {
  flex: 1;
  min-width: 180px;
  max-width: 520px;
}
.setting-row--hint {
  margin-top: -4px;
}
.setting-inline-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-color-lighter);
}
.path {
  flex: 1;
}
.number-select {
  width: 110px;
}
.operation-select {
  min-width: 260px;
}
.operation-select--popover {
  width: 100%;
}

.shortcut-key-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 26px;
  max-width: 100%;
  padding: 3px 8px;
  background: var(--bg-soft-color);
  border: 1px solid var(--border-color);
  border-radius: 7px;
  font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shortcut-desc-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 100%;
}
.shortcut-command-cell {
  min-width: 0;
}
.shortcut-command-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.shortcut-command-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
  color: var(--text-color);
}
.shortcut-command-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 5px;
  font-size: 11px;
  color: var(--text-color-lighter);
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.shortcut-risk-tag,
.shortcut-source-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.shortcut-risk-tag {
  color: #b42318;
  background: rgba(255, 241, 240, 0.88);
  border: 1px solid rgba(180, 35, 24, 0.22);
}
.shortcut-source-tag {
  color: var(--text-color-lighter);
  background: var(--bg-soft-color);
  border: 1px solid var(--border-color);
  &.user {
    color: var(--primary-color);
    border-color: rgba(53, 95, 157, 0.26);
    background: rgba(53, 95, 157, 0.08);
  }
}
.shortcut-when-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-color-lighter);
}
.shortcut-record-dialog :deep(.el-dialog__body) {
  padding: 18px 24px 10px;
}
.shortcut-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 132px;
  padding: 18px;
  border: 1px dashed rgba(53, 95, 157, 0.38);
  border-radius: 12px;
  background: var(--bg-soft-color);
  outline: none;
  &:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px rgba(53, 95, 157, 0.12);
  }
}
.shortcut-recorder-label {
  font-size: 12px;
  color: var(--text-color-lighter);
}
.shortcut-recorder-key {
  max-width: 100%;
  min-height: 34px;
  padding: 6px 12px;
  border-radius: 9px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
  color: var(--primary-color);
  font-size: 18px;
  font-weight: 700;
  font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.shortcut-recorder-meta {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-color-lighter);
}
.shortcut-recorder-manual {
  margin-top: 12px;
}
.when-edit-dialog :deep(.el-dialog__body) {
  padding: 18px 24px 10px;
}
.when-editor-head {
  margin-bottom: 12px;
}
.when-editor-mode-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.when-editor-summary {
  min-width: 0;
  margin-left: auto;
  color: var(--text-color-lighter);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.when-editor-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--text-color);
}
.when-editor-meta {
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-color-lighter);
  font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.when-editor-status {
  margin-top: 10px;
  min-height: 22px;
  font-size: 12px;
  color: var(--text-color-lighter);
  &.error {
    color: #b42318;
  }
}
.when-editor-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.when-builder {
  display: grid;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background: var(--bg-soft-color);
}
.when-builder-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-color-lighter);
  font-size: 12px;
}
.when-builder-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.when-builder-group {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-elevated-color);
}
.when-builder-group-title {
  margin-bottom: 8px;
  color: var(--text-color);
  font-size: 12px;
  font-weight: 700;
}
.when-builder-options {
  display: grid;
  gap: 7px;
}
.when-builder-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}
.when-builder-option-label {
  min-width: 0;
  color: var(--text-color-lighter);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.when-builder-option-actions {
  display: inline-flex;
  gap: 4px;
}
.when-state-btn {
  width: 28px;
  height: 24px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-color-lighter);
  font-size: 12px;
  cursor: pointer;
  &.active {
    border-color: color-mix(in srgb, var(--primary-color) 40%, transparent);
    background: color-mix(in srgb, var(--primary-color) 12%, transparent);
    color: var(--primary-color);
    font-weight: 700;
  }
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
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
}
.feature-add-btn {
  flex-shrink: 0;
}
.feature-toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.72);
}
.feature-toolbar-main {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(220px, 0.9fr);
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.feature-quick-card {
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-elevated-color);
}
.feature-quick-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.feature-inline-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(53, 95, 157, 0.2);
  border-radius: 999px;
  background: var(--bg-soft-color);
  color: var(--primary-color);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.feature-quick-card-desc {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-color-lighter);
}
.feature-field {
  min-width: 0;
}
.feature-field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color-lighter);
}
.feature-field-search {
  max-width: 360px;
}
.feature-select-popover-body {
  display: grid;
  gap: 10px;
}
.feature-select-popover-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color);
}
.feature-table-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
}
.feature-table-title {
  font-size: 16px;
}
.feature-table-tip {
  font-size: 12px;
  color: var(--text-color-lighter);
}
.feature-cell-main {
  display: grid;
  gap: 6px;
}
.feature-cell-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.feature-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.feature-meta-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-color-lighter);
  background: var(--bg-soft-color);
  border: 1px solid var(--border-color);
  &.custom {
    color: var(--primary-color);
    border-color: rgba(53, 95, 157, 0.2);
  }
}
.feature-meta-text {
  font-size: 12px;
  color: var(--text-color-lighter);
}
.feature-command-cell {
  display: grid;
  gap: 6px;
  align-content: center;
  min-height: 42px;
}
.feature-command-text {
  display: inline-block;
  max-width: 100%;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-color-lighter);
  word-break: break-all;
}
.feature-shortcut-link {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 6px;
  border: 1px solid rgba(53, 95, 157, 0.2);
  background: rgba(53, 95, 157, 0.08);
  color: var(--primary-color);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.feature-shortcut-link:hover {
  border-color: rgba(53, 95, 157, 0.35);
  background: rgba(53, 95, 157, 0.12);
}
.feature-shortcut-link:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
.feature-shortcut-muted {
  font-size: 12px;
  color: var(--text-color-lighter);
}
@media (max-width: 900px) {
  .feature-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
  .feature-toolbar-main {
    grid-template-columns: 1fr;
  }
  .feature-field-search {
    max-width: none;
  }
  .feature-table-head {
    align-items: flex-start;
    flex-direction: column;
  }
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
.feature-config-desc {
  margin: 8px 0 0;
  max-width: 360px;
  color: var(--text-color-lighter);
  font-size: 12px;
  line-height: 1.5;
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
.feature-config-action {
  flex: 0 0 auto;
  white-space: nowrap;
}
.feature-config-actions {
  flex-wrap: wrap;
}
.feature-config-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid rgba(28, 113, 82, 0.18);
  border-radius: 999px;
  background: rgba(28, 113, 82, 0.08);
  color: #16684a;
  font-size: 12px;
  font-weight: 700;
  &.fallback {
    border-color: rgba(153, 99, 20, 0.24);
    background: rgba(153, 99, 20, 0.10);
    color: #8a5a12;
  }
}
.command-macro-dialog :deep(.el-dialog__body) {
  padding: 16px 20px 18px;
}
.command-macro-cell {
  min-width: 0;
}
.command-macro-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 650;
  color: var(--text-color);
}
.context-menu-action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  margin-right: 6px;
}
.command-macro-meta,
.command-macro-dialog-note {
  margin-top: 5px;
  font-size: 12px;
  color: var(--text-color-lighter);
}
.command-macro-meta,
.command-macro-steps {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.command-macro-steps {
  font-family: 'SFMono-Regular', 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  color: var(--text-color-lighter);
}
.command-macro-step-list {
  display: grid;
  gap: 10px;
  width: 100%;
}
.command-macro-step-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 96px 44px;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.command-macro-delay-input {
  width: 96px;
  height: 32px;
  box-sizing: border-box;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 8px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 12px;
  outline: none;
}
.command-macro-delay-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary-color) 14%, transparent);
}
.command-macro-step-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--bg-soft-color);
  color: var(--text-color-lighter);
  font-size: 12px;
  font-weight: 700;
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
