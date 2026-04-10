const { utools, existsSync, writeFileSync, mkdirSync, sep, Buffer } = window.exports
const readFileSync = window.exports.readFileSync

const bufferSignature = (buffer) => {
  const c = window.exports.crypto
  if (c && typeof c.createHash === 'function') {
    return c.createHash('md5').update(buffer).digest('hex')
  }
  return 'len:' + buffer.length
}

const sanitizeForPathSegment = (id) => String(id || 'unknown').replace(/[\\/:*?"<>|]/g, '_')

const getAliasMaterialPersistRoot = () => {
  const base = utools.getPath('userData')
  const root = base + sep + 'utools-clipboard-manager' + sep + 'alias-material'
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true })
  }
  return root
}

const getAliasMaterialDirForItem = (itemId) => {
  return getAliasMaterialPersistRoot() + sep + sanitizeForPathSegment(itemId)
}

const tryRemoveAliasMaterialDir = (dir) => {
  if (!dir || !existsSync(dir)) return
  const rm = window.exports.rmSync
  if (typeof rm === 'function') {
    try {
      rm(dir, { recursive: true, force: true })
      console.log('[alias-material] removed', dir)
      return
    } catch (e) {
      console.warn('[alias-material] rmSync failed', e)
    }
  }
  const metaPath = dir + sep + 'meta.json'
  const unlink = window.exports.unlinkSync
  const rmdir = window.exports.rmdirSync
  try {
    if (existsSync(metaPath)) {
      const raw = readFileSync(metaPath, 'utf8')
      const meta = JSON.parse(raw)
      const mp = meta?.materialPath
      if (mp && existsSync(mp) && typeof unlink === 'function') {
        try {
          unlink(mp)
        } catch (e) {}
      }
    }
    if (existsSync(metaPath) && typeof unlink === 'function') {
      try {
        unlink(metaPath)
      } catch (e) {}
    }
    if (typeof rmdir === 'function') {
      try {
        rmdir(dir)
      } catch (e) {}
    }
  } catch (e) {
    console.warn('[alias-material] fallback remove failed', e)
  }
}

/** 与 ClipItemList 中别名映射一致，供删除条目时一并清理 */
const ITEM_ALIAS_STORAGE_KEY = 'item.alias.map'

const pruneAliasMapEntry = (itemId) => {
  if (!itemId) return
  try {
    const map = utools?.dbStorage?.getItem?.(ITEM_ALIAS_STORAGE_KEY)
    if (!map || typeof map !== 'object' || map[itemId] === undefined) return
    delete map[itemId]
    utools.dbStorage.setItem(ITEM_ALIAS_STORAGE_KEY, map)
  } catch (e) {}
}

/** 删除某条剪贴项对应的别名落盘缓存（条目删除或别名变更时调用） */
const removeAliasMaterialForItem = (itemId) => {
  tryRemoveAliasMaterialDir(getAliasMaterialDirForItem(itemId))
}

/** 条目从历史删除时：删 userData 下别名文件 + dbStorage 中该 id 的别名映射 */
const cleanupAliasStateForDeletedItem = (itemId) => {
  removeAliasMaterialForItem(itemId)
  pruneAliasMapEntry(itemId)
}

/**
 * 将别名展示名写入持久目录；同一 item、同一别名、同一内容则复用已有文件不写盘。
 * 返回供 utools.copyFile 的绝对路径。
 */
