<template>
    <div
        class="clip-item-list"
        ref="listRootRef"
        @mousemove.passive="handleListMouseMove"
        :class="{ 'few-items': showList.length <= 3 }"
        role="listbox"
    >
        <div
            ref="scrollParentRef"
            class="scroller clip-item-scroll"
            @scroll.passive="handleVirtualScroll"
        >
            <div class="clip-item-list-body">
                <div
                    v-for="(item, index) in showList"
                    :key="item?.id ?? index"
                    class="clip-item-list-row"
                    :class="{
                        'clip-item-list-row--compact': showList.length <= 3,
                    }"
                    :data-index="index"
                >
                    <ClipItemRow
                        v-if="item"
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
                </div>
            </div>
        </div>
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
        @mouseenter="keepTextPreview"
        @mouseleave="hideTextPreview"
    >
        <div
            class="text-preview-panel"
            :class="{ 'is-single-line': textPreview.isSingleLine }"
            :style="textPreview.panelStyle"
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
import { useListNavigation } from "../hooks/useListNavigation";
import { useVirtualListScroll } from "../hooks/useVirtualListScroll";
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
    both: "Shift + \u2190\u2191\u2192\u2193 移动预览",
    vertical: "Shift + \u2191\u2193 移动预览",
    horizontal: "Shift + \u2190\u2192 移动预览",
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
    
    // 获取右侧预览区域的可用尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mainListWidth = Math.min(520, viewportWidth * 0.15);
    const gap = 0;
    const availableWidth = Math.max(viewportWidth - mainListWidth - gap, 0);
    const availableHeight = Math.max(viewportHeight, 0);
    
    // 计算等比例缩放
    const scaleByWidth = availableWidth / naturalWidth;
    const scaleByHeight = availableHeight / naturalHeight;
    const fitScale = Math.min(scaleByWidth, scaleByHeight);
    
    // 计算各种缩放方案下的显示尺寸
    const fitDisplayWidth = naturalWidth * fitScale;
    const fitDisplayHeight = naturalHeight * fitScale;
    
    // 按宽度填满时的尺寸
    const widthFillScale = scaleByWidth;
    const widthFillHeight = naturalHeight * widthFillScale;
    
    // 判断是否超出可用区域以及超出比例
    const widthOverflowRatio = naturalWidth > availableWidth 
        ? (naturalWidth - availableWidth) / naturalWidth 
        : 0;
    const heightOverflowRatio = naturalHeight > availableHeight 
        ? (naturalHeight - availableHeight) / naturalHeight 
        : 0;
    
    // 策略：如果图片任何一维超出不超过10%，则缩小展示全部；否则按宽度填满可能需要滚动
    const maxOverflowRatio = Math.max(widthOverflowRatio, heightOverflowRatio);
    const shouldShowFull = maxOverflowRatio <= 0.10; // 10% 阈值
    
    let displayWidth, displayHeight, canScrollX, canScrollY, layoutMode;
    
    if (shouldShowFull || fitScale >= 1) {
        // 缩小展示全部或原图小于可用区域
        displayWidth = fitDisplayWidth;
        displayHeight = fitDisplayHeight;
        canScrollX = false;
        canScrollY = false;
        layoutMode = "centered";
    } else {
        // 按宽度填满，可能需要垂直滚动
        displayWidth = availableWidth;
        displayHeight = widthFillHeight;
        canScrollX = displayWidth > availableWidth;
        canScrollY = displayHeight > availableHeight;
        layoutMode = canScrollY ? "fit-width-scroll" : "centered";
    }
    
    imagePreview.value.layoutMode = layoutMode;
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

    // 计算预览窗口尺寸：右侧区域，预留主列表滚动条空间
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mainListWidth = Math.min(520, viewportWidth * 0.15); // 主列表区域宽度
    const gap = 0; // 与主列表的间距
    const previewWidth = viewportWidth - mainListWidth - gap;
    const previewHeight = viewportHeight;
    
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
    
    // 右侧预览窗口样式
    imagePreview.value.style = {
        position: "fixed",
        top: "0",
        right: "0",
        left: `${mainListWidth + gap}px`,
        bottom: "0",
        zIndex: 9999,
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        borderRadius: "0",
        padding: "0px",
        boxShadow: "-4px 0 24px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        outline: "none",
    };
    
    imagePreview.value.imageStyle = {
        width: "auto",
        height: "auto",
        display: "block",
        imageRendering: "auto",
    };
    imagePreview.value.show = true;
    
    // 悬浮预览优先使用原图以提升清晰度
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

