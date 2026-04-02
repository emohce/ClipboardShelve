<template>
    <div
        class="clip-item-list"
        ref="listRootRef"
        @mousemove.passive="handleListMouseMove"
    >
        <ClipItemRow
            v-for="(item, index) in showList"
            :key="item.id"
            v-memo="[
                item,
                item.locked,
                isMultiple,
                activeIndex === index,
                selectedItemIdSet.has(item.id),
                isItemCollected(item),
            ]"
            :item="item"
            :index="index"
            :is-multiple="isMultiple"
            :is-active="activeIndex === index"
            :is-selected="selectedItemIdSet.has(item.id)"
            :is-collected="isItemCollected(item)"
            :show-operate="!isMultiple && activeIndex === index"
            :current-active-tab="currentActiveTab"
            :is-over-sized-content="isOverSizedContent"
            :get-item-image-src="getItemImageSrc"
            :has-image-files="hasImageFiles"
            :get-image-files="getImageFiles"
            :to-file-url="toFileUrl"
            :show-image-file-preview="showImageFilePreview"
            @row-click-left="handleItemClick($event, item)"
            @row-click-right="handleItemClick($event, item)"
            @row-mouseenter="handleMouseOver($event, index, item)"
            @row-mouseleave="handleRowMouseLeave(index)"
            @row-data-change="emit('onDataChange', item)"
            @row-data-remove="emit('onDataRemove')"
            @row-open-tag-edit="openTagEditModal"
            @row-image-click="handleImageClick($event, item)"
        />
    </div>

    <!-- Custom Image Preview -->
    <Teleport to="body">
        <div
            v-if="imagePreview.show"
            class="image-preview-modal"
            :style="imagePreview.style"
            @mouseenter="keepImagePreview"
            @mouseleave="hideImagePreview"
        >
            <div class="image-preview-content">
                <img
                    v-if="isPreviewableImageSrc(imagePreview.src)"
                    :src="imagePreview.src"
                    :style="imagePreview.imageStyle"
                    @error="handleImageError"
                    @load="handleImageLoad"
                />
                <div v-else class="preview-error">
                    <span>图片加载失败</span>
                </div>
            </div>
            <div v-if="imagePreview.footer" class="image-preview-footer">
                {{ imagePreview.footer }}
            </div>
        </div>
    </Teleport>

    <!-- Long Text Preview (Shift hold) -->
    <div
        v-if="textPreview.show"
        class="text-preview-modal"
        :style="textPreview.style"
        @mouseenter="keepTextPreview"
        @mouseleave="hideTextPreview"
    >
        <div class="text-preview-content">{{ textPreview.text }}</div>
    </div>

    <ClipDrawerMenu
        :show="drawerShow"
        :items="drawerItems"
        :position="drawerPosition"
        :defaultActive="drawerDefaultActive"
        :placement="drawerPlacement"
        @select="handleDrawerSelect"
        @close="closeDrawer"
    />
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from "vue";
import { ElMessage } from "element-plus";
import ClipItemRow from "./ClipItemRow.vue";
import ClipDrawerMenu from "./ClipDrawerMenu.vue";
import {
    isUToolsPlugin,
    copyOnly,
    copyAndPasteAndExit,
} from "../utils";
import defaultOperation from "../data/operation.json";
import setting, {
    getHoverPreviewConfig,
    SETTING_UPDATED_EVENT,
} from "../global/readSetting";
import useClipOperate from "../hooks/useClipOperate";
import { desktopPreviewManager } from "../global/desktopPreview";
import { registerFeature } from "../global/hotkeyRegistry";
const props = defineProps({
    showList: {
        type: Array,
        required: true,
    },
    fullData: {
        type: Object,
        required: true,
    },
    isMultiple: {
        type: Boolean,
        required: true,
    },
    currentActiveTab: {
        type: String,
        required: true,
    },
    isSearchPanelExpand: {
        type: Boolean,
        required: true,
    },
    collectedIds: {
        type: Set,
        default: undefined,
    },
});
const emit = defineEmits([
    "onDataChange",
    "onDataRemove",
    "onMultiCopyExecute",
    "toggleMultiSelect",
    "onItemDelete",
    "openCleanDialog",
    "openTagEdit",
]);
const isItemCollected = (item) =>
    props.collectedIds
        ? props.collectedIds.has(item.id)
        : Boolean(window?.db?.isCollected?.(item.id));
const isOverSizedContent = (item) => {
    const { type, data } = item;
    if (type === "text") {
        // 没有换行的长文本也应当被纳入考虑
        return data.split(`\n`).length - 1 > 6 || data.length > 255;
    } else if (type === "file") {
        return JSON.parse(item.data).length >= 6;
    }
};

// 图片数据验证
const isValidImageData = (data) => {
    if (!data || typeof data !== "string") return false;
    return data.startsWith("data:image/") && data.includes("base64,");
};

// 图片点击处理（能展示就能复制，与悬浮一致）
const handleImageClick = (ev, item) => {
    if (ev) ev.stopPropagation();
    if (getItemImageSrc(item)) {
        copyAndPasteAndExit(item, { respectImageCopyGuard: true });
    }
};

// 图片加载错误处理
const handleImageError = (event) => {
    console.warn("[ClipItemList] 图片加载失败:", event.target.src);
    event.target.style.display = "none";
};

// 图片加载成功处理
const handleImageLoad = (event) => {
    console.log("[ClipItemList] 图片加载成功:", event.target.src);
};

const isPreviewableImageSrc = (src) => {
    if (!src) return false;
    return isValidImageData(src) || /^file:\/\//i.test(src);
};

