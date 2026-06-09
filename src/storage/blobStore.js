const DEFAULT_LARGE_TEXT_THRESHOLD = 16 * 1024

const sanitizeSegment = (value) => String(value || 'unknown').replace(/[\\/:*?"<>|]/g, '_')

const ensureDir = (deps, dir) => {
  if (!deps.existsSync(dir)) {
    deps.mkdirSync(dir, { recursive: true })
  }
}

const extForItem = (item) => {
  if (item?.type === 'image') return '.txt'
  if (item?.type === 'text') return '.txt'
  return '.json'
}

export class BlobStore {
  constructor({ rootDir, deps = window.exports, threshold = DEFAULT_LARGE_TEXT_THRESHOLD }) {
    this.rootDir = rootDir
    this.deps = deps
    this.threshold = threshold
    this.dataDir = `${rootDir}${deps.sep}data`
    ensureDir(deps, this.dataDir)
  }

  shouldExternalize(item) {
    if (!item || typeof item.data !== 'string') return false
    if (item.type === 'image') return true
    if (item.type === 'text' && item.data.length > this.threshold) return true
    return false
  }

  pathForItem(item) {
    const type = sanitizeSegment(item?.type || 'item')
    const id = sanitizeSegment(item?.id)
    const dir = `${this.dataDir}${this.deps.sep}${type}`
    ensureDir(this.deps, dir)
    return `${dir}${this.deps.sep}${id}${extForItem(item)}`
  }

  prepareForDb(item) {
    if (!this.shouldExternalize(item)) {
      return {
        dbItem: { ...item },
        dataPath: '',
        dataInline: item?.data || ''
      }
    }
    const dataPath = this.pathForItem(item)
    this.deps.writeFileSync(dataPath, item.data || '', 'utf8')
    return {
      dbItem: { ...item, data: '' },
      dataPath,
      dataInline: ''
    }
  }

  hydrateItem(item) {
    if (!item?.dataPath || item.data) return item
    try {
      if (!this.deps.existsSync(item.dataPath)) return item
      return {
        ...item,
        data: this.deps.readFileSync(item.dataPath, 'utf8')
      }
    } catch (_) {
      return item
    }
  }

  removeForItem(item) {
    const dataPath = item?.dataPath
    if (!dataPath || !this.deps.existsSync(dataPath)) return
    const rm = this.deps.rmSync
    const unlink = this.deps.unlinkSync
    try {
      if (typeof rm === 'function') rm(dataPath, { force: true })
      else if (typeof unlink === 'function') unlink(dataPath)
    } catch (_) {}
  }
}