// 图片数据验证
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

    // 自动聚焦以接收键盘事件
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
        '  <title>图片预览 - 超级剪贴板</title>',
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
        '      <button class="control-btn" onclick="window.close()">鍏抽棴 (ESC)</button>',
        "    </div>",
        '    <img src="' + src + '" alt="preview" />',
        footerHtml,
        '    <div class="shortcuts">ESC: 鍏抽棴绐楀彛</div>',
        "  </div>",
        "  <script>",
        "    // ESC键关闭窗口",
        '    document.addEventListener("keydown", function(e) {',
        '      if (e.key === "Escape") {',
        "        window.close();",
        "      }",
        "    });",
        "    ",
        "    // 绐楀彛澶辩劍鏃朵篃鍙互閫氳繃ESC鍏抽棴",
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

    // 鑱氱劍鍒伴瑙堢獥鍙?
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
        externalPreviewWindow = null;
        focusUtoolsMainWindow();
    } else {
        externalPreviewWindow = null;
    }
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

    // 延迟隐藏，允许鼠标移动到预览区域
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

// 图片点击处理（能展示就能复制，与悬浮一致）
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
    textPreview.value.panelStyle = {};
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
    const maxW = window.innerWidth;
    const text = item.data || "";
    const isSingleLine = !text.includes("\n");
    textPreview.value.text = text;
    textPreview.value.isSingleLine = isSingleLine;
    textPreview.value.show = true;
    textPreview.value.panelStyle = {
        width: `${maxW * 0.9}px`,
        maxWidth: `${maxW * 0.9}px`,
    };
    textPreview.value.contentStyle = isSingleLine
        ? {
              width: "100%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              fontSize: "15px",
              letterSpacing: "0.01em",
              color: "var(--text-color)",
          }
        : {
              width: "100%",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--text-color)",
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
    textPreview.value.panelStyle = {};
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
const {
    activeIndex,
    pendingNavAfterLoad,
    deleteAnchor,
    clampActiveIndex,
    setActiveIndex,
    setPendingNavAfterLoad,
    setDeleteAnchor,
    clearPendingStates,
} = useListNavigation(() => props.showList);
const allSelectedLocked = ref(false); // 临时标志：记录所有选中项是否都已锁定

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
const scrollParentRef = ref(null);
const imagePreviewContentRef = ref(null); // 图片预览内容容器引用
const textPreviewContentRef = ref(null);
const lastPointerPosition = ref({ x: null, y: null });

// 列表在 TanStack 虚拟滚动容器内滚动；触底时由本组件 emit loadMore（不再依赖 document 级 scroll 冒泡）
let scrollEndLoadMoreTs = 0;
const SCROLL_END_LOAD_MORE_COOLDOWN_MS = 120;
const estimateItemSize = (index = activeIndex.value) => {
    const item = props.showList[index];
    if (!item) return 52;
    if (item.type === "image") return 76;
    return props.isMultiple && activeIndex.value === index ? 72 : 52;
};
const {
    scrollToIndex: scrollVirtualIndexIntoView,
    getPageStep: virtualPageStep,
    getPageTargetIndex,
    scrollByPage,
    scrollHalfPage,
} = useVirtualListScroll({
    listRootRef,
    scrollParentRef,
    virtualizer: null,
    getEstimateSize: () => estimateItemSize(),
    getCount: () => props.showList.length,
});
const handleVirtualScroll = () => {
    const container = scrollParentRef.value;
    if (!container) return;
    const now = Date.now();
    const isNearBottom =
        container.scrollTop + container.clientHeight + 12 >=
        container.scrollHeight;
    if (!isNearBottom) return;
    if (now - scrollEndLoadMoreTs < SCROLL_END_LOAD_MORE_COOLDOWN_MS) return;
    scrollEndLoadMoreTs = now;
    emit("loadMore");
};