const resolvePreviewImageSrc = (value) => {
    if (!value || typeof value !== "string") return "";
    if (isValidImageData(value)) return value;
    if (/^file:\/\//i.test(value)) return value;
    return toFileUrl(value);
};

const getItemImageSrc = (item) => {
    if (!item || item.type !== "image") return "";
    return resolvePreviewImageSrc(item.data);
};

// 显示图片预览（统一使用插件内弹层，不调用 window.open 桌面预览）
const showImagePreview = (event, item, footerText = "") => {
    const src = getItemImageSrc(item);
    if (!src) return;

    imagePreviewSource.value = event ? "hover" : "keyboard";
    textPreview.value.show = false;
    if (textPreviewHideTimer) {
        clearTimeout(textPreviewHideTimer);
        textPreviewHideTimer = null;
    }
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }

    // 与普通预览一致：大窗口、内部图片自适应展示（objectFit: contain）
    const margin = 32;
    const maxW = window.innerWidth - margin * 2;
    const maxH = window.innerHeight - margin * 2;
    imagePreview.value.src = src;
    imagePreview.value.footer = footerText;
    imagePreview.value.style = {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        backgroundColor: "rgba(15, 17, 21, 0.96)",
        borderRadius: "8px",
        padding: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
        maxWidth: `${maxW}px`,
        maxHeight: `${maxH}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "auto",
    };
    imagePreview.value.imageStyle = {
        maxWidth: "100%",
        maxHeight: "100%",
        objectFit: "contain",
        display: "block",
    };
    imagePreview.value.show = true;
};

// 隐藏图片预览
const stopImagePreview = (immediate = false) => {
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }
    if (immediate) {
        imagePreview.value.show = false;
        imagePreviewSource.value = "";
        // 不调用 restorePreviewWindow，保持插件窗口大小不变
        closeExternalPreview();
        return;
    }
    imagePreviewHideTimer = setTimeout(() => {
        imagePreview.value.show = false;
        imagePreviewSource.value = "";
        // 不调用 restorePreviewWindow，保持插件窗口大小不变
        closeExternalPreview();
        imagePreviewHideTimer = null;
    }, 200);
};

// 组件卸载时清理预览窗口
onUnmounted(() => {
    desktopPreviewManager.closeAllPreviews();
});

const hideImagePreview = () => {
    // 延迟隐藏，允许鼠标移动到预览区域
    stopImagePreview(false);
};

// 保持图片预览显示
const keepImagePreview = () => {
    if (imagePreviewSource.value === "hover") return;
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }
};

let externalPreviewWindow = null;

const escapePreviewText = (value = "") =>
    String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

const openExternalPreview = (src, footer = "", ratio = 0.9) => {
    if (!src) return false;

    // 获取桌面屏幕尺寸
    const screenWidth =
        window.screen?.availWidth || window.screen?.width || 1920;
    const screenHeight =
        window.screen?.availHeight || window.screen?.height || 1080;

    // 使用更大的比例，提供更好的预览体验
    const width = Math.floor(screenWidth * ratio);
    const height = Math.floor(screenHeight * ratio);
    const left = Math.max(0, Math.floor((screenWidth - width) / 2));
    const top = Math.max(0, Math.floor((screenHeight - height) / 2));

    let win = externalPreviewWindow;
    if (!win || win.closed) {
        // 创建新的预览窗口，添加更多特性
        win = window.open(
            "",
            "clip-image-preview",
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes,toolbar=no,menubar=no`,
        );
        externalPreviewWindow = win;
    } else {
        try {
            win.resizeTo(width, height);
            win.moveTo(left, top);
        } catch (e) {}
    }

    if (!win) return false;

    const footerHtml = footer
        ? '<div class="footer">' +
          escapePreviewText(footer).replace(/\n/g, "<br>") +
          "</div>"
        : "";

    const html = [
        "<!DOCTYPE html>",
        "<html>",
        "<head>",
        '  <meta charset="utf-8" />',
        "  <title>图片预览 - 超级剪贴板</title>",
        "  <style>",
        "    html, body { ",
        "      margin: 0; ",
        "      padding: 0; ",
        "      width: 100%; ",
        "      height: 100%; ",
        "      background: #0f1115; ",
        "      color: #e5e7eb; ",
        "      overflow: hidden;",
        "    }",
        "    body { ",
        "      display: flex; ",
        "      flex-direction: column; ",
        "      align-items: center; ",
        "      justify-content: center; ",
        "    }",
        "    .wrap { ",
        "      display: flex; ",
        "      flex-direction: column; ",
        "      align-items: center; ",
        "      justify-content: center; ",
        "      width: 100%; ",
        "      height: 100%; ",
        "      padding: 20px; ",
        "      box-sizing: border-box; ",
        "      position: relative;",
        "    }",
        "    img { ",
        "      width: auto; ",
        "      height: auto; ",
        "      max-width: 100%; ",
        "      max-height: calc(100% - 40px); ",
        "      object-fit: contain; ",
        "      border-radius: 8px; ",
        "      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);",
        "      transition: transform 0.2s ease;",
        "    }",
        "    img:hover {",
        "      transform: scale(1.02);",
        "    }",
        "    .footer { ",
        "      margin-top: 15px; ",
        "      font-size: 13px; ",
        "      color: #9ca3af; ",
        "      text-align: center; ",
        "      white-space: pre-wrap; ",
        "      word-break: break-all; ",
        "      max-width: 100%;",
        "      opacity: 0.8;",
        "    }",
        "    .controls {",
        "      position: absolute;",
        "      top: 10px;",
        "      right: 10px;",
        "      display: flex;",
        "      gap: 8px;",
        "    }",
        "    .control-btn {",
        "      background: rgba(255, 255, 255, 0.1);",
        "      border: 1px solid rgba(255, 255, 255, 0.2);",
        "      color: #e5e7eb;",
        "      padding: 6px 12px;",
        "      border-radius: 4px;",
        "      cursor: pointer;",
        "      font-size: 12px;",
        "      transition: all 0.2s ease;",
        "    }",
        "    .control-btn:hover {",
        "      background: rgba(255, 255, 255, 0.2);",
        "      border-color: rgba(255, 255, 255, 0.3);",
        "    }",
        "    .shortcuts {",
        "      position: absolute;",
        "      bottom: 10px;",
        "      left: 10px;",
        "      font-size: 11px;",
        "      color: #6b7280;",
        "      opacity: 0.6;",
        "    }",
        "  </style>",
        "</head>",
        "<body>",
        '  <div class="wrap">',
        '    <div class="controls">',
        '      <button class="control-btn" onclick="window.close()">关闭 (ESC)</button>',
        "    </div>",
        '    <img src="' + src + '" alt="preview" />',
        footerHtml,
        '    <div class="shortcuts">ESC: 关闭窗口</div>',
        "  </div>",
        "  <script>",
        "    // ESC键关闭窗口",
        '    document.addEventListener("keydown", function(e) {',
        '      if (e.key === "Escape") {',
        "        window.close();",
        "      }",
        "    });",
        "    ",
        "    // 窗口失焦时也可以通过ESC关闭",
        '    window.addEventListener("blur", function() {',
        "      setTimeout(function() {",
        "        window.focus();",
        "      }, 100);",
        "    });",
        "    ",
        "    // 自动调整窗口大小以适应图片",
        '    const img = document.querySelector("img");',
        "    if (img.complete) {",
        "      adjustWindowSize();",
        "    } else {",
        "      img.onload = adjustWindowSize;",
        "    }",
        "    ",
        "    function adjustWindowSize() {",
        "      const imgWidth = img.naturalWidth;",
        "      const imgHeight = img.naturalHeight;",
        "      const screenWidth = screen.availWidth;",
        "      const screenHeight = screen.availHeight;",
        "      ",
        "      // 如果图片比屏幕小，调整窗口大小以适应图片",
        "      if (imgWidth < screenWidth * 0.8 && imgHeight < screenHeight * 0.8) {",
        "        const newWidth = Math.min(imgWidth + 100, screenWidth * 0.8);",
        "        const newHeight = Math.min(imgHeight + 150, screenHeight * 0.8);",
        "        const left = Math.floor((screenWidth - newWidth) / 2);",
        "        const top = Math.floor((screenHeight - newHeight) / 2);",
        "        ",
        "        try {",
        "          window.resizeTo(newWidth, newHeight);",
        "          window.moveTo(left, top);",
        "        } catch(e) {}",
        "      }",
        "    }",
        "  <\/script>",
        "</body>",
        "</html>",
    ].join("\n");

    win.document.open();
    win.document.write(html);
    win.document.close();

    // 聚焦到预览窗口
    try {
        win.focus();
    } catch (e) {}

    return true;
};

