<template>
    <div
        class="clip-item-list"
        ref="listRootRef"
        @mousemove.passive="handleListMouseMove"
        :class="{ 'few-items': showList.length <= 3 }"
        role="listbox"
    >
        <DynamicScroller
            ref="scrollerRef"
            class="scroller"
            :items="showList"
            :min-item-size="44"
            key-field="id"
            v-slot="{ item, index, active }"
            @scroll-end="onRecycleScrollerScrollEnd"
        >
            <DynamicScrollerItem
                :item="item"
                :active="active"
                :size-dependencies="
                    isMultiple
                        ? [item.type, item.id, activeIndex === index]
                        : [item.type, item.id]
                "
                :data-index="index"
            >
                <ClipItemRow
                    v-memo="[
                        item.id,
                        item.updateTime,
                        item.type,
                        item.locked,
                        activeIndex === index,
                        isMultiple,
                        selectedItemIdSet.has(item.id),
                        isItemCollected(item),
                        currentActiveTab,
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
                    :is-previewable-text="isPreviewableTextItem(item)"
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
            </DynamicScrollerItem>
        </DynamicScroller>
        <div v-if="showList.length === 0" class="empty-placeholder">暂无数据</div>
    </div>

    <!-- Custom Image Preview -->
    <Teleport to="body">
        <div
            v-if="imagePreview.show"
            class="image-preview-modal"
            :style="imagePreview.style"
            @mouseenter="keepImagePreview"
            @mouseleave="hideImagePreview"
            @keydown="handleImagePreviewKeydown"
            tabindex="0"
        >
            <div 
                class="image-preview-content"
                ref="imagePreviewContentRef"
                @scroll="handleImagePreviewScroll"
            >
                <div
                    v-if="isPreviewableImageSrc(imagePreview.src) && !imagePreview.loadFailed"
                    class="image-preview-inner"
                    :class="{
                        'is-centered': imagePreview.layoutMode === 'centered',
                        'is-scroll': imagePreview.layoutMode === 'fit-width-scroll',
                    }"
                    :style="imagePreview.contentStyle"
                >
                    <img
                        :src="imagePreview.src"
                        :style="imagePreview.imageStyle"
                        @error="handleImageError"
                        @load="handleImageLoad"
                    />
                </div>
                <div v-else class="preview-error">
                    <span>图片加载失败</span>
                </div>
            </div>
            <div
                v-if="imagePreview.footer || imagePreview.hint"
                class="image-preview-footer"
            >
                <div v-if="imagePreview.footer" class="image-preview-footer-main">
                    {{ imagePreview.footer }}
                </div>
                <div v-if="imagePreview.hint" class="image-preview-hint">
                    {{ imagePreview.hint }}
                </div>
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
        <div
            class="text-preview-content"
            :class="{ 'is-single-line': textPreview.isSingleLine }"
            :style="textPreview.contentStyle"
            ref="textPreviewContentRef"
        >
            {{ textPreview.text }}
        </div>
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
import { DynamicScroller, DynamicScrollerItem } from "vue-virtual-scroller";
import "vue-virtual-scroller/dist/vue-virtual-scroller.css";
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
    "loadMore",
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
    imagePreview.value.loadFailed = true;
};

const PREVIEW_MODAL_PADDING = 40;
const PREVIEW_SCROLL_STEP = 150;
const IMAGE_PREVIEW_HINT_TEXT = {
    both: "Shift + ↑/↓/←/→ 移动预览",
    vertical: "Shift + ↑/↓ 移动预览",
    horizontal: "Shift + ←/→ 移动预览",
};

const getImagePreviewMetrics = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = Math.max(viewportWidth - PREVIEW_MODAL_PADDING, 0);
    const availableHeight = Math.max(viewportHeight - PREVIEW_MODAL_PADDING, 0);
    return {
        viewportWidth,
        viewportHeight,
        availableWidth,
        availableHeight,
    };
};

const getImagePreviewHint = (canScrollX, canScrollY) => {
    if (canScrollX && canScrollY) return IMAGE_PREVIEW_HINT_TEXT.both;
    if (canScrollY) return IMAGE_PREVIEW_HINT_TEXT.vertical;
    if (canScrollX) return IMAGE_PREVIEW_HINT_TEXT.horizontal;
    return "";
};

const buildImagePreviewFooter = (footerText = "", canScrollX = false, canScrollY = false) => ({
    footer: footerText ? String(footerText) : "",
    hint: getImagePreviewHint(canScrollX, canScrollY),
});