// 长文本预览（Shift 按住）状态
const textPreview = ref({
    show: false,
    text: "",
    panelStyle: {},
    contentStyle: {},
    isSingleLine: false,
});

// 图片预览延迟隐藏定时器
let imagePreviewHideTimer = null;
// 长文本预览延迟隐藏定时器
let textPreviewHideTimer = null;

// Shift 键按下时间（区分短按与长按预览）
let shiftKeyDownTime = 0;
let shiftKeyTimer = null;
const keyboardTriggeredPreview = ref(false);
// 行级悬浮预览 debounce 定时器
let hoverPreviewTimer = null;
const hoverTriggeredPreview = ref(false);
// 方向键生效后暂停悬浮预览，直到鼠标再次移动才重新启用
const hoverPreviewSuspendedByKeyboard = ref(false);
// 点击（如打开文件 popover）后暂停悬浮预览，鼠标移动则解除
const hoverPreviewSuspendedByClick = ref(false);
// 自动滚动（长按方向键）定时器
const autoScrollTimer = ref(null);
const autoScrollSpeed = ref(100); // 初始滚动间隔(ms)
const autoScrollDirection = ref(null); // 'up' or 'down'
const autoScrollAcceleration = ref(1.2); // 加速因子
const AUTO_SCROLL_INITIAL_DELAY = 260;
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

// 图片预览滚动处理
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
// 图片预览键盘处理兜底；主入口仍走 hotkey feature
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
const preserveSelection = () => {
    selectedItemIds.value = selectItemList.value.map((item) => item.id);
};

// 鎭㈠閫夋嫨鐘舵€?
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

// Shift 持续按下预览：按 item 类型封装的预览入口
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
    let hoverNavigationAccepted = false;

    if (!props.isMultiple && !wasSuspended) {
        hoverNavigationAccepted = syncHoverActiveIndex(index);
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
        !wasSuspended &&
        hoverNavigationAccepted
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

const NAVIGATION_PRIORITIES = Object.freeze({
    "delete-recovery": 6,
    "load-recovery": 5,
    "hold-scroll": 4,
    "page-nav": 3,
    "step-nav": 2,
    "hover-sync": 1,
});
const currentNavigationAction = ref(null);
let navigationActionSeq = 0;

const clearNavigationAction = (actionId) => {
    if (currentNavigationAction.value?.id === actionId) {
        currentNavigationAction.value = null;
    }
};
const scheduleNavigationFrame = (cb) => {
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(cb);
        return;
    }
    setTimeout(cb, 16);
};

const buildNavigationAction = (type, payload = {}) => ({
    id: `${type}-${Date.now()}-${++navigationActionSeq}`,
    type,
    priority: NAVIGATION_PRIORITIES[type] ?? 0,
    timestamp: navigationActionSeq,
    ...payload,
});

const canRunNavigationAction = (action) => {
    const current = currentNavigationAction.value;
    if (!current) return true;
    if (action.priority !== current.priority) {
        return action.priority > current.priority;
    }
    return action.timestamp >= current.timestamp;
};

const normalizeNavigationScrollOptions = (options = {}) => {
    const scrollMode = options.scrollMode ||
        (options.block === "center"
            ? "center-preferred"
            : options.block === "start" || options.block === "end"
              ? "edge-align"
              : "nearest");
    const edge =
        options.edge ||
        (options.block === "start" || options.block === "end"
            ? options.block
            : undefined);
    let centerStartIndex = options.centerStartIndex;
    if (
        scrollMode === "center-preferred" &&
        !Number.isInteger(centerStartIndex)
    ) {
        if (options.actionType === "step-nav") {
            centerStartIndex = 5;
        } else {
            centerStartIndex = 0;
        }
    }
    return {
        source: options.source || "keyboard",
        forceScroll: options.forceScroll === true,
        scrollMode,
        edge,
        block: options.block,
        centerStartIndex,
    };
};