const focusUtoolsMainWindow = () => {
    if (typeof utools?.showMainWindow === "function") {
        utools.showMainWindow();
        return;
    }
    if (typeof utools?.showWindow === "function") {
        utools.showWindow();
        return;
    }
    if (typeof window.focus === "function") {
        window.focus();
    }
};

const closeExternalPreview = () => {
    if (externalPreviewWindow && !externalPreviewWindow.closed) {
        try {
            externalPreviewWindow.close();
        } catch (e) {}
    }
    externalPreviewWindow = null;
    focusUtoolsMainWindow();
};

const expandPreviewWindow = (maxWidth, maxHeight) => {
    const canExpandWidth = typeof utools?.setExpendWidth === "function";
    const canExpandHeight = typeof utools?.setExpendHeight === "function";
    if (!canExpandWidth && !canExpandHeight) return;
    if (!previewWindowSize.value) {
        previewWindowSize.value = {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    }
    if (canExpandWidth) {
        const nextWidth = Math.max(window.innerWidth, Math.ceil(maxWidth + 80));
        utools.setExpendWidth(nextWidth);
    }
    if (canExpandHeight) {
        const nextHeight = Math.max(
            window.innerHeight,
            Math.ceil(maxHeight + 80),
        );
        utools.setExpendHeight(nextHeight);
    }
};

const restorePreviewWindow = () => {
    if (!previewWindowSize.value) return;
    const { width, height } = previewWindowSize.value;
    if (typeof utools?.setExpendWidth === "function") {
        utools.setExpendWidth(width);
    }
    if (typeof utools?.setExpendHeight === "function") {
        utools.setExpendHeight(height);
    }
    previewWindowSize.value = null;
};

const toFileUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("file://")) return path;
    const normalized = path.replace(/\\/g, "/").replace(/^\/+/, "");
    return `file:///${normalized}`;
};

const showImageFilePreview = (path) => {
    if (!path) return;
    const src = toFileUrl(path);
    if (!src) return;
    const name = path.split(/[\\/]/).pop() || path;
    const footerText = `${name}\n${path}`;

    // 使用统一的图片预览逻辑
    showImagePreview(null, { type: "image", data: src }, footerText);
};

// Shift 持续按下预览：按 item 类型封装的预览入口
const SHIFT_PREVIEW_HOLD_MS = 100;
const LONG_TEXT_THRESHOLD = 80;
const hoverPreviewConfig = ref(getHoverPreviewConfig(setting));

const isLongText = (item) => {
    if (!item || item.type !== "text" || typeof item.data !== "string")
        return false;
    return item.data.length > LONG_TEXT_THRESHOLD || item.data.includes("\n");
};

/** 根据当前 item 类型执行预览（图片 / 长文本，其余类型暂不处理） */
const runPreviewForItem = (item) => {
    if (!item) {
        stopImagePreview(true);
        clearTextPreviewImmediately();
        return;
    }
    if (item.type === "image" && getItemImageSrc(item)) {
        clearTextPreviewImmediately();
        showImagePreview(null, item);
        return;
    }
    if (item.type === "text" && isLongText(item)) {
        stopImagePreview(true);
        showTextPreview(item);
        return;
    }
    if (item.type === "file") {
        clearTextPreviewImmediately();
        const imageFiles = getImageFiles(item);
        if (imageFiles.length && imageFiles[0]?.path) {
            showImageFilePreview(imageFiles[0].path);
            return;
        }
    }
    stopImagePreview(true);
    clearTextPreviewImmediately();
};

// Shift键长按处理（普通层 100ms 持续即对所在 item 进行预览）
const handleShiftKeyDown = () => {
    if (shiftKeyTimer) return;

    shiftKeyDownTime = Date.now();
    shiftKeyTimer = setTimeout(() => {
        keyboardTriggeredPreview.value = true;
        const currentItem = props.showList[activeIndex.value];
        runPreviewForItem(currentItem);
    }, SHIFT_PREVIEW_HOLD_MS);
};

const handleShiftKeyUp = () => {
    if (shiftKeyTimer) {
        clearTimeout(shiftKeyTimer);
        shiftKeyTimer = null;
    }

    if (keyboardTriggeredPreview.value) {
        keyboardTriggeredPreview.value = false;
        hoverTriggeredPreview.value = false;
        stopImagePreview(true);
        hideTextPreview();
    }
};

// 键盘触发的预览（Shift 长按后切换 item 时刷新预览）
const triggerKeyboardPreview = () => {
    if (!keyboardTriggeredPreview.value) return;
    const currentItem = props.showList[activeIndex.value];
    runPreviewForItem(currentItem);
};

