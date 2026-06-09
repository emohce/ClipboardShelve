export const STORAGE_STATUS_KEY = 'storageRuntimeStatus'
export const STORAGE_STATUS_EVENT = 'ezclipboard:storage-status-updated'

const DEFAULT_STATUS = {
  mode: 'unknown',
  migrationStatus: 'idle',
  noticeUnread: false,
  progress: 0,
  stepText: '',
  sqlitePath: '',
  jsonPath: '',
  assetDir: '',
  errorMessage: '',
  updatedAt: 0
}

const safeStorage = () => {
  try {
    return typeof utools !== 'undefined' ? utools?.dbStorage : null
  } catch (_) {
    return null
  }
}

const clampProgress = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

export const getDefaultStorageRuntimeStatus = () => ({ ...DEFAULT_STATUS })

export const normalizeStorageRuntimeStatus = (status = {}) => ({
  ...DEFAULT_STATUS,
  ...(status && typeof status === 'object' ? status : {}),
  noticeUnread: status?.noticeUnread === true,
  progress: clampProgress(status?.progress),
  updatedAt: Number(status?.updatedAt) || 0
})

export const getStorageRuntimeStatus = () => {
  const storage = safeStorage()
  if (!storage?.getItem) return getDefaultStorageRuntimeStatus()
  return normalizeStorageRuntimeStatus(storage.getItem(STORAGE_STATUS_KEY))
}

const emitStorageRuntimeStatus = (status) => {
  try {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
    window.dispatchEvent(new CustomEvent(STORAGE_STATUS_EVENT, { detail: status }))
  } catch (_) {}
}

export const updateStorageRuntimeStatus = (patch = {}) => {
  const next = normalizeStorageRuntimeStatus({
    ...getStorageRuntimeStatus(),
    ...(patch && typeof patch === 'object' ? patch : {}),
    updatedAt: Date.now()
  })
  const storage = safeStorage()
  if (storage?.setItem) storage.setItem(STORAGE_STATUS_KEY, next)
  emitStorageRuntimeStatus(next)
  return next
}

export const markStorageNoticeRead = () =>
  updateStorageRuntimeStatus({
    noticeUnread: false
  })
