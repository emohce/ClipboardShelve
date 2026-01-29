<template>
  <div class="setting">
    <el-card class="setting-card">
      <div class="setting-card-content">
        <el-space direction="vertical" :size="18" fill>
          <div class="setting-card-content-item">
            <div class="setting-section-title">存储</div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span>剪贴板监听程序状态</span>
              <el-tag :type="listenStatus ? 'success' : 'warning'" title="监听程序状态">
                {{ listenStatus ? '已安装' : '未安装' }}
              </el-tag>
            </div>
            <div class="setting-row">
              <span>数据库路径</span>
              <el-input class="path" v-model="path" :title="path" disabled></el-input>
              <el-button type="primary" @click="handlePathBtnClick('modify')">修改</el-button>
              <el-button @click="handlePathBtnClick('open')" v-show="path">打开</el-button>
              <input type="file" id="database-path" :style="{ display: 'none' }" />
            </div>
            <div class="setting-row">
              <span>最大历史条数</span>
              <el-select class="number-select" v-model="maxsize" fit-input-width>
                <el-option v-for="n in [500, 600, 700, 800, 900, 1000]" :key="n" :value="n" />
              </el-select>
              条
            </div>
            <div class="setting-row">
              <span>最长保存时间</span>
              <el-select class="number-select" v-model="maxage" fit-input-width>
                <el-option v-for="n in [1, 3, 5, 7, 14, 31]" :key="n" :value="n" />
              </el-select>
              天
            </div>
          </div>

          <div class="setting-card-content-item">
            <div class="setting-section-title">展示</div>
            <el-divider></el-divider>
            <div class="setting-row">
              <span>展示在主界面的功能</span>
              <el-select
                class="operation-select"
                v-model="shown"
                multiple
                :multiple-limit="5"
                placeholder="请选择"
              >
                <el-option
                  v-for="{ id, title, icon } in [
                    ...defaultOperation,
                    ...custom.map(({ id, title, icon }) => ({ id, title, icon }))
                  ]"
                  :key="id"
                  :label="icon + ' ' + title"
                  :value="id"
                />
              </el-select>
            </div>
          </div>

          <div class="setting-card-content-item">
            <div class="setting-section-title">快捷键说明</div>
            <el-divider></el-divider>
            <div class="shortcut-list">
              <div class="shortcut-item">
                <span class="shortcut-key">↑ ↓</span>
                <span class="shortcut-desc">上下导航选择项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">← →</span>
                <span class="shortcut-desc">左右切换分页</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Enter</span>
                <span class="shortcut-desc">复制选中的剪贴板内容</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Ctrl + Enter</span>
                <span class="shortcut-desc">复制并锁定选中的内容</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Space</span>
                <span class="shortcut-desc">向下多选项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Ctrl/Cmd + D</span>
                <span class="shortcut-desc">收藏/取消收藏选中项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Ctrl/Cmd + U</span>
                <span class="shortcut-desc">锁定/解锁选中项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Delete/Backspace</span>
                <span class="shortcut-desc">删除选中项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Shift + Delete</span>
                <span class="shortcut-desc">强制删除（包括锁定项目）</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Shift（按住）</span>
                <span class="shortcut-desc">预览图片内容</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">数字键 1-9</span>
                <span class="shortcut-desc">快速复制对应位置的项目</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Esc</span>
                <span class="shortcut-desc">退出设置页/关闭对话框</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Tab</span>
                <span class="shortcut-desc">在清除对话框中切换选项</span>
              </div>
              <div class="shortcut-item">
                <span class="shortcut-key">Ctrl + Delete</span>
                <span class="shortcut-desc">强制删除选中项目（包括锁定项）</span>
              </div>
            </div>
          </div>

          <div class="setting-card-content-item">
            <div class="setting-section-title">自定义功能</div>
            <el-divider></el-divider>
            <el-input v-model="stringCustom" :rows="5" type="textarea" placeholder="请填写 JSON 数组" />
          </div>
        </el-space>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import setting from '../global/readSetting'
import restoreSetting from '../global/restoreSetting'
import defaultOperation from '../data/operation.json'
import { getNativeId } from '../utils'

const emit = defineEmits(['back'])
const { database, operation } = setting
const nativeId = getNativeId()

const path = ref(database.path[nativeId])
const maxsize = ref(database.maxsize)
const maxage = ref(database.maxage)

const shown = ref(operation.shown)
const custom = ref(operation.custom)
const stringCustom = ref(JSON.stringify(operation.custom))

const listenStatus = ref(false)

const handleSaveBtnClick = () => {
  // 校验格式
  if (path.value === '') {
    ElMessage.error('数据库路径不能为空')
    return
  } else if (path.value.indexOf('_utools_clipboard_manager_storage') === -1) {
    ElMessage.error('数据库路径不正确')
    return
  }
  if (stringCustom.value === '') {
    // 如果将全部清空 则默认为空数组
    stringCustom.value = '[]'
  }
  if (!/^\[.*\]$/.test(stringCustom.value)) {
    ElMessage.error('自定义功能格式不正确')
    return
  }
  try {
    custom.value = JSON.parse(stringCustom.value)
  } catch (error) {
    custom.value = operation.custom
    stringCustom.value = JSON.stringify(custom.value)
    ElMessage.error('自定义功能格式不正确')
    return
  }
  // 执行保存到utools本地数据库
  utools.dbStorage.setItem(
    'setting',
    JSON.parse(
      JSON.stringify({
        database: {
          path: {
            ...database.path,
            [nativeId]: path.value
          },
          maxsize: maxsize.value,
          maxage: maxage.value
        },
        operation: {
          shown: shown.value,
          custom: custom.value
        }
      })
    )
  )
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
      restoreSetting()
      ElMessage({
        message: '重置成功 重启插件生效',
        type: 'success'
      })
    })
    .catch(() => {})
}

// 键盘监听事件 监听ESC按下 退出设置页
const keyDownHandler = (e) => {
  if (e.key === 'Escape') {
    emit('back')
    e.stopPropagation()
  }
}

onMounted(() => {
  listenStatus.value = window.listener.listening
  document.addEventListener('keydown', keyDownHandler)
})

onUnmounted(() => {
  // 移除监听事件
  document.removeEventListener('keydown', keyDownHandler)
})
</script>

<style lang="less" scoped>

// 定义颜色变量以解决作用域问题
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

// 使用CSS变量
@primary-color: var(--primary-color);
@primary-color-lighter: var(--primary-color-lighter);
@text-color: var(--text-color);
@text-color-lighter: var(--text-color-lighter);
@text-bg-color: var(--text-bg-color);
@text-bg-color-lighter: var(--text-bg-color-lighter);
@nav-bg-color: var(--nav-bg-color);
@nav-hover-bg-color: var(--nav-hover-bg-color);
@bg-color: var(--bg-color);

// 定义fade函数
.fade(@color, @percent) {
  @result: rgba(red(@color), green(@color), blue(@color), @percent);
}
.setting-card-content {
  padding: 12px 6px 4px;
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
.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
}
.shortcut-key {
  min-width: 120px;
  padding: 4px 8px;
  background: var(--text-bg-color);
  border: 1px solid var(--text-bg-color-lighter);
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: var(--primary-color);
  text-align: center;
}
.shortcut-desc {
  color: var(--text-color);
  font-size: 14px;
}
</style>
