import restoreSetting from './restoreSetting'
import { defaultPath } from './restoreSetting'
import { getNativeId } from '../utils'
import defaultSetting from '../data/setting.json'

export const SETTING_UPDATED_EVENT = 'ezclipboard:setting-updated'

const setting = utools.dbStorage.getItem('setting') || restoreSetting()
const nativeId = getNativeId()

const defaultOperation = JSON.parse(JSON.stringify(defaultSetting.operation || {}))

if (!setting.hotkeyOverrides || typeof setting.hotkeyOverrides !== 'object') {
  setting.hotkeyOverrides = {}
}

if (!setting.userConfig || typeof setting.userConfig !== 'object') {
  setting.userConfig = {}
}

if (!setting.database || typeof setting.database !== 'object') {
  setting.database = {}
}

if (!setting.userConfig.preview || typeof setting.userConfig.preview !== 'object') {
  setting.userConfig.preview = {}
}

if (!setting.userConfig.preview.hover || typeof setting.userConfig.preview.hover !== 'object') {
  setting.userConfig.preview.hover = {}
}

if (!setting.operation || typeof setting.operation !== 'object') {
  setting.operation = {}
}

if (!Array.isArray(setting.operation.shown)) {
  setting.operation.shown = [...(defaultOperation.shown || [])]
}

if (!Array.isArray(setting.operation.custom)) {
  setting.operation.custom = [...(defaultOperation.custom || [])]
}

if (!Array.isArray(setting.operation.order)) {
  const customIds = setting.operation.custom.map((item) => item?.id).filter(Boolean)
  setting.operation.order = [
    ...((defaultOperation.order || defaultOperation.shown || []).filter(Boolean)),
    ...customIds
  ].filter((id, index, arr) => arr.indexOf(id) === index)
}

if (setting.database.maxsize === undefined) {
  setting.database.maxsize = null
}

if (typeof setting.userConfig.preview.hover.enabled !== 'boolean') {
  setting.userConfig.preview.hover.enabled = false
}

const hoverDelay = Number(setting.userConfig.preview.hover.delay)
if (!Number.isFinite(hoverDelay) || hoverDelay < 0) {
  setting.userConfig.preview.hover.delay = 500
} else {
  setting.userConfig.preview.hover.delay = Math.round(hoverDelay)
}

// 迁移：确保操作列表包含编辑标签功能
if (Array.isArray(setting.operation?.shown) && !setting.operation.shown.includes('edit-tags')) {
  setting.operation.shown.splice(setting.operation.shown.indexOf('un-collect') + 1 || setting.operation.shown.length, 0, 'edit-tags')
}

// 迁移：默认操作列表补充独立「粘贴」入口，保持「复制」与「粘贴」语义分离
if (Array.isArray(setting.operation?.shown) && !setting.operation.shown.includes('paste')) {
  setting.operation.shown.splice(setting.operation.shown.indexOf('copy') + 1 || 0, 0, 'paste')
}

// 迁移：旧默认「14天」或缺失时改为「不限制」(null)，与初始代码默认一致；null 在设置页展示为「无限」
if (setting.database.maxage == null || setting.database.maxage === 14) {
  setting.database.maxage = null
}

// 旧版本的setting中path是字符串，新版本的path是对象
if (typeof setting.database.path === 'string') {
  setting.database.path = {
    [nativeId]: setting.database.path
  }
} else {
  // 新版本的setting中path是对象，但是没有当前平台的路径
  if (!setting.database.path[nativeId]) {
    setting.database.path[nativeId] = defaultPath
  }
}

// 将设置更新到数据库
utools.dbStorage.setItem('setting', setting)

export function syncSetting(nextSetting) {
  const currentKeys = Object.keys(setting)
  const nextKeys = Object.keys(nextSetting || {})

  currentKeys.forEach((key) => {
    if (!nextKeys.includes(key)) delete setting[key]
  })

  nextKeys.forEach((key) => {
    setting[key] = nextSetting[key]
  })

  window.dispatchEvent(new CustomEvent(SETTING_UPDATED_EVENT, { detail: setting }))
  return setting
}

export function saveSetting(nextSetting) {
  const cloned = JSON.parse(JSON.stringify(nextSetting))
  utools.dbStorage.setItem('setting', cloned)
  return syncSetting(cloned)
}

export function getHoverPreviewConfig(source = setting) {
  const enabled = Boolean(source?.userConfig?.preview?.hover?.enabled)
  const delayValue = Number(source?.userConfig?.preview?.hover?.delay)
  const delay = Number.isFinite(delayValue) && delayValue >= 0 ? Math.round(delayValue) : 500

  return {
    enabled,
    delay
  }
}

export default setting
