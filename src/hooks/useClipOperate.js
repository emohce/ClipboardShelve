import { ElMessage } from "element-plus";
import setting from "../global/readSetting";

export default function useClipOperate({ emit, currentActiveTab }) {
  const getSourcePaths = (item) => {
    const list = Array.isArray(item?.sourcePaths)
      ? item.sourcePaths
      : Array.isArray(item?.originPaths)
        ? item.originPaths
        : []
    return list.filter(Boolean)
  }

  return {
    handleOperateClick: (operation, item, meta = {}) => {
      const { id } = operation;
      const typeMap = {
        text: "text",
        file: "files",
        image: "img",
      };
      if (id === "copy") {
        window.copy(item, false);
        ElMessage({
          message: "复制成功",
          type: "success",
        });
      } else if (id === "view") {
        emit("onDataChange", item);
      } else if (id === "open-folder") {
        const { data } = item;
        const fl = JSON.parse(data);
        utools.shellShowItemInFolder(fl[0].path); // 取第一个文件的路径打开
      } else if (id === "open-source") {
        const paths = getSourcePaths(item)
        if (paths.length) {
          utools.shellShowItemInFolder(paths[0])
        }
      } else if (id === "collect") {
        // 添加到收藏列表
        console.log("[useClipOperate] 收藏操作 - 项目ID:", item.id);
        window.db.addCollect(item.id);
        emit("onDataRemove"); // 触发视图更新
      } else if (id === "un-collect") {
        // 从收藏列表移除
        console.log("[useClipOperate] 取消收藏操作 - 项目ID:", item.id);
        window.db.removeCollect(item.id);
        emit("onDataRemove"); // 触发视图更新
      } else if (id === "word-break") {
        utools.redirect("超级分词", item.data);
      } else if (id === "save-file") {
        utools.redirect("收集文件", {
          type: typeMap[item.type],
          data:
            item.type === "file"
              ? JSON.parse(item.data).map((f) => f.path)
              : item.data,
        });
      } else if (id === "remove") {
        const activeTab =
          typeof currentActiveTab === "function"
            ? currentActiveTab()
            : currentActiveTab;
        const isCollected = window.db.isCollected(item.id);
        console.log(
          "[useClipOperate] 删除操作 - 标签页:",
          activeTab,
          "项目ID:",
          item.id,
          "是否已收藏:",
          isCollected,
        );

        if (activeTab === "collect") {
          // 在"收藏"标签页：不允许删除，只能取消收藏
          console.log(
            "[useClipOperate] 收藏内容不允许删除，请使用取消收藏功能",
          );
          ElMessage({
            message: "收藏内容不允许删除，请先取消收藏",
            type: "warning",
          });
        } else if (isCollected) {
          // 在其他标签页删除已收藏项目：不允许删除（收藏数据单独存储）
          console.log("[useClipOperate] 已收藏项目不允许删除，请先取消收藏");
          ElMessage({
            message: "已收藏项目不允许删除，请先取消收藏",
            type: "warning",
          });
        } else {
          // 在其他标签页删除未收藏项目：完全删除
          console.log("[useClipOperate] 步骤: 删除未收藏项目");
          window.remove(item);
          emit("onDataRemove");
        }
      } else if (id.indexOf("custom") !== -1) {
        const cmd =
          meta?.sub && operation.subCommand
            ? operation.subCommand
            : operation.command;
        const a = cmd.split(":");
        if (a[0] === "redirect") {
          utools.redirect(a[1], {
            type: typeMap[item.type],
            data:
              item.type === "file"
                ? JSON.parse(item.data).map((f) => f.path)
                : item.data,
          });
        }
      }
      emit("onOperateExecute");
    },
    filterOperate: (operation, item, isFullData, context) => {
      const { id } = operation;
      if (!isFullData) {
        // 在非预览页 只展示setting.operation.shown中的功能按钮
        const allowInDrawer = context === "drawer" && (id === "open-source" || id === "open-folder")
        if (!setting.operation.shown.includes(id) && !allowInDrawer) {
          return false;
        }
      }
      if (id === "copy") {
        return true;
      } else if (id === "view") {
        return !isFullData;
      } else if (id === "open-folder") {
        return item.type === "file";
      } else if (id === "open-source") {
        return getSourcePaths(item).length > 0;
      } else if (id === "collect") {
        return item.type !== "file" && !window.db.isCollected(item.id);
      } else if (id === "un-collect") {
        return item.type !== "file" && window.db.isCollected(item.id);
      } else if (id === "word-break") {
        return (
          item.type === "text" &&
          item.data.length <= 500 &&
          item.data.length >= 2
        );
      } else if (id === "save-file") {
        return true;
      } else if (id === "remove") {
        return true;
      } else if (id.indexOf("custom") !== -1) {
        // 如果匹配到了自定义的操作 则展示
        for (const m of operation.match) {
          if (typeof m === "string") {
            if (item.type === m) {
              return true;
            }
          } else if (typeof m === "object") {
            // 根据正则匹配内容
            const r = new RegExp(m.regex);
            if (item.type === "file") {
              const fl = JSON.parse(item.data);
              for (const f of fl) {
                if (r.test(f.name)) {
                  return true;
                }
              }
            } else {
              return r.test(item.data);
            }
          }
        }
        return false;
      }
    },
  };
}
