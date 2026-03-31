import defaultSetting from '../data/setting.json'
import { pointToObj, getNativeId } from '../utils'
const { utools } = window.exports

const defaultPath = `${utools.isMacOs() ? utools.getPath('userData') : utools.getPath('home')}${window.exports.sep
  }_utools_clipboard_manager_storage`

const nativeId = getNativeId()

function normalizeDefaultSetting(rawSetting) {
  const hasPointKey = Object.keys(rawSetting || {}).some((key) => key.includes('.'))
  if (hasPointKey) return pointToObj(rawSetting)
  return JSON.parse(JSON.stringify(rawSetting || {}))
}

export default function restoreSetting() {
  const setting = normalizeDefaultSetting(defaultSetting)
  setting.database.path[nativeId] = defaultPath // 根据不同设备设置不同的默认路径
  setting.hotkeyOverrides = {}
  utools.dbStorage.setItem('setting', setting)
  return setting
}

export { defaultPath }