const applyImagePreviewLayout = (naturalWidth, naturalHeight) => {
    if (!naturalWidth || !naturalHeight) return;
    const { availableWidth, availableHeight } = getImagePreviewMetrics();
    const scaleByWidth = availableWidth / naturalWidth;
    const scaleByHeight = availableHeight / naturalHeight;
    const fitScale = Math.min(scaleByWidth, scaleByHeight);
    const fitDisplayWidth = naturalWidth * fitScale;
    const fitDisplayHeight = naturalHeight * fitScale;
    const fitWidthUsage = availableWidth ? fitDisplayWidth / availableWidth : 0;
    const fitHeightUsage = availableHeight ? fitDisplayHeight / availableHeight : 0;
    const shouldPreferFullView =
        fitScale >= 1 || (fitWidthUsage >= 0.58 && fitHeightUsage >= 0.58);

    let displayWidth = fitDisplayWidth;
    let displayHeight = fitDisplayHeight;
    let canScrollX = false;
    let canScrollY = false;

    if (!shouldPreferFullView) {
        displayWidth = availableWidth;
        displayHeight = naturalHeight * scaleByWidth;
        canScrollX = displayWidth > availableWidth;
        canScrollY = displayHeight > availableHeight;
    }

    const isCentered = !canScrollY;

    imagePreview.value.layoutMode = isCentered ? "centered" : "fit-width-scroll";
    imagePreview.value.canScrollX = canScrollX;
    imagePreview.value.canScrollY = canScrollY;
    imagePreview.value.hint = getImagePreviewHint(canScrollX, canScrollY);
    imagePreview.value.contentStyle = {
        minHeight: `${availableHeight}px`,
    };
    imagePreview.value.imageStyle = {
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        maxWidth: "none",
        maxHeight: "none",
        display: "block",
        imageRendering: "auto",
    };

    nextTick(() => {
        if (imagePreviewContentRef.value) {
            imagePreviewContentRef.value.scrollTop = 0;
            imagePreviewContentRef.value.scrollLeft = 0;
        }
        imagePreview.value.scrollTop = 0;
    });
};

const scrollPreviewContainer = (container, axis, delta) => {
    if (!container || !delta) return false;
    const key = axis === "x" ? "scrollLeft" : "scrollTop";
    const maxKey = axis === "x"
        ? container.scrollWidth - container.clientWidth
        : container.scrollHeight - container.clientHeight;
    if (maxKey <= 0) return false;
    const nextValue = Math.min(Math.max(0, container[key] + delta), maxKey);
    if (nextValue === container[key]) return false;
    container[key] = nextValue;
    if (axis === "y" && container === imagePreviewContentRef.value) {
        imagePreview.value.scrollTop = container.scrollTop;
    }
    return true;
};

const handlePreviewScrollShortcut = (direction) => {
    if (imagePreview.value.show && imagePreviewContentRef.value) {
        if (direction === "up") {
            return scrollPreviewContainer(
                imagePreviewContentRef.value,
                "y",
                -PREVIEW_SCROLL_STEP,
            );
        }
        if (direction === "down") {
            return scrollPreviewContainer(
                imagePreviewContentRef.value,
                "y",
                PREVIEW_SCROLL_STEP,
            );
        }
        if (direction === "left") {
            return scrollPreviewContainer(
                imagePreviewContentRef.value,
                "x",
                -PREVIEW_SCROLL_STEP,
            );
        }
        if (direction === "right") {
            return scrollPreviewContainer(
                imagePreviewContentRef.value,
                "x",
                PREVIEW_SCROLL_STEP,
            );
        }
    }

    if (textPreview.value.show && textPreviewContentRef.value) {
        if (direction === "up") {
            return scrollPreviewContainer(
                textPreviewContentRef.value,
                "y",
                -PREVIEW_SCROLL_STEP,
            );
        }
        if (direction === "down") {
            return scrollPreviewContainer(
                textPreviewContentRef.value,
                "y",
                PREVIEW_SCROLL_STEP,
            );
        }
    }

    return false;
};