const clearTextPreviewImmediately = () => {
    if (textPreviewHideTimer) {
        clearTimeout(textPreviewHideTimer);
        textPreviewHideTimer = null;
    }
    textPreview.value.show = false;
    textPreview.value.text = "";
};

const showTextPreview = (item) => {
    imagePreview.value.show = false;
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }
    if (textPreviewHideTimer) {
        clearTimeout(textPreviewHideTimer);
        textPreviewHideTimer = null;
    }
    const margin = 80;
    const maxW = window.innerWidth - margin * 2;
    const maxH = window.innerHeight - margin * 2;
    textPreview.value.text = item.data || "";
    textPreview.value.show = true;
    textPreview.value.style = {
        position: "fixed",
        top: "50vh", // 使用视口高度单位
        left: "50vw", // 使用视口宽度单位
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        borderRadius: "8px",
        padding: "16px 20px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
        maxWidth: `${maxW}px`,
        maxHeight: `${maxH}px`,
        overflow: "auto",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#e8e6e3",
    };
};

const hideTextPreview = () => {
    textPreviewHideTimer = setTimeout(() => {
        textPreview.value.show = false;
        textPreviewHideTimer = null;
    }, 200);
};

const keepTextPreview = () => {
    if (textPreviewHideTimer) {
        clearTimeout(textPreviewHideTimer);
        textPreviewHideTimer = null;
    }
};

const resetTransientPreviewState = () => {
    if (shiftKeyTimer) {
        clearTimeout(shiftKeyTimer);
        shiftKeyTimer = null;
    }
    if (hoverPreviewTimer) {
        clearTimeout(hoverPreviewTimer);
        hoverPreviewTimer = null;
    }
    keyboardTriggeredPreview.value = false;
    hoverTriggeredPreview.value = false;
    hoverRowIndex.value = null;
    stopImagePreview(true);
    clearTextPreviewImmediately();
};

// 检测文件中是否包含图片
const hasImageFiles = (item) => {
    if (item.type !== "file") return false;
    try {
        const files = JSON.parse(item.data);
        return files.some((file) => {
            const extension = file.path?.split(".").pop()?.toLowerCase();
            return [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "bmp",
                "webp",
                "svg",
                "ico",
            ].includes(extension);
        });
    } catch (e) {
        return false;
    }
};

// 获取文件中的图片文件
const getImageFiles = (item) => {
    if (item.type !== "file") return [];
    try {
        const files = JSON.parse(item.data);
        return files.filter((file) => {
            const extension = file.path?.split(".").pop()?.toLowerCase();
            return [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "bmp",
                "webp",
                "svg",
                "ico",
            ].includes(extension);
        });
    } catch (e) {
        return [];
    }
};

const formatFileNames = (item) => {
    try {
        const paths = JSON.parse(item.data)
            .map((f) => f.path)
            .filter(Boolean);
        const origin = Array.isArray(item.originPaths)
            ? item.originPaths.filter(Boolean)
            : [];
        if (origin.length) {
            return [...paths, "---", ...origin].join("\n");
        }
        return paths.join("\n");
    } catch (e) {
        return "";
    }
};

const closeDrawer = () => {
    drawerShow.value = false;
};

const handleDrawerSelect = (op, meta = {}) => {
    const currentItem = props.showList[activeIndex.value];
    if (!currentItem) return;
    handleOperateClick(op, currentItem, meta);
    if (!meta.sub) {
        drawerShow.value = false;
    }
};

const handleDrawerReorder = (list) => {
    drawerItems.value = list;
    drawerOrder.value = list.map((op) => op.id);
    utools.dbStorage.setItem("drawer.order", drawerOrder.value);
};

const applyDrawerOrder = (list) => {
    if (!drawerOrder.value.length) return list;
    const orderSet = new Set(drawerOrder.value);
    const ordered = drawerOrder.value
        .map((id) => list.find((op) => op.id === id))
        .filter(Boolean);
    const remaining = list.filter((op) => !orderSet.has(op.id));
    return [...ordered, ...remaining];
};

// 全部信息内的菜单：与主层 ClipOperate 一致，filterOperate + applyDrawerOrder，用于右侧抽屉
const getDrawerFullMenuItems = (currentItem) => {
    if (!currentItem) return [];
    const available = operations.value.filter((op) =>
        filterOperate(op, currentItem, false, "drawer"),
    );
    return applyDrawerOrder(available);
};

// 打开当前 item 的快捷菜单抽屉（右侧抽屉，展示全部菜单；右方向键/鼠标右键/c-s-序号 调用）
const openDrawerForCurrentItem = (ev, defaultActiveIndex = 0) => {
    const currentItem = props.showList[activeIndex.value];
    if (!currentItem) return;
    const fullMenu = getDrawerFullMenuItems(currentItem);
    if (!fullMenu.length) return;
    nextTick(() => {
        const el =
            ev?.target?.closest?.(".clip-item") ||
            document.querySelector(".clip-item.active");
        const rect = el?.getBoundingClientRect();
        drawerPosition.value = rect
            ? { top: rect.bottom + 4, left: rect.left }
            : { top: 100, left: 100 };
        drawerItems.value = fullMenu;
        drawerDefaultActive.value = Math.min(
            defaultActiveIndex,
            Math.max(0, fullMenu.length - 1),
        );
        drawerPlacement.value = "right";
        drawerShow.value = true;
    });
};
const isShiftDown = ref(false);
const selectItemList = ref([]);
const allSelectedLocked = ref(false); // 临时标志：记录所有选中项是否都已锁定
let lockPersistTimer = null;

// 图片预览相关
const imagePreview = ref({
    show: false,
    src: "",
    footer: "",
    style: {},
    imageStyle: {},
});
const imagePreviewSource = ref("");
const hoverRowIndex = ref(null);
const previewWindowSize = ref(null);
const listRootRef = ref(null);
const lastPointerPosition = ref({ x: null, y: null });

// 长文本预览相关
const textPreview = ref({
    show: false,
    text: "",
    style: {},
});

// 图片预览隐藏定时器
let imagePreviewHideTimer = null;
// 长文本预览隐藏定时器
let textPreviewHideTimer = null;

