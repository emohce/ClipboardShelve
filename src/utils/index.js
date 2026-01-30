const { utools, existsSync, writeFileSync, mkdirSync, sep, Buffer } = window.exports
const readFileSync = window.exports.readFileSync

const dateFormat = (timeStamp) => {
  const startTime = new Date(timeStamp) // 开始时间
  const endTime = new Date() // 结束时间
  const gaps = [
    Math.floor((endTime - startTime) / 1000 / 60), // 分钟
    Math.floor((endTime - startTime) / 1000 / 60 / 60), // 小时
    Math.floor((endTime - startTime) / 1000 / 60 / 60 / 24) // 天
  ]
  let info = ''
  if (gaps[2] > 0) {
    info = `${gaps[2]}天前`
  } else if (gaps[1] > 0) {
    info = `${gaps[1]}小时前`
  } else if (gaps[0] > 0) {
    info = `${gaps[0]}分钟前`
  } else {
    info = '刚刚'
  }
  return info
}

const pointToObj = (objWithPointKey) => {
  let rtnObj = {}
  for (const key in objWithPointKey) {
    const keys = key.split('.')
    let obj = rtnObj
    for (let i = 0; i < keys.length; i++) {
      if (i === keys.length - 1) {
        obj[keys[i]] = objWithPointKey[key]
      } else {
        if (!obj[keys[i]]) obj[keys[i]] = {}
        obj = obj[keys[i]]
      }
    }
  }
  return rtnObj
}

const copy = (item, isHideMainWindow = true) => {
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (dataUrl) utools.copyImage(dataUrl)
      break
    }
    case 'file':
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      break
  }
  isHideMainWindow && utools.hideMainWindow()
}

const paste = () => {
  if (utools.isMacOs()) utools.simulateKeyboardTap('v', 'command')
  else utools.simulateKeyboardTap('v', 'ctrl')
}

const isUToolsPlugin = () => {
  return typeof utools !== 'undefined' && utools.getNativeId
}

/** 与前端 isValidImageData 一致：仅当 data 为合法 base64 数据 URL */
const isValidImageData = (data) => {
  if (!data || typeof data !== 'string') return false
  return data.startsWith('data:image/') && data.includes('base64,')
}

/** 能展示就能复制：返回可用于 copyImage 的 data URL（base64 或从路径/ file:// 读取） */
const getImageDataUrlForCopy = (item) => {
  if (!item || item.type !== 'image' || !item.data || typeof item.data !== 'string') return null
  if (isValidImageData(item.data)) return item.data
  let path = item.data
  if (path.startsWith('file://')) {
    path = path.slice(path.indexOf('://') + 3).replace(/^\/+/, '').replace(/\//g, sep)
  }
  if (!path) return null
  try {
    const buf = readFileSync(path)
    if (!buf || !buf.length) return null
    const ext = path.split(/[\\/]/).pop().split('.').pop()?.toLowerCase() || ''
    const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' }[ext] || 'image/png'
    const base64 = Buffer.from(buf).toString('base64')
    return `data:${mime};base64,${base64}`
  } catch (e) {
    return null
  }
}

const copyWithSearchFocus = (item) => {
  // 复制到剪切板
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (dataUrl) utools.copyImage(dataUrl)
      break
    }
    case 'file':
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      break
  }

  // 图片无可用于复制的数据时未执行复制，不继续粘贴
  if (item.type === 'image' && !getImageDataUrlForCopy(item)) {
    return
  }

  // uTools 插件环境：主窗口(main)=插件内固定，只复制不粘贴；分离窗口(detach)=不固定，复制后自动粘贴到光标
  if (isUToolsPlugin()) {
    if (utools.getWindowType && utools.getWindowType() === 'main') {
      return
    }
  }

  // 非插件环境 或 分离窗口：先退出搜索焦点，再粘贴到外部光标位置
  const searchInput = document.querySelector('.clip-search-input')
  if (document.activeElement === searchInput) {
    searchInput.blur()
    setTimeout(() => paste(), 50)
  } else {
    paste()
  }
}

const copyOnly = (item) => {
  // 仅复制到剪切板，不执行任何其他操作
  switch (item.type) {
    case 'text':
      utools.copyText(item.data)
      break
    case 'image': {
      const dataUrl = getImageDataUrlForCopy(item)
      if (dataUrl) utools.copyImage(dataUrl)
      break
    }
    case 'file':
      const paths = JSON.parse(item.data).map((file) => file.path)
      utools.copyFile(paths)
      break
  }
}

const createFile = (item) => {
  const tempPath = utools.getPath('temp')
  const folderPath = tempPath + sep + 'utools-clipboard-manager'
  if (!existsSync(folderPath)) {
    try {
      mkdirSync(folderPath)
    } catch (err) {
      utools.showNotification('创建临时文件夹出错: ' + err)
    }
  }
  const { type } = item
  if (type === 'image') {
    const base64Data = item.data.replace(/^data:image\/\w+;base64,/, '') // remove the prefix
    const buffer = Buffer.from(base64Data, 'base64') // to Buffer
    const filePath = folderPath + sep + new Date().valueOf() + '.png'
    writeFileSync(filePath, buffer)
    return filePath
  } else if (type === 'text') {
    const filePath = folderPath + sep + new Date().valueOf() + '.txt'
    writeFileSync(filePath, item.data)
    return filePath
  }
}

const getNativeId = () => {
  return utools.getNativeId()
}

export { dateFormat, pointToObj, copy, paste, createFile, getNativeId, isUToolsPlugin, copyWithSearchFocus, copyOnly }