const scrollActiveNodeIntoView = (index = activeIndex.value, options = {}) => {
    scrollVirtualIndexIntoView(index, options);
};

const runNavigationScroll = (action, attempt = 0) => {
    if (currentNavigationAction.value?.id !== action.id) return;
    scrollActiveNodeIntoView(action.targetIndex, {
        scrollMode: action.scrollMode,
        edge: action.edge,
        block: action.block,
        forceScroll: action.forceScroll,
        centerStartIndex: action.centerStartIndex,
    });
    if (attempt >= 2 || action.type === "hold-scroll") {
        if (action.type !== "hold-scroll") {
            clearNavigationAction(action.id);
        }
        return;
    }
    scheduleNavigationFrame(() => runNavigationScroll(action, attempt + 1));
};

const submitNavigationAction = (type, nextIndex, options = {}) => {
    if (!Array.isArray(props.showList) || props.showList.length === 0) {
        return false;
    }
    const targetIndex = clampActiveIndex(nextIndex);
    const action = buildNavigationAction(type, {
        targetIndex,
        ...normalizeNavigationScrollOptions(options),
    });
    if (!canRunNavigationAction(action)) {
        return false;
    }
    if (type !== "hover-sync") {
        hoverPreviewSuspendedByKeyboard.value = true;
    }
    currentNavigationAction.value = action;
    setActiveIndex(targetIndex);
    nextTick(() => {
        if (currentNavigationAction.value?.id !== action.id) return;
        runNavigationScroll(action, 0);
    });
    return true;
};

const setKeyboardActiveIndex = (nextIndex, options = {}) =>
    submitNavigationAction(
        options.actionType || "step-nav",
        nextIndex,
        options,
    );

const syncHoverActiveIndex = (nextIndex) =>
    submitNavigationAction("hover-sync", nextIndex, {
        source: "hover",
        scrollMode: "nearest",
    });

defineExpose({
    selectItemList, // 暴露给 Main/Switch中的操作按钮以执行复制
    emptySelectItemList,
    activeIndex, // 暴露当前高亮的索引
    setKeyboardActiveIndex, // 暴露设置高亮索引的方法
    prepareDeleteRecovery: (anchor) => setDeleteAnchor(anchor),
    clearPendingStates, // 暴露清除待处理状态的方法
    // scrollToBottom, // 暴露滚动到底部的方法
    // scrollToTop, // 暴露滚动到顶部的方法
});

const getPageStep = () => {
    return virtualPageStep.value;
};

// 边界检测：是否在列表顶部
const isAtTopBoundary = () => {
    return activeIndex.value <= 0;
};

// 边界检测：是否在列表底部
const isAtBottomBoundary = () => {
    return activeIndex.value >= props.showList.length - 1;
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
        // 接近列表末尾时触发懒加载
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
            pendingNavAfterLoad.value = null;
            submitNavigationAction("load-recovery", target, {
                source: "load-more",
                scrollMode: "center-preferred",
                forceScroll: true,
            });
        }
    },
);

// 监听 showList 变化：恢复多选/删除后的高亮（deleteAnchor 为唯一删除恢复入口）
watch(
    () => props.showList,
    (newList, oldList) => {
        if (newList && oldList && newList !== oldList) {
            restoreSelection();
            if (deleteAnchor.value) {
                const anchor = deleteAnchor.value;
                deleteAnchor.value = null;
                if (newList.length > 0) {
                    let nextIdx = Math.min(
                        Math.max(0, anchor.anchorIndex),
                        newList.length - 1,
                    );
                    if (anchor.preferItemId) {
                        const idx = newList.findIndex(
                            (item) => item.id === anchor.preferItemId,
                        );
                        if (idx !== -1) nextIdx = idx;
                    }
                    submitNavigationAction("delete-recovery", nextIdx, {
                        source: "delete",
                        scrollMode: "center-preferred",
                        forceScroll: true,
                    });
                }
            }
        }
    },
);

