import restoreSetting from './restoreSetting'
import { defaultPath } from './restoreSetting'
import { getNativeId } from '../utils'

const setting = utools.dbStorage.getItem('setting') || restoreSetting()
const nativeId = getNativeId()

if (!setting.hotkeyOverrides || typeof setting.hotkeyOverrides !== 'object') {
  setting.hotkeyOverrides = {}
}

// 迁移：确保操作列表包含编辑标签功能
if (Array.isArray(setting.operation?.shown) && !setting.operation.shown.includes('edit-tags')) {
  setting.operation.shown.splice(setting.operation.shown.indexOf('un-collect') + 1 || setting.operation.shown.length, 0, 'edit-tags')
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

export default setting