// 图片加载成功处理
const handleImageLoad = (event) => {
    console.log("[ClipItemList] 图片加载成功:", event.target.src);
    applyImagePreviewLayout(
        event.target.naturalWidth,
        event.target.naturalHeight,
    );
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
    // 悬浮预览优先使用原图以提升清晰度
    return resolvePreviewImageSrc(item.data) || item.thumbnail;
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

    const { viewportWidth, viewportHeight } = getImagePreviewMetrics();
    
    imagePreview.value.src = src;
    const footerMeta = buildImagePreviewFooter(footerText);
    imagePreview.value.footer = footerMeta.footer;
    imagePreview.value.hint = footerMeta.hint;
    imagePreview.value.scrollTop = 0; // 重置滚动位置
    imagePreview.value.loadFailed = false;
    imagePreview.value.layoutMode = "centered";
    imagePreview.value.canScrollX = false;
    imagePreview.value.canScrollY = false;
    imagePreview.value.contentStyle = {};
    
    imagePreview.value.style = {
        position: "fixed",
        top: "0",
        left: "0",
        right: "0",
        bottom: "0",
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: "0",
        padding: "20px",
        boxShadow: "none",
        maxWidth: `${viewportWidth}px`,
        maxHeight: `${viewportHeight}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        outline: "none", // 移除焦点轮廓
    };
    
    imagePreview.value.imageStyle = {
        width: "auto",
        height: "auto",
        display: "block",
        imageRendering: "auto",
    };
    imagePreview.value.show = true;
    
    // 自动聚焦以接收键盘事件
    nextTick(() => {
        const modal = document.querySelector('.image-preview-modal');
        if (modal) {
            modal.focus();
        }
    });
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
        imagePreview.value.footer = "";
        imagePreview.value.hint = "";
        imagePreview.value.loadFailed = false;
        // 不调用 restorePreviewWindow，保持插件窗口大小不变
        closeExternalPreview();
        return;
    }
    imagePreviewHideTimer = setTimeout(() => {
        imagePreview.value.show = false;
        imagePreviewSource.value = "";
        imagePreview.value.footer = "";
        imagePreview.value.hint = "";
        imagePreview.value.loadFailed = false;
        // 不调用 restorePreviewWindow，保持插件窗口大小不变
        closeExternalPreview();
        imagePreviewHideTimer = null;
    }, 200);
};

// 组件卸载时清理预览窗口
onUnmounted(() => {
    desktopPreviewManager.closeAllPreviews();
    stopKeyHold(); // 清理长按检测定时器
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

// 图片预览滚动处理
const handleImagePreviewScroll = (event) => {
    imagePreview.value.scrollTop = event.target.scrollTop;
};

// 图片预览键盘处理兜底；主入口仍走 hotkey feature
const handleImagePreviewKeydown = (event) => {
    if (!imagePreview.value.show || !event.shiftKey) return;
    const directionMap = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
    };
    const direction = directionMap[event.key];
    if (!direction) return;
    if (handlePreviewScrollShortcut(direction)) {
        event.preventDefault();
        event.stopPropagation();
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

const isPreviewableTextItem = (item) => isLongText(item);

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
    textPreview.value.isSingleLine = false;
    textPreview.value.contentStyle = {};
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
    // 文字预览半透明黑色背景，居中显示
    const maxW = window.innerWidth;
    const maxH = window.innerHeight;
    const text = item.data || "";
    const isSingleLine = !text.includes("\n");
    textPreview.value.text = text;
    textPreview.value.isSingleLine = isSingleLine;
    textPreview.value.show = true;
    textPreview.value.style = {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 9999,
        background:
            isSingleLine
                ? "linear-gradient(180deg, rgba(18, 23, 31, 0.94) 0%, rgba(11, 15, 22, 0.92) 100%)"
                : "rgba(10, 14, 20, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        borderRadius: isSingleLine ? "14px" : "12px",
        padding: "24px 28px",
        boxShadow: "0 18px 48px rgba(0, 0, 0, 0.34)",
        backdropFilter: "blur(12px)",
        width: `${maxW * 0.9}px`,
        maxWidth: `${maxW * 0.9}px`,
        maxHeight: `${maxH * 0.8}px`,
        display: "flex",
        alignItems: "center",
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#e8e6e3",
    };
    textPreview.value.contentStyle = isSingleLine
        ? {
              width: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "15px",
              letterSpacing: "0.01em",
              color: "#f3f7ff",
          }
        : {
              width: "100%",
              maxHeight: `${maxH * 0.8 - 48}px`,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "#e8edf8",
          };

    nextTick(() => {
        if (textPreviewContentRef.value) {
            textPreviewContentRef.value.scrollTop = 0;
        }
    });
};

const hideTextPreview = () => {
    // 移除延时隐藏，文字预览只在Shift键释放时隐藏
    textPreview.value.show = false;
    textPreview.value.text = "";
    textPreview.value.isSingleLine = false;
    textPreview.value.contentStyle = {};
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
    hint: "",
    style: {},
    imageStyle: {},
    contentStyle: {},
    layoutMode: "centered",
    canScrollX: false,
    canScrollY: false,
    loadFailed: false,
    scrollTop: 0, // 添加滚动位置跟踪
});
const imagePreviewSource = ref("");
const hoverRowIndex = ref(null);
const previewWindowSize = ref(null);
const listRootRef = ref(null);
const scrollerRef = ref(null);
const imagePreviewContentRef = ref(null); // 图片预览内容容器引用
const textPreviewContentRef = ref(null);
const lastPointerPosition = ref({ x: null, y: null });

// 列表在 .vue-recycle-scroller 内滚动，scroll 不冒泡到 document，原 Main 里 document 监听永远进不了底部加载；scrollEnd 在滚到当前 items 末尾时触发
let scrollEndLoadMoreTs = 0;
const SCROLL_END_LOAD_MORE_COOLDOWN_MS = 120;
const onRecycleScrollerScrollEnd = () => {
    const now = Date.now();
    if (now - scrollEndLoadMoreTs < SCROLL_END_LOAD_MORE_COOLDOWN_MS) {
        return;
    }
    scrollEndLoadMoreTs = now;
    emit("loadMore");
};

// 长文本预览相关
const textPreview = ref({
    show: false,
    text: "",
    style: {},
    contentStyle: {},
    isSingleLine: false,
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
// 自动滚动相关
const autoScrollTimer = ref(null);
const autoScrollSpeed = ref(100); // 初始滚动间隔(ms)
const autoScrollDirection = ref(null); // 'up' or 'down'
const autoScrollAcceleration = ref(1.2); // 加速因子
// 方向键长按检测相关
const keyHoldTimer = ref(null);
const keyHoldDirection = ref(null);
const keyHoldStartTime = ref(0);
const KEY_HOLD_DELAY = 300; // 开始长按检测的延迟(ms)
const KEY_HOLD_REPEAT_INTERVAL = 150; // 长按重复间隔(ms)
const activeIndex = ref(0); // 定义 activeIndex，需要在 defineExpose 之前
/** 末项按 ↓ 时先 loadMore，列表变长后应选中此项（原 showList.length） */
const pendingNavAfterLoad = ref(null);
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
        const currentIndex = getShowItemIndex(item);
        activeIndex.value = currentIndex;
        
        if (button === 0) {
            // 左键 复制并移动到下一个item
            // 文件类型点击会打开 popover 做预览，此时禁用行级悬浮预览，鼠标移动后解除
            if (item.type === "file") {
                hoverPreviewSuspendedByClick.value = true;
            }
            // 图片类型：能展示就能复制（与悬浮预览一致，base64 或路径/file:// 均可）
            if (item.type === "image" && !getItemImageSrc(item)) {
                return;
            }
            copyAndPasteAndExit(item, { respectImageCopyGuard: true });
            
            // 复制后移动到下一个item
            nextTick(() => {
                const nextIndex = Math.min(currentIndex + 1, props.showList.length - 1);
                if (nextIndex !== currentIndex) {
                    setKeyboardActiveIndex(nextIndex, { block: "center" });
                }
            });
        } else if (button === 2) {
            // 右键 打开抽屉并移动到下一个item
            openDrawerForCurrentItem(ev);
            ev.preventDefault();
            
            // 打开抽屉后移动到下一个item
            nextTick(() => {
                const nextIndex = Math.min(currentIndex + 1, props.showList.length - 1);
                if (nextIndex !== currentIndex) {
                    setKeyboardActiveIndex(nextIndex, { block: "center" });
                }
            });
        }
    }
};
const handleMouseOver = (event, index, item) => {
    if (keyboardTriggeredPreview.value) {
        if (hoverPreviewTimer) {
            clearTimeout(hoverPreviewTimer);
            hoverPreviewTimer = null;
        }
        hoverRowIndex.value = index;
        return;
    }

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

const getScrollContainer = () => {
    const scrollerEl = scrollerRef.value?.$el;
    if (!scrollerEl) return null;
    return (
        scrollerEl.querySelector(".vue-recycle-scroller") ||
        scrollerEl.querySelector(".scroller") ||
        scrollerEl.querySelector("[data-virtual-scroller]") ||
        scrollerEl.querySelector(".v-virtual-scroller") ||
        scrollerEl
    );
};

const isNodeFullyVisible = (node, container) => {
    if (!node || !container) return false;
    const nodeRect = node.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return (
        nodeRect.top >= containerRect.top &&
        nodeRect.bottom <= containerRect.bottom
    );
};

const scrollActiveNodeIntoView = (index = activeIndex.value, options = {}) => {
    const block = options.block || "nearest";
    // vue-virtual-scroller 的 align 参数：start/center/end
    const align =
        block === "end"
            ? "end"
            : block === "start"
              ? "start"
              : "center";
    
    const doScroll = () => {
        const activeNode = getActiveNode(index);
        const scrollContainer = getScrollContainer();
        // 优先使用虚拟滚动的 scrollToItem API
        if (scrollerRef.value && typeof scrollerRef.value.scrollToItem === "function") {
            // 延迟执行，确保虚拟滚动渲染完成
            scrollerRef.value.scrollToItem(index, {
                align,
                smooth: false,
            });
            return;
        }
        
        // 降级方案：使用 DOM scrollIntoView
        if (activeNode) {
            if (
                !options.forceScroll &&
                isNodeFullyVisible(activeNode, scrollContainer)
            ) {
                return;
            }
            activeNode.scrollIntoView({
                block,
                inline: "nearest",
                behavior: "instant",
            });
            return;
        }

        if (!activeNode && scrollerRef.value && typeof scrollerRef.value.scrollToItem === "function") {
            scrollerRef.value.scrollToItem(index, {
                align,
                smooth: false,
            });
            return;
        }

        {
            // 如果 DOM 元素不存在，尝试滚动到大概位置
            const scrollerEl = scrollerRef.value?.$el;
            if (scrollerEl) {
                const scrollContainers = [
                    scrollerEl.querySelector('.vue-recycle-scroller'),
                    scrollerEl.querySelector('.scroller'),
                    scrollerEl.querySelector('[data-virtual-scroller]'),
                    scrollerEl.querySelector('.v-virtual-scroller'),
                    scrollerEl
                ].filter(Boolean);
                
                for (const container of scrollContainers) {
                    if (container && container.scrollTop !== undefined) {
                        const itemSize = 44;
                        const targetScrollTop = index * itemSize;
                        const containerHeight = container.clientHeight;
                        const maxScrollTop = container.scrollHeight - container.clientHeight;
                        
                        let newScrollTop;
                        if (block === "start") {
                            newScrollTop = targetScrollTop;
                        } else if (block === "end") {
                            // 只滚动到刚好让最后一个item完全可见的位置
                            newScrollTop = Math.min(maxScrollTop, targetScrollTop - containerHeight + itemSize);
                        } else {
                            newScrollTop =
                                targetScrollTop -
                                containerHeight / 2 +
                                itemSize / 2;
                        }
                        
                        // 确保不会滚动超过当前太多
                        const currentScrollTop = container.scrollTop;
                        const scrollDelta = Math.abs(newScrollTop - currentScrollTop);
                        const maxScrollDelta = containerHeight / 2; // 最多滚动半个屏幕
                        
                        if (scrollDelta <= maxScrollDelta) {
                            container.scrollTop = Math.max(
                                0,
                                Math.min(maxScrollTop, newScrollTop),
                            );
                        } else {
                            // 如果需要滚动太多，就只滚动一点点
                            const direction = newScrollTop > currentScrollTop ? 1 : -1;
                            container.scrollTop = currentScrollTop + (maxScrollDelta * direction);
                        }
                        break;
                    }
                }
            }
        }
    };
    
    // 立即执行一次
    doScroll();
};

const setKeyboardActiveIndex = (nextIndex, options = {}) => {
    if (!Array.isArray(props.showList) || props.showList.length === 0)
        return false;
    const targetIndex = clampActiveIndex(nextIndex);
    if (targetIndex === activeIndex.value && !options.forceScroll) return true;
    hoverPreviewSuspendedByKeyboard.value = true;
    
    // 立即更新activeIndex，确保响应性
    activeIndex.value = targetIndex;
    
    // 使用nextTick确保DOM更新后再滚动
    nextTick(() => {
        scrollActiveNodeIntoView(targetIndex, options);
    });
    
    return true;
};

// 直接滚动到底部的方法
const scrollToBottom = () => {
    const scroller = scrollerRef.value;
    if (scroller && typeof scroller.scrollToItem === "function") {
        const lastIndex = props.showList.length - 1;
        scroller.scrollToItem(lastIndex, {
            align: "end",
            smooth: false,
        });
        activeIndex.value = lastIndex;
        return true;
    }
    return false;
};

// 直接滚动到顶部的方法
const scrollToTop = () => {
    const scroller = scrollerRef.value;
    if (scroller && typeof scroller.scrollToItem === "function") {
        scroller.scrollToItem(0, {
            align: "start",
            smooth: false,
        });
        activeIndex.value = 0;
        return true;
    }
    return false;
};

defineExpose({
    selectItemList, // 暴露给 Main/Switch中的操作按钮以执行复制
    emptySelectItemList,
    activeIndex, // 暴露当前高亮的索引
    setKeyboardActiveIndex, // 暴露设置高亮索引的方法
    // scrollToBottom, // 暴露滚动到底部的方法
    // scrollToTop, // 暴露滚动到顶部的方法
});

const getPageStep = () => {
    // 在虚拟滚动模式下，使用 min-item-size 计算（与 DynamicScroller 的 min-item-size 保持一致）
    const itemSize = 44;
    // 使用实际滚动容器的高度，而不是 window.innerHeight
    const containerHeight = scrollerRef.value?.$el?.clientHeight ||
                            listRootRef.value?.clientHeight ||
                            window.innerHeight ||
                            document.documentElement.clientHeight ||
                            600;
    return Math.max(1, Math.floor((containerHeight / itemSize) * 0.9));
};

// 边界检测：是否在列表顶部
const isAtTopBoundary = () => {
    return activeIndex.value <= 0;
};

// 边界检测：是否在列表底部
const isAtBottomBoundary = () => {
    return activeIndex.value >= props.showList.length - 1;
};

// 半页滚动并移动一个item
const halfPageScrollAndMove = (direction) => {
    const scroller = scrollerRef.value;
    if (!scroller) return;
    
    // 尝试使用 vue-virtual-scroller 的滚动容器
    let scrollerEl = scroller.$el?.querySelector('.vue-recycle-scroller') || 
                    scroller.$el?.querySelector('.scroller') ||
                    scroller.$el;
    
    if (!scrollerEl) return;
    
    // 如果找到了滚动容器且有 scrollTop 属性
    if (scrollerEl.scrollTop !== undefined) {
        if (direction === 'up') {
            const currentScrollTop = scrollerEl.scrollTop;
            const halfPageHeight = Math.floor(scrollerEl.clientHeight / 2);
            const newScrollTop = Math.max(0, currentScrollTop - halfPageHeight);
            scrollerEl.scrollTop = newScrollTop;
            
            if (activeIndex.value > 0) {
                nextTick(() => {
                    setKeyboardActiveIndex(activeIndex.value - 1, { block: "start", forceScroll: true });
                });
            }
        } else {
            const currentScrollTop = scrollerEl.scrollTop;
            const halfPageHeight = Math.floor(scrollerEl.clientHeight / 2);
            const maxScrollTop = scrollerEl.scrollHeight - scrollerEl.clientHeight;
            const newScrollTop = Math.min(maxScrollTop, currentScrollTop + halfPageHeight);
            scrollerEl.scrollTop = newScrollTop;
            
            if (activeIndex.value < props.showList.length - 1) {
                nextTick(() => {
                    setKeyboardActiveIndex(activeIndex.value + 1, { block: "end", forceScroll: true });
                });
            }
        }
    } else {
        // 降级方案：使用 scrollToItem 滚动到较远的item
        const halfStep = Math.max(1, Math.floor(getPageStep() / 2));
        if (direction === 'up') {
            const targetIndex = Math.max(0, activeIndex.value - halfStep);
            scroller.scrollToItem(targetIndex, { align: 'start' });
            if (activeIndex.value > 0) {
                nextTick(() => {
                    setKeyboardActiveIndex(activeIndex.value - 1, { block: "start", forceScroll: true });
                });
            }
        } else {
            const targetIndex = Math.min(props.showList.length - 1, activeIndex.value + halfStep);
            scroller.scrollToItem(targetIndex, { align: 'end' });
            if (activeIndex.value < props.showList.length - 1) {
                nextTick(() => {
                    setKeyboardActiveIndex(activeIndex.value + 1, { block: "end", forceScroll: true });
                });
            }
        }
    }
};

// 停止长按检测
const stopKeyHold = () => {
    if (keyHoldTimer.value) {
        clearTimeout(keyHoldTimer.value);
        keyHoldTimer.value = null;
    }
    keyHoldDirection.value = null;
    keyHoldStartTime.value = 0;
};

// 长按自动滚动
const startKeyHoldAutoScroll = (direction) => {
    keyHoldDirection.value = direction;
    keyHoldStartTime.value = Date.now();
    
    // 延迟后开始自动滚动
    keyHoldTimer.value = setTimeout(() => {
        const autoScroll = () => {
            if (!keyHoldDirection.value) return;
            
            // 计算加速后的滚动间隔
            const elapsed = Date.now() - keyHoldStartTime.value;
            const acceleratedInterval = Math.max(50, KEY_HOLD_REPEAT_INTERVAL - Math.floor(elapsed / 1000) * 10);
            
            // 执行半页滚动并保持居中
            if (direction === 'up') {
                if (activeIndex.value > 0) {
                    const step = getPageStep();
                    const targetIndex = Math.max(0, activeIndex.value - step);
                    setKeyboardActiveIndex(targetIndex, { block: "center" });
                }
            } else {
                if (activeIndex.value < props.showList.length - 1) {
                    const step = getPageStep();
                    const targetIndex = Math.min(props.showList.length - 1, activeIndex.value + step);
                    setKeyboardActiveIndex(targetIndex, { block: "center" });
                }
            }
            
            // 继续下一次滚动
            keyHoldTimer.value = setTimeout(autoScroll, acceleratedInterval);
        };
        
        autoScroll();
    }, KEY_HOLD_DELAY);
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
        // 当键盘导航接近列表末尾时，触发懒加载
        const LOAD_MORE_THRESHOLD = 5;
        if (activeIndex.value >= props.showList.length - LOAD_MORE_THRESHOLD) {
            emit("loadMore");
        }
    },
);

watch(
    () => props.showList.length,
    (newLen, oldLen) => {
        if (pendingNavAfterLoad.value == null || oldLen === undefined) return;
        const target = pendingNavAfterLoad.value;
        if (newLen > oldLen && target < newLen) {
            activeIndex.value = target;
            pendingNavAfterLoad.value = null;
            nextTick(() =>
                scrollActiveNodeIntoView(target, { block: "end" }),
            );
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

    registerFeature("list-nav-up", (e) => {
        // 停止之前的长按检测
        if (e?.key === "ArrowUp") return false;
        stopKeyHold();
        
        // 边界检测：如果在顶部，停止移动并确保可见
        if (activeIndex.value <= 0) {
            hoverPreviewSuspendedByKeyboard.value = true;
            // 确保第一个item在顶部可见
            setKeyboardActiveIndex(0, { block: "start", forceScroll: true });
            startKeyHoldAutoScroll('up');
            return true;
        }
        
        // 正常移动一个item
        const result = setKeyboardActiveIndex(activeIndex.value - 1, {
            block: "start",
        });
        
        // 开始长按检测
        if (result) {
            startKeyHoldAutoScroll('up');
        }
        
        return result;
    });
    registerFeature("list-nav-down", (e) => {
        if (e?.key === "ArrowDown") return false;
        if (props.showList.length === 0) {
            stopKeyHold();
            return true;
        }
        
        // 停止之前的长按检测
        stopKeyHold();
        
        // 边界检测：如果在底部，先尝试加载更多数据
        if (isAtBottomBoundary()) {
            hoverPreviewSuspendedByKeyboard.value = true;
            
            // 尝试加载更多数据
            const oldLen = props.showList.length;
            pendingNavAfterLoad.value = oldLen;
            emit("loadMore");
            
            nextTick(() => {
                nextTick(() => {
                    if (pendingNavAfterLoad.value === null) return;
                    if (props.showList.length <= oldLen) {
                        pendingNavAfterLoad.value = null;
                        // 没有更多数据，确保最后一个item完全可见
                        const lastIndex = props.showList.length - 1;
                        setKeyboardActiveIndex(lastIndex, { block: "end", forceScroll: true });
                    } else {
                        // 有新数据，移动到新数据
                        const targetIndex = oldLen;
                        activeIndex.value = targetIndex;
                        setKeyboardActiveIndex(targetIndex, { block: "center" });
                        pendingNavAfterLoad.value = null;
                    }
                });
            });
            
            startKeyHoldAutoScroll('down');
            return true;
        }
        
        // 正常移动一个item
        const nextIndex = activeIndex.value + 1;
        const isLast = nextIndex >= props.showList.length - 1;
        const result = setKeyboardActiveIndex(nextIndex, {
            block: isLast ? "end" : "center",
        });
        
        // 开始长按检测
        if (result) {
            startKeyHoldAutoScroll('down');
        }
        
        return result;
    });
    registerFeature("list-page-up", () => {
        if (isFocusInSearch()) return false;
        if (activeIndex.value <= 0) {
            window.toTop();
            return true;
        }
        const step = getPageStep();
        const targetIndex = Math.max(0, activeIndex.value - step);
        if (targetIndex === 0) {
            window.toTop();
        }
        // 使用 start 对齐，确保向上翻页后顶部可见
        return setKeyboardActiveIndex(targetIndex, {
            block: targetIndex === 0 ? "start" : "center",
        });
    });
    registerFeature("list-page-down", () => {
        if (isFocusInSearch()) return false;
        const step = getPageStep();
        const targetIndex = Math.min(props.showList.length - 1, activeIndex.value + step);
        // 如果是最后一个item，使用 end 对齐确保完全可见
        return setKeyboardActiveIndex(targetIndex, {
            block: targetIndex === props.showList.length - 1 ? "end" : "center",
        });
    });
    registerFeature("list-nav-left", () => {
        return setKeyboardActiveIndex(activeIndex.value - 1);
    });
    registerFeature("list-scroll-to-bottom", () => {
        // 直接滚动到底部
        const scroller = scrollerRef.value;
        if (scroller && typeof scroller.scrollToItem === "function") {
            const lastIndex = props.showList.length - 1;
            scroller.scrollToItem(lastIndex, {
                align: "end",
                smooth: false,
            });
            // 同时设置activeIndex到最后一个
            activeIndex.value = lastIndex;
            return true;
        }
        return false;
    });
    registerFeature("list-scroll-to-top", () => {
        // 直接滚动到顶部
        const scroller = scrollerRef.value;
        if (scroller && typeof scroller.scrollToItem === "function") {
            scroller.scrollToItem(0, {
                align: "start",
                smooth: false,
            });
            // 同时设置activeIndex到第一个
            activeIndex.value = 0;
            return true;
        }
        return false;
    });
    registerFeature("text-preview-scroll-up", () => {
        return handlePreviewScrollShortcut("up");
    });
    registerFeature("text-preview-scroll-down", () => {
        return handlePreviewScrollShortcut("down");
    });
    registerFeature("image-preview-scroll-left", () => {
        return handlePreviewScrollShortcut("left");
    });
    registerFeature("image-preview-scroll-right", () => {
        return handlePreviewScrollShortcut("right");
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
            scrollActiveNodeIntoView();
        }
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

// 自动滚动功能
const startAutoScroll = (direction) => {
    if (autoScrollTimer.value) return;
    
    autoScrollDirection.value = direction;
    let hasRepeated = false;
    autoScrollSpeed.value = 100; // 重置速度
    
    const scroll = () => {
        if (direction === 'up') {
            if (activeIndex.value > 0) {
                if (!hasRepeated) {
                    setKeyboardActiveIndex(activeIndex.value - 1, {
                        block: "nearest",
                    });
                } else {
                    const step = getPageStep();
                    const targetIndex = Math.max(0, activeIndex.value - step);
                    setKeyboardActiveIndex(targetIndex, { block: "center" });
                }
            } else {
                stopAutoScroll();
                return;
            }
        } else if (direction === 'down') {
            if (activeIndex.value < props.showList.length - 1) {
                if (!hasRepeated) {
                    setKeyboardActiveIndex(activeIndex.value + 1, {
                        block: "nearest",
                    });
                } else {
                    const step = getPageStep();
                    const targetIndex = Math.min(
                        props.showList.length - 1,
                        activeIndex.value + step,
                    );
                    setKeyboardActiveIndex(targetIndex, { block: "center" });
                }
            } else {
                // 到达底部时触发加载更多
                const oldLen = props.showList.length;
                hoverPreviewSuspendedByKeyboard.value = true;
                pendingNavAfterLoad.value = oldLen;
                emit("loadMore");
                
                // 等待数据加载完成后继续滚动
                nextTick(() => {
                    nextTick(() => {
                        if (pendingNavAfterLoad.value === null) return;
                        if (props.showList.length <= oldLen) {
                            pendingNavAfterLoad.value = null;
                            stopAutoScroll(); // 没有更多数据，停止滚动
                            return;
                        }
                        // 有新数据加载，继续滚动
                        autoScrollTimer.value = setTimeout(scroll, autoScrollSpeed.value);
                    });
                });
                return;
            }
        }
        
        // 加速滚动
        hasRepeated = true;
        autoScrollSpeed.value = Math.max(30, autoScrollSpeed.value * autoScrollAcceleration.value);
        
        autoScrollTimer.value = setTimeout(scroll, autoScrollSpeed.value);
    };
    
    scroll();
};

const stopAutoScroll = () => {
    if (autoScrollTimer.value) {
        clearTimeout(autoScrollTimer.value);
        autoScrollTimer.value = null;
    }
    autoScrollDirection.value = null;
    autoScrollSpeed.value = 100;
};

// 统一的键盘事件处理
const unifiedKeyHandler = (e) => {
    if (e.__hotkeyHandled) return;
    
    const { key, shiftKey, repeat } = e;
    const isArrowUp = key === "ArrowUp";
    const isArrowDown = key === "ArrowDown";
    const isShift = key === "Shift";
    
    // Shift键处理
    if (isShift) {
        if (!repeat && !shiftKeyTimer) {
            // Shift键按下，启动预览计时
            if (props.isMultiple) isShiftDown.value = true;
            handleShiftKeyDown();
        }
        return; // 不阻止默认行为，让hotkeyRegistry处理
    }
    
    // 上下键自动滚动（只在没有按Shift时）
    if ((isArrowUp || isArrowDown) && !shiftKey) {
        if (!repeat && !autoScrollTimer.value) {
            const direction = isArrowUp ? 'up' : 'down';
            startAutoScroll(direction);
        }
        return; // 不阻止默认行为，让hotkeyRegistry处理导航
    }
};

const unifiedKeyReleaseHandler = (e) => {
    if (e.__hotkeyHandled) return;
    
    const { key, shiftKey } = e;
    const isArrowUp = key === "ArrowUp";
    const isArrowDown = key === "ArrowDown";
    const isShift = key === "Shift";
    
    // Shift键释放
    if (isShift) {
        handleShiftKeyUp();
        return;
    }
    
    // 上下键释放（只在没有按Shift时）
    if ((isArrowUp || isArrowDown) && !shiftKey) {
        stopAutoScroll();
        stopKeyHold(); // 停止长按检测
        return;
    }
};

// 窗口失焦时隐藏所有预览
const handleWindowBlur = () => {
    resetTransientPreviewState();
    stopAutoScroll(); // 停止自动滚动
    stopKeyHold(); // 停止长按检测
    // 清理Shift键状态
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

onMounted(() => {
    applyHoverPreviewConfig(setting);
    registerListHotkeyFeatures();
    // 添加统一的键盘事件监听器（在capture阶段）
    document.addEventListener("keydown", unifiedKeyHandler, true);
    document.addEventListener("keyup", unifiedKeyReleaseHandler, true);
    window.addEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
    window.addEventListener("blur", handleWindowBlur);

    // ResizeObserver 监听列表容器高度变化，使 getPageStep 动态计算有效
    if (listRootRef.value) {
        const resizeObserver = new ResizeObserver(() => {
            // getPageStep 每次实时取 clientHeight，此处无需额外缓存
        });
        resizeObserver.observe(listRootRef.value);
        // 保存 observer 以便清理
        listRootRef.value._resizeObserver = resizeObserver;
    }
});

onUnmounted(() => {
    // 清理统一的键盘事件监听器
    document.removeEventListener("keydown", unifiedKeyHandler, true);
    document.removeEventListener("keyup", unifiedKeyReleaseHandler, true);
    window.removeEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
    window.removeEventListener("blur", handleWindowBlur);
    
    // 清理自动滚动定时器
    stopAutoScroll();
    
    if (lockPersistTimer) {
        clearTimeout(lockPersistTimer);
        lockPersistTimer = null;
    }

    // 清理图片预览定时器
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }

    // 清理 ResizeObserver
    if (listRootRef.value?._resizeObserver) {
        listRootRef.value._resizeObserver.disconnect();
        listRootRef.value._resizeObserver = null;
    }
    resetTransientPreviewState();
});
</script>

<style lang="less" scoped>
@import "../style";

.clip-item-list {
    height: 100%;
    overflow: hidden;
}

.scroller {
    height: 100%;
}

.text-preview-modal {
    overflow: hidden;

    .text-preview-content {
        white-space: pre-wrap;
        word-break: break-word;
        max-height: inherit;
        width: 100%;

        &.is-single-line {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }
    }
}

.image-preview-modal {
    .image-preview-content {
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow-y: auto; // 启用垂直滚动
        overflow-x: auto; // 启用水平滚动以防过宽图片
        scrollbar-width: thin; // 细滚动条
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        
        &::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            
            &:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        }
    }

    .image-preview-inner {
        width: 100%;
        display: flex;
        justify-content: center;

        &.is-centered {
            align-items: center;
        }

        &.is-scroll {
            align-items: flex-start;
        }
    }

    .image-preview-footer {
        margin-top: 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.7);
        white-space: pre-wrap;
        word-break: break-all;
        text-align: center;
    }
    .image-preview-footer-main {
        max-width: min(90vw, 880px);
    }
    .image-preview-hint {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 5px 12px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.92);
        font-size: 12px;
        line-height: 1.4;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
    }
    .preview-error {
        padding: 16px;
        color: #ef4444;
        font-size: 14px;
    }
}
</style>