// 列表长度变化时校正 activeIndex，避免越界
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
        if (e?.repeat) {
            startAutoScroll("up");
            return true;
        }

        // 边界检测：如果在顶部，停止移动并确保可见
        if (activeIndex.value <= 0) {
            setKeyboardActiveIndex(0, {
                actionType: "step-nav",
                scrollMode: "edge-align",
                edge: "start",
                forceScroll: true,
            });
            return true;
        }

        // 正常向上移动：接近列表顶部的若干项用 end 对齐，避免 center 把 0..n 留在视窗外
        const nextIdx = activeIndex.value - 1;
        if (nextIdx <= 0) {
            return setKeyboardActiveIndex(nextIdx, {
                actionType: "step-nav",
                scrollMode: "edge-align",
                edge: "start",
                forceScroll: true,
            });
        }
        const STEP_UP_TOP_BAND = 8;
        if (nextIdx <= STEP_UP_TOP_BAND) {
            return setKeyboardActiveIndex(nextIdx, {
                actionType: "step-nav",
                scrollMode: "edge-align",
                edge: "end",
                forceScroll: true,
            });
        }
        return setKeyboardActiveIndex(nextIdx, {
            actionType: "step-nav",
            scrollMode: "center-preferred",
        });
    });
    registerFeature("list-nav-down", (e) => {
        if (e?.repeat) {
            startAutoScroll("down");
            return true;
        }
        if (props.showList.length === 0) {
            return true;
        }

        // 边界检测：如果在底部，先尝试加载更多数据
        if (isAtBottomBoundary()) {
            // 尝试加载更多数据
            const oldLen = props.showList.length;
            setPendingNavAfterLoad(oldLen);
            emit("loadMore");

            nextTick(() => {
                nextTick(() => {
                    if (pendingNavAfterLoad.value === null) return;
                    if (props.showList.length <= oldLen) {
                        pendingNavAfterLoad.value = null;
                        // 没有更多数据，确保最后一个item完全可见
                        const lastIndex = props.showList.length - 1;
                        setKeyboardActiveIndex(lastIndex, {
                            actionType: "step-nav",
                            scrollMode: "edge-align",
                            edge: "end",
                            forceScroll: true,
                        });
                    } else {
                        // 有新数据，移动到新加载区首项
                        const targetIndex = oldLen;
                        pendingNavAfterLoad.value = null;
                        submitNavigationAction("load-recovery", targetIndex, {
                            source: "load-more",
                            scrollMode: "center-preferred",
                            forceScroll: true,
                        });
                    }
                });
            });
            return true;
        }

        // 正常移动一个item；目标为末项时用底对齐，避免 center 裁切
        const nextIdx = activeIndex.value + 1;
        const lastI = props.showList.length - 1;
        if (nextIdx >= lastI) {
            return setKeyboardActiveIndex(nextIdx, {
                actionType: "step-nav",
                scrollMode: "edge-align",
                edge: "end",
                forceScroll: true,
            });
        }
        return setKeyboardActiveIndex(nextIdx, {
            actionType: "step-nav",
            scrollMode: "center-preferred",
        });
    });
    registerFeature("list-page-up", () => {
        if (isFocusInSearch()) return false;
        if (props.showList.length === 0) return false;

        return runPageNavigation("up");
    });
    registerFeature("list-page-down", () => {
        if (isFocusInSearch()) return false;
        if (props.showList.length === 0) return false;

        return runPageNavigation("down");
    });
    registerFeature("list-nav-left", () => {
        return setKeyboardActiveIndex(activeIndex.value - 1);
    });
    registerFeature("list-scroll-to-bottom", () => {
        return setKeyboardActiveIndex(props.showList.length - 1, {
            actionType: "page-nav",
            scrollMode: "edge-align",
            edge: "end",
            forceScroll: true,
        });
    });
    registerFeature("list-scroll-to-top", () => {
        return setKeyboardActiveIndex(0, {
            actionType: "page-nav",
            scrollMode: "edge-align",
            edge: "start",
            forceScroll: true,
        });
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
        if (isFocusInSearch()) return false;
        if (e && (e.isComposing || e.key === "Process")) return false;
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
    registerFeature("list-ctrl-enter", (e) => {
        if (isFocusInSearch()) return false;
        if (e && (e.isComposing || e.key === "Process")) return false;
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
            ElMessage({ message: "澶嶅埗鎴愬姛", type: "success" });
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
                window.queuePersistDb?.();
            }
            allSelectedLocked.value = shouldLock;
        } else {
            targets.forEach((item) =>
                window.setLock(item.id, item.locked !== true),
            );
        }
        if (targets.length) {
            emit("onDataRemove");
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
            const idx = activeIndex.value;
            const len = props.showList.length;
            let preferItemId = null;
            if (props.isMultiple) {
                const toKeep = selectItemList.value.filter(
                    (item) => !deletableItems.includes(item),
                );
                selectedItemIds.value = toKeep.map((item) => item.id);
                replaceSelectedItems(toKeep);
                const keepIdSet = new Set(toKeep.map((item) => item.id));
                const highlighted = props.showList[idx];
                if (highlighted && keepIdSet.has(highlighted.id)) {
                    preferItemId = highlighted.id;
                } else if (toKeep.length) {
                    let picked = null;
                    for (let i = idx; i < props.showList.length; i++) {
                        const it = props.showList[i];
                        if (keepIdSet.has(it.id)) {
                            picked = it.id;
                            break;
                        }
                    }
                    if (picked == null) {
                        for (let i = idx - 1; i >= 0; i--) {
                            const it = props.showList[i];
                            if (keepIdSet.has(it.id)) {
                                picked = it.id;
                                break;
                            }
                        }
                    }
                    preferItemId = picked;
                } else {
                    preferItemId = null;
                }
            } else if (len > 0) {
                if (idx < len - 1)
                    preferItemId = props.showList[idx + 1]?.id ?? null;
                else if (idx > 0)
                    preferItemId = props.showList[idx - 1]?.id ?? null;
            }
            setDeleteAnchor({ anchorIndex: idx, preferItemId });
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
            const idx = activeIndex.value;
            const len = props.showList.length;
            let preferItemId = null;
            if (props.isMultiple) {
                const toKeep = selectItemList.value.filter(
                    (item) => !itemsToDelete.includes(item),
                );
                const keepIdSet = new Set(toKeep.map((item) => item.id));
                const highlighted = props.showList[idx];
                if (highlighted && keepIdSet.has(highlighted.id)) {
                    preferItemId = highlighted.id;
                } else if (toKeep.length) {
                    let picked = null;
                    for (let i = idx; i < props.showList.length; i++) {
                        const it = props.showList[i];
                        if (keepIdSet.has(it.id)) {
                            picked = it.id;
                            break;
                        }
                    }
                    if (picked == null) {
                        for (let i = idx - 1; i >= 0; i--) {
                            const it = props.showList[i];
                            if (keepIdSet.has(it.id)) {
                                picked = it.id;
                                break;
                            }
                        }
                    }
                    preferItemId = picked;
                } else {
                    preferItemId = null;
                }
                setDeleteAnchor({ anchorIndex: idx, preferItemId });
                replaceSelectedItems(toKeep);
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
                if (len > 0) {
                    if (idx < len - 1)
                        preferItemId = props.showList[idx + 1]?.id ?? null;
                    else if (idx > 0)
                        preferItemId = props.showList[idx - 1]?.id ?? null;
                }
                setDeleteAnchor({ anchorIndex: idx, preferItemId });
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
            setKeyboardActiveIndex(activeIndex.value + 1, {
                actionType: "step-nav",
                scrollMode: "center-preferred",
            });
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

// 长按方向键：先逐条移动，重复后按页加速滚动
const startAutoScroll = (direction) => {
    if (autoScrollDirection.value && autoScrollDirection.value !== direction) {
        stopAutoScroll();
    }
    if (autoScrollTimer.value || autoScrollDirection.value === direction) return;

    autoScrollDirection.value = direction;
    autoScrollSpeed.value = 100; // 重置速度

    const scroll = () => {
        if (direction === "up") {
            if (activeIndex.value > 0) {
                runPageNavigation("up", { center: true, forceScroll: true });
            } else {
                stopAutoScroll();
                return;
            }
        } else if (direction === "down") {
            if (activeIndex.value < props.showList.length - 1) {
                runPageNavigation("down", { center: true, forceScroll: true });
            } else {
                const oldLen = props.showList.length;
                hoverPreviewSuspendedByKeyboard.value = true;
                setPendingNavAfterLoad(oldLen);
                emit("loadMore");

                nextTick(() => {
                    nextTick(() => {
                        if (pendingNavAfterLoad.value === null) return;
                        if (props.showList.length <= oldLen) {
                            pendingNavAfterLoad.value = null;
                            const targetIndex = scrollHalfPage(
                                direction,
                                activeIndex.value,
                            );
                            submitNavigationAction("hold-scroll", targetIndex, {
                                source: "hold-scroll",
                                scrollMode: "center-preferred",
                                forceScroll: true,
                            });
                            stopAutoScroll(); // 没有更多数据，半页兜底后停止
                            return;
                        }
                        // 确保不会滚动超过当前太多
                        autoScrollTimer.value = setTimeout(scroll, autoScrollSpeed.value);
                    });
                });
                return;
            }
        }

        autoScrollSpeed.value = Math.max(
            30,
            Math.floor(autoScrollSpeed.value / autoScrollAcceleration.value),
        );
        autoScrollTimer.value = setTimeout(scroll, autoScrollSpeed.value);
    };

    autoScrollTimer.value = setTimeout(scroll, AUTO_SCROLL_INITIAL_DELAY);
};

const stopAutoScroll = () => {
    if (autoScrollTimer.value) {
        clearTimeout(autoScrollTimer.value);
        autoScrollTimer.value = null;
    }
    if (currentNavigationAction.value?.type === "hold-scroll") {
        currentNavigationAction.value = null;
    }
    autoScrollDirection.value = null;
    autoScrollSpeed.value = 100;
};

const runPageNavigation = (direction, options = {}) => {
    if (options.center) {
        const targetIndex = getPageTargetIndex(direction, activeIndex.value);
        return submitNavigationAction("hold-scroll", targetIndex, {
            source: "hold-scroll",
            scrollMode: "center-preferred",
            forceScroll: options.forceScroll === true,
        });
    }
    const targetIndex = scrollByPage(direction, activeIndex.value);
    return submitNavigationAction("page-nav", targetIndex, {
        source: "page-nav",
        scrollMode: "edge-align",
        edge: direction === "up" ? "start" : "end",
        forceScroll: true,
    });
};

// 长文本预览相关
const unifiedKeyHandler = (e) => {
    if (e.__hotkeyHandled) return;
    
    const { key, repeat } = e;
    const isShift = key === "Shift";

    // 聚焦到预览窗口
    if (isShift) {
        if (!repeat && !shiftKeyTimer) {
            // Shift键按下，启动预览计时
            if (props.isMultiple) isShiftDown.value = true;
            handleShiftKeyDown();
        }
        return; // 不阻止默认行为，让hotkeyRegistry处理
    }
};

const unifiedKeyReleaseHandler = (e) => {
    if (e.__hotkeyHandled) return;
    
    const { key } = e;
    const isShift = key === "Shift";
    const isArrowUp = key === "ArrowUp";
    const isArrowDown = key === "ArrowDown";
    
    // 使用统一的图片预览逻辑
    if (isShift) {
        handleShiftKeyUp();
        return;
    }

    if (isArrowUp || isArrowDown) {
        stopAutoScroll();
    }
};

// 绐楀彛澶辩劍鏃堕殣钘忔墍鏈夐瑙?
const handleWindowBlur = () => {
    resetTransientPreviewState();
    stopAutoScroll();
    // 文字预览半透明黑色背景，居中显示
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
    // 移除延时隐藏，文字预览只在Shift键释放时隐藏
    document.addEventListener("keydown", unifiedKeyHandler, true);
    document.addEventListener("keyup", unifiedKeyReleaseHandler, true);
    window.addEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
    window.addEventListener("blur", handleWindowBlur);

    // 方向键或点击后挂起悬浮高亮与悬浮预览，必须等真实鼠标移动后再恢复
    if (listRootRef.value) {
        const resizeObserver = new ResizeObserver(() => {
            // getPageStep 每次实时取 clientHeight，此处无需额外缓存
        });
        resizeObserver.observe(listRootRef.value);
        // 降级方案：使用 DOM scrollIntoView
        listRootRef.value._resizeObserver = resizeObserver;
    }
});

onUnmounted(() => {
    // 从不同行移入时停止上一行的 hover 预览，避免同一行内移动造成闪烁
    document.removeEventListener("keydown", unifiedKeyHandler, true);
    document.removeEventListener("keyup", unifiedKeyReleaseHandler, true);
    window.removeEventListener(SETTING_UPDATED_EVENT, handleSettingUpdated);
    window.removeEventListener("blur", handleWindowBlur);
    
    // 行级悬浮预览；方向键生效后的第一次移入也不启动
    stopAutoScroll();
    
    // 清理图片预览定时器
    if (imagePreviewHideTimer) {
        clearTimeout(imagePreviewHideTimer);
        imagePreviewHideTimer = null;
    }

    // 虚拟列表 scrollToIndex 的 align：start / center / end
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

.clip-item-scroll {
    overflow-y: auto;
    overflow-x: hidden;
}

.clip-item-list-body {
    width: 100%;
}

.clip-item-list-row {
    width: 100%;
    padding: 4px 8px 0;
    box-sizing: border-box;
}

.text-preview-modal {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    background: transparent;
    overflow: hidden;

    /* 灰色遮罩约 95% 不透明度，仅包住文本区域；超长时由 max-height + 内部滚动承担 */
    .text-preview-panel {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        box-sizing: border-box;
        padding: 24px 28px;
        min-height: 0;
        max-height: 80vh;
        width: auto;
        border-radius: 12px;
        border: 1px solid rgba(100, 110, 128, 0.55);
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.2);
        font-size: 14px;
        line-height: 1.5;
        background: rgba(118, 124, 138, 0.95);

        &.is-single-line {
            border-radius: 14px;
        }
    }

    .text-preview-content {
        white-space: pre-wrap;
        word-break: break-word;
        width: 100%;
        min-height: 0;
        -webkit-font-smoothing: antialiased;

        &:not(.is-single-line) {
            flex: 0 1 auto;
            max-height: calc(80vh - 56px);
            overflow-y: auto;
        }

        &.is-single-line {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            flex: none;
        }
    }
}

@media (prefers-color-scheme: dark) {
    .text-preview-modal .text-preview-panel {
        background: rgba(48, 54, 68, 0.95);
        border-color: rgba(200, 210, 230, 0.28);
        box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
    }
}

.image-preview-modal {
    .image-preview-content {
        flex: 1;
        min-height: 0;
        width: 100%;
        overflow-y: auto;
        overflow-x: auto;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        // 使用 transform 将滚动条移到左侧和上侧
        transform: rotate(180deg);
        
        &::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        
        &::-webkit-scrollbar-track {
            background: transparent;
        }
        
        &::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            
            &:hover {
                background: rgba(255, 255, 255, 0.5);
            }
        }
    }

    .image-preview-inner {
        width: 100%;
        display: flex;
        justify-content: center;
        // 再旋转回来保持正常显示
        transform: rotate(180deg);

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