const writeAliasMaterialFile = ({ itemId, normalizedAlias, ext, buffer }) => {
  const dir = getAliasMaterialDirForItem(itemId)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const fileName = `${normalizedAlias}${ext}`
  const materialPath = dir + sep + fileName
  const metaPath = dir + sep + 'meta.json'
  const sig = bufferSignature(buffer)
  let reused = false
  if (existsSync(metaPath)) {
    try {
      const prev = JSON.parse(readFileSync(metaPath, 'utf8'))
      if (
        prev &&
        prev.alias === normalizedAlias &&
        prev.sig === sig &&
        prev.materialPath === materialPath &&
        existsSync(materialPath)
      ) {
        reused = true
      } else if (prev && prev.materialPath && prev.materialPath !== materialPath && existsSync(prev.materialPath)) {
        const un = window.exports.unlinkSync
        if (typeof un === 'function') {
          try {
            un(prev.materialPath)
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
  if (!reused) {
    writeFileSync(materialPath, buffer)
    writeFileSync(
      metaPath,
      JSON.stringify({
        v: 1,
        alias: normalizedAlias,
        ext,
        sig,
        materialPath,
        fileName,
      }),
    )
  }
  if (reused) {
    console.log('[alias-paste] alias-material reuse (same alias+content)', materialPath)
  } else {
    console.log('[alias-paste] alias-material wrote (persist userData)', materialPath)
  }
  return materialPath
}

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

const copyAndPasteAndExit = (item, options = {}) => {
  if (!item) return false
  const {
    exit = true,
    paste: shouldPaste = true,
    respectImageCopyGuard = true
  } = options

  if (item.type === 'image') {
    const dataUrl = getImageDataUrlForCopy(item)
    if (!dataUrl && respectImageCopyGuard) {
      console.warn('[copyAndPasteAndExit] 无可复制的图片数据，终止后续操作')
      return false
    }
  }

  if (!shouldPaste) {
    if (exit && typeof window.resetPluginUiState === 'function') {
      window.resetPluginUiState()
    }
    copy(item, exit)
    return true
  }

  if (exit && typeof window.resetPluginUiState === 'function') {
    window.resetPluginUiState()
  }

  copy(item, exit)
  paste()

  return true
}

const copyWithSearchFocus = (item) => {
  if (!item) return false

  const searchInput = document.querySelector('.clip-search-input')
  const isSearchFocused = document.activeElement === searchInput
  if (isSearchFocused) searchInput.blur()

  return copyAndPasteAndExit(item, { respectImageCopyGuard: true })
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

const normalizeAliasFileName = (alias) => {
  if (typeof alias !== 'string') return ''
  return alias.trim().replace(/[\\/:*?"<>|]/g, '_')
}

const copySingleFileWithAliasAndPaste = (item, alias) => {
  if (!item || item.type !== 'file') {
    // console.log('[alias-paste] file-alias skip: not single file item', { type: item?.type })
    return false
  }
  const normalizedAlias = normalizeAliasFileName(alias)
  if (!normalizedAlias) {
    // console.log('[alias-paste] file-alias skip: empty alias after normalize')
    return false
  }
  try {
    const files = JSON.parse(item.data)
    if (!Array.isArray(files) || files.length !== 1) return false
    const sourcePath = files[0]?.path
    if (!sourcePath) return false
    const fileName = sourcePath.split(/[\\/]/).pop() || ''
    const dotIndex = fileName.lastIndexOf('.')
    const ext = dotIndex > 0 ? fileName.slice(dotIndex) : ''
    const buffer = readFileSync(sourcePath)
    const targetPath = writeAliasMaterialFile({
      itemId: item.id,
      normalizedAlias,
      ext,
      buffer,
    })
    if (!existsSync(targetPath)) {
      // console.log('[alias-paste] file-alias fail: target not on disk after write', targetPath)
      return false
    }
    // console.log('[alias-paste] file-alias ok: material file ready, copyFile', targetPath)
    utools.copyFile([targetPath])
    utools.hideMainWindow()
    paste()
    return true
  } catch (e) {
    console.error('[copySingleFileWithAliasAndPaste] failed', e)
    return false
  }
}

const resolveImageBufferAndExt = (item) => {
  if (!item || item.type !== 'image' || !item.data || typeof item.data !== 'string') {
    console.log('[alias-paste] image-resolve skip: invalid item or data', {
      hasItem: Boolean(item),
      type: item?.type,
      dataType: typeof item?.data,
    })
    return null
  }
  const value = item.data
  if (isValidImageData(value)) {
    const matched = value.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,/)
    const extMap = { jpeg: '.jpg', jpg: '.jpg', png: '.png', gif: '.gif', webp: '.webp', bmp: '.bmp', 'svg+xml': '.svg' }
    const ext = extMap[matched?.[1]?.toLowerCase()] || '.png'
    const base64Data = value.replace(/^data:image\/[^;]+;base64,/, '')
    const buf = Buffer.from(base64Data, 'base64')
    console.log('[alias-paste] image-resolve ok: data URL base64', { ext, byteLength: buf?.length })
    return { buffer: buf, ext }
  }
  let path = value
  if (path.startsWith('file://')) {
    path = path.slice(path.indexOf('://') + 3).replace(/^\/+/, '').replace(/\//g, sep)
  }
  if (!path) {
    console.log('[alias-paste] image-resolve fail: empty path after normalize')
    return null
  }
  try {
    const buffer = readFileSync(path)
    if (!buffer || !buffer.length) {
      console.log('[alias-paste] image-resolve fail: read empty buffer', path)
      return null
    }
    const fileName = path.split(/[\\/]/).pop() || ''
    const dotIndex = fileName.lastIndexOf('.')
    const ext = dotIndex > 0 ? fileName.slice(dotIndex) : '.png'
    console.log('[alias-paste] image-resolve ok: read file path', { path, ext, byteLength: buffer.length })
    return { buffer, ext }
  } catch (e) {
    console.log('[alias-paste] image-resolve fail: readFile error', path, e?.message || e)
    return null
  }
}

const copyImageWithAliasAndPaste = (item, alias) => {
  if (!item || item.type !== 'image') {
    console.log('[alias-paste] image-alias skip: not image item')
    return false
  }
  const normalizedAlias = normalizeAliasFileName(alias)
  if (!normalizedAlias) {
    console.log('[alias-paste] image-alias skip: empty alias')
    return false
  }
  try {
    const imageMeta = resolveImageBufferAndExt(item)
    if (!imageMeta?.buffer) {
      console.log('[alias-paste] image-alias fail: no buffer from resolveImageBufferAndExt -> caller should fallback copyImage')
      return false
    }
    const ext = imageMeta.ext || '.png'
    const targetPath = writeAliasMaterialFile({
      itemId: item.id,
      normalizedAlias,
      ext,
      buffer: imageMeta.buffer,
    })
    if (!existsSync(targetPath)) {
      console.log('[alias-paste] image-alias fail: material file missing after write', targetPath)
      return false
    }
    console.log('[alias-paste] image-alias ok: material file on disk, copyFile then paste', targetPath)
    utools.copyFile([targetPath])
    utools.hideMainWindow()
    paste()
    return true
  } catch (e) {
    console.error('[copyImageWithAliasAndPaste] failed', e)
    return false
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

export {
  dateFormat,
  pointToObj,
  copy,
  paste,
  createFile,
  getNativeId,
  isUToolsPlugin,
  copyWithSearchFocus,
  copyOnly,
  copyAndPasteAndExit,
  copySingleFileWithAliasAndPaste,
  copyImageWithAliasAndPaste,
  removeAliasMaterialForItem,
  cleanupAliasStateForDeletedItem,
  ITEM_ALIAS_STORAGE_KEY,
}