// Shift键长按相关
let shiftKeyDownTime = 0;
let shiftKeyTimer = null;
const keyboardTriggeredPreview = ref(false);
// 行悬浮预览：默认关闭，开启后按用户配置的 delay 触发
let hoverPreviewTimer = null;
const hoverTriggeredPreview = ref(false);
// 方向键生效后暂停悬浮预览，直到鼠标再次移动才重新启用
const hoverPreviewSuspendedByKeyboard = ref(false);
// 点击（如打开文件 popover）后暂停悬浮预览，鼠标移动则解除
const hoverPreviewSuspendedByClick = ref(false);
const activeIndex = ref(0); // 定义 activeIndex，需要在 defineExpose 之前
const drawerShow = ref(false);
const drawerPosition = ref({ top: 0, left: 0 });
const drawerItems = ref([]);
const drawerDefaultActive = ref(0);
const drawerPlacement = ref("right");
const drawerOrder = ref(
    Array.isArray(utools.dbStorage.getItem("drawer.order"))
        ? utools.dbStorage.getItem("drawer.order")
        : [],
);
const operations = computed(() => [
    ...defaultOperation,
    ...setting.operation.custom,
]);
const { handleOperateClick, filterOperate } = useClipOperate({
    emit,
    currentActiveTab: () => props.currentActiveTab,
});
const selectedItemIds = ref([]);
const selectedItemIdSet = ref(new Set());
const syncSelectedItemIdSet = () => {
    selectedItemIdSet.value = new Set(
        selectItemList.value.map((item) => item?.id).filter(Boolean),
    );
};
const replaceSelectedItems = (items) => {
    selectItemList.value = Array.isArray(items) ? items : [];
    syncSelectedItemIdSet();
};
const appendSelectedItems = (items) => {
    if (!Array.isArray(items) || items.length === 0) return;
    const next = [...selectItemList.value];
    const ids = new Set(selectedItemIdSet.value);
    items.forEach((item) => {
        if (!item?.id || ids.has(item.id)) return;
        ids.add(item.id);
        next.push(item);
    });
    selectItemList.value = next;
    selectedItemIdSet.value = ids;
};
const removeSelectedItemById = (itemId) => {
    if (!itemId || !selectedItemIdSet.value.has(itemId)) return;
    replaceSelectedItems(
        selectItemList.value.filter((item) => item?.id !== itemId),
    );
};
const emptySelectItemList = () => {
    replaceSelectedItems([]);
    selectedItemIds.value = [];
};
const showItemIndexMap = computed(() => {
    const map = new Map();
    props.showList.forEach((item, index) => {
        if (item?.id) map.set(item.id, index);
    });
    return map;
});
const getShowItemIndex = (item) => {
    if (!item?.id) return -1;
    return showItemIndexMap.value.get(item.id) ?? -1;
};
const applyHoverPreviewConfig = (nextSetting = setting) => {
    hoverPreviewConfig.value = getHoverPreviewConfig(nextSetting);

    if (hoverPreviewConfig.value.enabled) return;

    resetTransientPreviewState();
};

const handleSettingUpdated = (event) => {
    applyHoverPreviewConfig(event?.detail || setting);
};

// 打开标签编辑模态框
const openTagEditModal = (item) => {
    emit("openTagEdit", item);
};

defineExpose({
    selectItemList, // 暴露给 Main/Switch中的操作按钮以执行复制
    emptySelectItemList,
    activeIndex, // 暴露当前高亮的索引
});
watch(
    () => props.isMultiple,
    (val) => {
        if (!val) {
            emptySelectItemList(); // 退出多选状态 清空列表
            allSelectedLocked.value = false; // 重置锁定状态标志
        } else if (val && selectItemList.value.length > 0) {
            // 进入多选模式且已有选中项时，初始化锁定状态标志
            updateAllSelectedLockedFlag();
        }
    },
);
// 更新所有选中项锁定状态的标志
const updateAllSelectedLockedFlag = () => {
    if (selectItemList.value.length === 0) {
        allSelectedLocked.value = false;
        return;
    }
    allSelectedLocked.value = selectItemList.value.every(
        (item) => item.locked === true,
    );
};

// 多选普通删除后：用于在 showList 更新时恢复高亮（若高亮项被删则下移，最后一个则上移）
const pendingHighlightedItemId = ref(null);
const pendingActiveIndexAfterDelete = ref(null);
const preserveSelection = () => {
    selectedItemIds.value = selectItemList.value.map((item) => item.id);
};

// 恢复选择状态
const restoreSelection = () => {
    if (!props.isMultiple || selectedItemIds.value.length === 0) return;

    const selectedIds = new Set(selectedItemIds.value);
    const newSelection = props.showList.filter((item) =>
        selectedIds.has(item.id),
    );
    replaceSelectedItems(newSelection);
    selectedItemIds.value = [];
    updateAllSelectedLockedFlag();
};

const scheduleLockPersist = () => {
    if (lockPersistTimer) return;
    lockPersistTimer = setTimeout(() => {
        lockPersistTimer = null;
        window.queuePersistDb?.();
    }, 0);
};

