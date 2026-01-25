import { ElMessage, ElMessageBox } from 'element-plus'
import setting from '../global/readSetting'

export default function useClipOperate({ emit, getCurrentTab }) {
  return {
      handleOperateClick: (operation, item) => {
        const { id } = operation
        const typeMap = {
          text: 'text',
          file: 'files',
          image: 'img'
        }
        if (id === 'copy') {
        window.copy(item, false)
        ElMessage({
          message: '复制成功',
          type: 'success'
        })
      } else if (id === 'view') {
        emit('onDataChange', item)
      } else if (id === 'open-folder') {
        const { data } = item
        const fl = JSON.parse(data)
        utools.shellShowItemInFolder(fl[0].path) // 取第一个文件的路径打开
        } else if (id === 'collect') {
          item.collect = true
          window.db.updateDataBaseLocal()
        } else if (id === 'un-collect') {
          item.collect = undefined
          window.db.updateDataBaseLocal()
        } else if (id === 'retain') {
          item.retain = true
          item.retainTime = new Date().getTime()
          window.db.updateDataBaseLocal()
          ElMessage({
            message: '已添加保留标记',
            type: 'success'
          })
        } else if (id === 'un-retain') {
          item.retain = undefined
          item.retainTime = undefined
          window.db.updateDataBaseLocal()
          ElMessage({
            message: '已移除保留标记',
            type: 'success'
          })
        } else if (id === 'word-break') {
          utools.redirect('超级分词', item.data)
        } else if (id === 'save-file') {
          utools.redirect('收集文件', {
            type: typeMap[item.type],
            data: item.type === 'file' ? JSON.parse(item.data).map((f) => f.path) : item.data
          })
        } else if (id === 'remove') {
          const currentTab = getCurrentTab ? getCurrentTab() : undefined
          const isCollectTab = currentTab === 'collect'
          const actionText = isCollectTab ? '取消收藏' : '删除'
          ElMessageBox.confirm(`确认${actionText}此记录？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
            autofocus: true
          })
            .then(() => {
              if (isCollectTab) {
                item.collect = undefined
                window.db.updateDataBaseLocal()
              } else {
                window.remove(item)
              }
              emit('onDataRemove')
            })
            .catch(() => {})
        } else if (id.indexOf('custom') !== -1) {
          const a = operation.command.split(':')
          if (a[0] === 'redirect') {
            utools.redirect(a[1], {
            type: typeMap[item.type],
            data: item.type === 'file' ? JSON.parse(item.data).map((f) => f.path) : item.data
          })
        }
      }
      emit('onOperateExecute')
    },
      filterOperate: (operation, item, isFullData) => {
        const { id } = operation
        if (!isFullData) {
          // 在非预览页 只展示setting.operation.shown中的功能按钮
          if (!setting.operation.shown.includes(id)) {
            return false
          }
        }
      if (id === 'copy') {
        return true
      } else if (id === 'view') {
        return !isFullData
      } else if (id === 'open-folder') {
        return item.type === 'file'
      } else if (id === 'collect') {
        return item.type !== 'file' && !item.collect
        } else if (id === 'un-collect') {
          return item.type !== 'file' && item.collect
        } else if (id === 'retain') {
          return !item.retain
        } else if (id === 'un-retain') {
          return !!item.retain
        } else if (id === 'word-break') {
          return item.type === 'text' && item.data.length <= 500 && item.data.length >= 2
        } else if (id === 'save-file') {
          return true
      } else if (id === 'remove') {
        return true
      } else if (id.indexOf('custom') !== -1) {
        // 如果匹配到了自定义的操作 则展示
        for (const m of operation.match) {
          if (typeof m === 'string') {
            if (item.type === m) {
              return true
            }
          } else if (typeof m === 'object') {
            // 根据正则匹配内容
            const r = new RegExp(m.regex)
            if (item.type === 'file') {
              const fl = JSON.parse(item.data)
              for (const f of fl) {
                if (r.test(f.name)) {
                  return true
                }
              }
            } else {
              return r.test(item.data)
            }
          }
        }
        return false
      }
    }
  }
}