// 多选列表为空时自动退出多选状态
watch(
    () => selectItemList.value.length,
    (len) => {
        if (props.isMultiple && len === 0) {
            emit("toggleMultiSelect", false);
            allSelectedLocked.value = false; // 重置锁定状态标志
        } else if (props.isMultiple && len > 0) {
            // 选中项发生变化时更新锁定状态标志
            updateAllSelectedLockedFlag();
        }
    },
);
const handleItemClick = (ev, item) => {
    if (props.isMultiple === true) {
        const isSelected = selectedItemIdSet.value.has(item.id);
        const index = getShowItemIndex(item);
        activeIndex.value = index;
        if (selectItemList.value.length !== 0 && isShiftDown.value) {
            const selectedIndices = selectItemList.value
                .filter((item) =>
                    props.currentActiveTab === "all"
                        ? true
                        : item.type === props.currentActiveTab,
                )
                .map((item) => getShowItemIndex(item))
                .filter((idx) => idx !== -1)
                .sort((a, b) => a - b);
            const h = selectedIndices[0];
            const l = selectedIndices[selectedIndices.length - 1];
            if (h == null || l == null) {
                if (isSelected) removeSelectedItemById(item.id);
                else appendSelectedItems([item]);
                return;
            }
            if (index < h) {
                appendSelectedItems(props.showList.slice(index, h + 1));
            } else if (index > l) {
                appendSelectedItems(props.showList.slice(h, index + 1));
            } else if (index <= l && index >= h) {
                if (isSelected) removeSelectedItemById(item.id);
                else appendSelectedItems([item]);
            }
        } else {
            if (isSelected) removeSelectedItemById(item.id);
            else appendSelectedItems([item]);
        }
    } else {
        const { button } = ev;
        if (button === 0) {
            // 左键 复制（不改变插件内位置，可粘贴到外部）
            // 文件类型点击会打开 popover 做预览，此时禁用行级悬浮预览，鼠标移动后解除
            if (item.type === "file") {
                hoverPreviewSuspendedByClick.value = true;
            }
            // 图片类型：能展示就能复制（与悬浮预览一致，base64 或路径/file:// 均可）
            if (item.type === "image" && !getItemImageSrc(item)) {
                return;
            }
            copyAndPasteAndExit(item, { respectImageCopyGuard: true });
        } else if (button === 2) {
            // 右键 打开抽屉（与右方向键一致）
            activeIndex.value = getShowItemIndex(item);
            openDrawerForCurrentItem(ev);
            ev.preventDefault();
        }
    }
};
const handleMouseOver = (event, index, item) => {
    // 方向键或点击后挂起悬浮高亮与悬浮预览，必须等真实鼠标移动后再恢复
    const wasSuspended =
        hoverPreviewSuspendedByKeyboard.value ||
        hoverPreviewSuspendedByClick.value;

    if (!props.isMultiple && !wasSuspended) {
        activeIndex.value = index;
    }
    // 从不同行移入时停止上一行的 hover 预览，避免同一行内移动造成闪烁
    if (
        imagePreviewSource.value === "hover" &&
        hoverRowIndex.value !== null &&
        hoverRowIndex.value !== index
    ) {
        stopImagePreview(true);
    }
    hoverRowIndex.value = index;

    // 行级悬浮预览；方向键生效后的第一次移入也不启动
    if (hoverPreviewTimer) {
        clearTimeout(hoverPreviewTimer);
        hoverPreviewTimer = null;
    }
    if (
        hoverPreviewConfig.value.enabled &&
        !keyboardTriggeredPreview.value &&
        !wasSuspended
    ) {
        hoverPreviewTimer = setTimeout(() => {
            hoverTriggeredPreview.value = true;
            runPreviewForItem(item);
            hoverPreviewTimer = null;
        }, hoverPreviewConfig.value.delay);
    }
};

const handleListMouseMove = (event) => {
    const { clientX, clientY } = event;
    const last = lastPointerPosition.value;
    const moved = last.x !== clientX || last.y !== clientY;
    lastPointerPosition.value = { x: clientX, y: clientY };
    if (!moved) return;
    hoverPreviewSuspendedByKeyboard.value = false;
    hoverPreviewSuspendedByClick.value = false;
};

const clampActiveIndex = (nextIndex) => {
    if (!Array.isArray(props.showList) || props.showList.length === 0) return 0;
    return Math.min(Math.max(nextIndex, 0), props.showList.length - 1);
};

const getActiveNode = (index = activeIndex.value) =>
    listRootRef.value?.querySelector(`.clip-item[data-index="${index}"]`) ||
    null;

const scrollActiveNodeIntoView = (index = activeIndex.value, options = {}) => {
    nextTick(() => {
        const activeNode = getActiveNode(index);
        activeNode?.scrollIntoView({
            block: options.block || "nearest",
            inline: "nearest",
            behavior: options.behavior || "smooth",
        });
    });
};

const setKeyboardActiveIndex = (nextIndex, options = {}) => {
    if (!Array.isArray(props.showList) || props.showList.length === 0)
        return false;
    const targetIndex = clampActiveIndex(nextIndex);
    if (targetIndex === activeIndex.value && !options.forceScroll) return true;
    hoverPreviewSuspendedByKeyboard.value = true;
    activeIndex.value = targetIndex;
    scrollActiveNodeIntoView(targetIndex, options);
    return true;
};

const getPageStep = () => {
    const nodes = Array.from(
        listRootRef.value?.querySelectorAll(".clip-item") || [],
    ).filter((node) => node.offsetParent !== null);
    if (!nodes.length) return 1;
    const sample = nodes.slice(0, Math.min(nodes.length, 6));
    const avgHeight =
        sample.reduce(
            (sum, node) => sum + node.getBoundingClientRect().height,
            0,
        ) / sample.length;
    if (!avgHeight || Number.isNaN(avgHeight)) return 1;
    const viewportHeight =
        window.innerHeight || document.documentElement.clientHeight || avgHeight;
    return Math.max(1, Math.floor((viewportHeight / avgHeight) * 0.9));
};

const handleRowMouseLeave = (index) => {
    if (hoverPreviewTimer) {
        clearTimeout(hoverPreviewTimer);
        hoverPreviewTimer = null;
    }
    if (hoverRowIndex.value === index) {
        hoverRowIndex.value = null;
        if (hoverTriggeredPreview.value) {
            desktopPreviewManager.closeAllPreviews();
            stopImagePreview(true);
            if (textPreviewHideTimer) {
                clearTimeout(textPreviewHideTimer);
                textPreviewHideTimer = null;
            }
            textPreview.value.show = false;
            hoverTriggeredPreview.value = false;
        } else if (imagePreviewSource.value === "hover") {
            stopImagePreview(true);
        }
    }
};
// 监听activeIndex变化，在Shift长按状态下触发预览
watch(
    () => activeIndex.value,
    () => {
        if (keyboardTriggeredPreview.value) {
            triggerKeyboardPreview();
        }
    },
);

// 监听showList变化，恢复选择状态并恢复高亮
watch(
    () => props.showList,
    (newList, oldList) => {
        if (newList && oldList && newList !== oldList) {
            restoreSelection();
            if (
                props.isMultiple &&
                pendingHighlightedItemId.value != null &&
                pendingActiveIndexAfterDelete.value != null
            ) {
                const id = pendingHighlightedItemId.value;
                const oldIdx = pendingActiveIndexAfterDelete.value;
                pendingHighlightedItemId.value = null;
                pendingActiveIndexAfterDelete.value = null;
                const idx = newList.findIndex((item) => item.id === id);
                if (idx !== -1) {
                    activeIndex.value = idx;
                } else {
                    activeIndex.value = Math.min(oldIdx, newList.length - 1);
                }
            }
        }
    },
);

// 父组件中改变了引用类型的地址 故要用 getter返回
watch(
    () => props.showList,
    (newList) => {
        if (!Array.isArray(newList) || newList.length === 0) {
            activeIndex.value = 0;
            return;
        }
        if (activeIndex.value >= newList.length) {
            activeIndex.value = newList.length - 1;
        }
    },
);

function registerListHotkeyFeatures() {
    const getCanDeleteItem = (e, forceDelete) => {
        const searchInput = document.querySelector(".clip-search-input");
        const isSearchInputFocused = document.activeElement === searchInput;
        const isDeleteKey = e.key === "Delete";
        const isBackspaceKey = e.key === "Backspace";
        if (forceDelete) return true;
        if (
            isDeleteKey &&
            (e.shouldDeleteItem ||
                !isSearchInputFocused ||
                (isSearchInputFocused &&
                    searchInput &&
                    searchInput.selectionStart === searchInput.selectionEnd &&
                    searchInput.selectionStart === searchInput.value.length))
        )
            return true;
        if (isBackspaceKey && !isSearchInputFocused) return true;
        return false;
    };

    registerFeature("list-nav-up", () => {
        if (activeIndex.value === 1) {
            hoverPreviewSuspendedByKeyboard.value = true;
            window.toTop();
        }
        return setKeyboardActiveIndex(activeIndex.value - 1);
    });
    registerFeature("list-nav-down", () => {
        if (
            props.showList.length === 0 ||
            activeIndex.value >= props.showList.length - 1
        )
            return true;
        return setKeyboardActiveIndex(activeIndex.value + 1);
    });
    registerFeature("list-page-up", () => {
        if (isFocusInSearch()) return false;
        if (activeIndex.value <= 0) {
            window.toTop();
            return true;
        }
        const step = getPageStep();
        if (activeIndex.value - step <= 0) {
            window.toTop();
        }
        return setKeyboardActiveIndex(activeIndex.value - step, {
            block: "start",
        });
    });
    registerFeature("list-page-down", () => {
        if (isFocusInSearch()) return false;
        return setKeyboardActiveIndex(activeIndex.value + getPageStep(), {
            block: "end",
        });
    });
    registerFeature("list-home", () => {
        if (isFocusInSearch()) return false;
        window.toTop();
        return setKeyboardActiveIndex(0, {
            block: "start",
            forceScroll: true,
        });
    });
    registerFeature("list-end", () => {
        if (isFocusInSearch()) return false;
        return setKeyboardActiveIndex(props.showList.length - 1, {
            block: "end",
            forceScroll: true,
        });
    });
    registerFeature("list-nav-left", () => {
        return setKeyboardActiveIndex(activeIndex.value - 1);
    });
    registerFeature("list-nav-right", () => {
        return setKeyboardActiveIndex(activeIndex.value + 1);
    });
    const isFocusInSearch = () => {
        const el = document.activeElement;
        return el && (el.classList?.contains("clip-search-input") || el.closest?.(".clip-search"));
    };
    registerFeature("list-view-full", () => {
        if (isFocusInSearch()) return false;
        const item = props.showList[activeIndex.value];
        if (item) {
            emit("onDataChange", item);
            return true;
        }
        return false;
    });
    registerFeature("list-drawer-open", () => {
        if (isFocusInSearch()) return false;
        openDrawerForCurrentItem();
        return true;
    });
    registerFeature("list-tag-edit", () => {
        const item = props.showList[activeIndex.value];
        if (item && window.db && window.db.isCollected(item.id)) {
            emit("openTagEdit", item);
            return true;
        }
        return false;
    });
    registerFeature("list-enter", (e) => {
        if (props.isMultiple) {
            emit("onMultiCopyExecute", {
                paste: false,
                persist: true,
                exit: true,
            });
            return true;
        }
        if (props.showList[activeIndex.value])
            copyAndPasteAndExit(props.showList[activeIndex.value], {
                respectImageCopyGuard: true,
            });
        return true;
    });
    registerFeature("list-ctrl-enter", () => {
        if (!props.isMultiple && props.showList[activeIndex.value]) {
            const current = props.showList[activeIndex.value];
            copyAndPasteAndExit(current, { respectImageCopyGuard: true });
            window.setLock(current.id, true);
            return true;
        }
        if (props.isMultiple && selectItemList.value.length) {
            emit("onMultiCopyExecute", {
                paste: true,
                persist: true,
                exit: true,
            });
            return true;
        }
        return false;
    });
    registerFeature("list-copy", () => {
        if (props.fullData.data) {
            emit("onMultiCopyExecute", {
                paste: false,
                persist: true,
                exit: true,
            });
            return true;
        }
        if (!props.isMultiple && props.showList[activeIndex.value]) {
            copyAndPasteAndExit(props.showList[activeIndex.value], {
                paste: false,
                respectImageCopyGuard: true,
            });
            ElMessage({ message: "复制成功", type: "success" });
            return true;
        }
        return false;
    });
    registerFeature("list-collect", () => {
        const targets =
            props.isMultiple && selectItemList.value.length
                ? [...selectItemList.value]
                : props.showList[activeIndex.value]
                  ? [props.showList[activeIndex.value]]
                  : [];
        targets.forEach((item) => {
            const isCollected = window.db.isCollected(item.id);
            if (props.currentActiveTab === "collect" || isCollected)
                window.db.removeCollect(item.id);
            else window.db.addCollect(item.id);
        });
        if (targets.length) {
            ElMessage({
                type: "success",
                message:
                    props.currentActiveTab === "collect"
                        ? "已取消收藏选中项"
                        : "已更新收藏状态",
            });
            emit("onDataRemove");
        }
        return true;
    });
    registerFeature("list-lock", () => {
        const targets =
            props.isMultiple && selectItemList.value.length
                ? [...selectItemList.value]
                : props.showList[activeIndex.value]
                  ? [props.showList[activeIndex.value]]
                  : [];
        if (props.isMultiple && targets.length) {
            preserveSelection();
            const shouldLock = !allSelectedLocked.value;
            targets.forEach((item) => {
                item.locked = shouldLock;
            });
            if (window.setLocks?.(targets.map((item) => item.id), shouldLock, true)) {
                // 合并到单次异步持久化，避免锁定连续触发时重复刷新列表
                scheduleLockPersist();
            }
            allSelectedLocked.value = shouldLock;
        } else {
            targets.forEach((item) =>
                window.setLock(item.id, item.locked !== true),
            );
        }
        return true;
    });
    registerFeature("list-delete", (e) => {
        if (!getCanDeleteItem(e, false)) return false;
        const itemsToDelete = props.isMultiple
            ? selectItemList.value.length
                ? [...selectItemList.value]
                : props.showList[activeIndex.value]
                  ? [props.showList[activeIndex.value]]
                  : []
            : props.showList[activeIndex.value]
              ? [props.showList[activeIndex.value]]
              : [];
        const deletableItems = itemsToDelete.filter(
            (item) => item.locked !== true,
        );
        const skippedLocked = itemsToDelete.length - deletableItems.length;
        if (deletableItems.length) {
            if (props.isMultiple) {
                const toKeep = selectItemList.value.filter(
                    (item) => !deletableItems.includes(item),
                );
                selectedItemIds.value = toKeep.map((item) => item.id);
                replaceSelectedItems(toKeep);
                const highlighted = props.showList[activeIndex.value];
                if (highlighted) {
                    pendingHighlightedItemId.value = highlighted.id;
                    pendingActiveIndexAfterDelete.value = activeIndex.value;
                }
            }
            deletableItems.forEach((item, index) =>
                emit("onItemDelete", item, {
                    anchorIndex: activeIndex.value,
                    isBatch: props.isMultiple && deletableItems.length > 1,
                    isLast: index === deletableItems.length - 1,
                    force: false,
                }),
            );
        }
        if (skippedLocked > 0)
            ElMessage({
                type: "info",
                message: `已跳过锁定 ${skippedLocked} 条，使用 Ctrl+Delete/Ctrl+Backspace 强制删除`,
            });
        return true;
    });
    registerFeature("list-force-delete", (e) => {
        const itemsToDelete = props.isMultiple
            ? selectItemList.value.length
                ? [...selectItemList.value]
                : props.showList[activeIndex.value]
                  ? [props.showList[activeIndex.value]]
                  : []
            : props.showList[activeIndex.value]
              ? [props.showList[activeIndex.value]]
              : [];
        if (itemsToDelete.length) {
            if (props.isMultiple) {
                replaceSelectedItems(selectItemList.value.filter(
                    (item) => !itemsToDelete.includes(item),
                ));
                itemsToDelete.forEach((item, index) =>
                    emit("onItemDelete", item, {
                        anchorIndex: activeIndex.value,
                        isBatch: true,
                        isLast: index === itemsToDelete.length - 1,
                        force: true,
                    }),
                );
                replaceSelectedItems([]);
                emit("toggleMultiSelect", false);
            } else {
                itemsToDelete.forEach((item, index) =>
                    emit("onItemDelete", item, {
                        anchorIndex: activeIndex.value,
                        isBatch: false,
                        isLast: true,
                        force: true,
                    }),
                );
            }
            return true;
        }
        return false;
    });
    registerFeature("list-space", () => {
        if (props.isSearchPanelExpand) return false;
        if (!props.isMultiple) emit("toggleMultiSelect", true);
        const currentItem = props.showList[activeIndex.value];
        if (!currentItem) return true;
        if (selectedItemIdSet.value.has(currentItem.id)) {
            removeSelectedItemById(currentItem.id);
        } else {
            appendSelectedItems([currentItem]);
            activeIndex.value++;
            document
                .querySelector(".clip-item.multi-active+.clip-item")
                ?.scrollIntoView({ block: "nearest", inline: "nearest" });
        }
        return true;
    });
    registerFeature("list-shift", () => {
        if (props.isMultiple) isShiftDown.value = true;
        handleShiftKeyDown();
        return true;
    });
    for (let n = 1; n <= 9; n++) {
        registerFeature(`list-quick-copy-${n}`, () => {
            const targetItem = props.showList[n - 1];
            if (targetItem) {
                copyAndPasteAndExit(targetItem, {
                    respectImageCopyGuard: true,
                });
                replaceSelectedItems([]);
                return true;
            }
            return false;
        });
    }
    for (let n = 1; n <= 9; n++) {
        const num = n;
        registerFeature(`list-drawer-sub-${num}`, () => {
            const currentItem = props.showList[activeIndex.value];
            if (!currentItem) return false;
            openDrawerForCurrentItem(null, num - 1);
            return true;
        });
    }
}

const keyDownCallBack = (e) => {
    if (e.__hotkeyHandled) return;
    if (e.key !== "Shift" || e.repeat) return;
    if (props.isMultiple) isShiftDown.value = true;
    handleShiftKeyDown();
};

const keyUpCallBack = (e) => {
    if (e.__hotkeyHandled) return;
    const { key } = e;
    const isShift = key === "Shift";
    if (isShift) {
        e.preventDefault();
        e.stopPropagation();
        if (props.isMultiple) isShiftDown.value = false;
        handleShiftKeyUp();
    }
};

onMounted(() => {
    applyHoverPreviewConfig(setting);
    registerListHotkeyFeatures();
    document.addEventListener("keydown", keyDownCallBack);
    document.addEventListener("keyup", keyUpCallBack);
    window.addEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
});

onUnmounted(() => {
    document.removeEventListener("keydown", keyDownCallBack);
    document.removeEventListener("keyup", keyUpCallBack);
    window.removeEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
    if (lockPersistTimer) {
        clearTimeout(lockPersistTimer);
        lockPersistTimer = null;
    }

    // 清理图片预览定时器
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }
    resetTransientPreviewState();
});
</script>

<style lang="less" scoped>
@import "../style";

.text-preview-modal {
    .text-preview-content {
        white-space: pre-wrap;
        word-break: break-word;
        max-height: inherit;
        overflow: auto;
    }
}

.image-preview-modal {
    .image-preview-content {
        flex: 1;
        min-height: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
    }
    .image-preview-footer {
        margin-top: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        white-space: pre-wrap;
        word-break: break-all;
        text-align: center;
    }
    .preview-error {
        padding: 16px;
        color: #ef4444;
        font-size: 14px;
    }
}
</style>
