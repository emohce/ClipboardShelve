<template>
    <div
        class="clip-item"
        :data-index="index"
        :class="{
            active: !isMultiple && isActive,
            'multi-active': isMultiple && isActive,
            select: isSelected,
        }"
        @click.left="emit('row-click-left', $event)"
        @click.right="emit('row-click-right', $event)"
        @mouseenter.prevent="emit('row-mouseenter', $event)"
        @mouseleave="emit('row-mouseleave')"
    >
        <div class="clip-info">
            <div class="clip-time">
                <span v-if="isCollected" class="clip-collect-icon">⭐</span>
                <span
                    v-if="item.locked"
                    class="clip-lock"
                    >🔒</span
                >
                <span class="relative-date">{{ dateFormat(item.updateTime) }}</span>
                <div v-if="itemTags.length" class="clip-tags">
                    <span
                        v-for="tag in itemTags"
                        :key="`${item.id}-${tag}`"
                        class="clip-tag"
                        >{{ tag }}</span
                    >
                </div>
            </div>
            <div class="clip-data">
                <template v-if="item.type === 'text'">
                    <div :class="{ 'clip-over-sized-content': isOverSizedContent(item) }">
                        {{ textPreviewContent }}
                    </div>
                </template>
                <template v-else-if="item.type === 'image'">
                    <div class="image-container" @click="handleImageClick">
                        <img
                            v-if="imageSrc"
                            class="clip-data-image"
                            :src="imageSrc"
                            alt="Clipboard Image"
                            loading="lazy"
                            @error="handleImageError"
                            @load="handleImageLoad"
                        />
                        <div v-else class="image-error-placeholder">
                            <span>🖼️ 无效图片</span>
                        </div>
                    </div>
                </template>
                <template v-else-if="item.type === 'file'">
                    <el-popover
                        v-if="enableRichFilePreview"
                        placement="left"
                        trigger="click"
                        width="320"
                    >
                        <template #reference>
                            <div :class="{ 'clip-over-sized-content': isOverSizedContent(item) }">
                                <div v-if="imageFiles.length" class="file-with-images">
                                    <div class="image-files-preview">
                                        <span
                                            v-for="imgFile in imageFiles.slice(0, 3)"
                                            :key="imgFile.path"
                                            class="image-file-indicator"
                                        >
                                            🖼️
                                        </span>
                                        <span v-if="imageFiles.length > 3" class="more-images">
                                            +{{ imageFiles.length - 3 }}
                                        </span>
                                    </div>
                                    <FileList :data="fileListPreview" />
                                </div>
                                <FileList v-else :data="fileListPreview" />
                            </div>
                        </template>
                        <div style="max-height: 260px; overflow: auto">
                            <div v-if="imageFiles.length" class="image-files-section">
                                <div class="section-title">📷 图片文件 ({{ imageFiles.length }})</div>
                                <div class="image-files-grid">
                                    <div
                                        v-for="imgFile in imageFiles"
                                        :key="imgFile.path"
                                        class="image-file-item"
                                        @mouseenter="showImageFilePreview(imgFile.path)"
                                        @mouseleave="showImageFilePreview(imageFiles[0]?.path)"
                                    >
                                        <img
                                            class="image-file-preview"
                                            :src="toFileUrl(imgFile.path)"
                                            :alt="imgFile.name || 'image-file'"
                                            @error="handleImageError"
                                            @load="handleImageLoad"
                                        />
                                        <div class="file-name">
                                            {{ imgFile.path?.split('/').pop() || imgFile.name }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="all-files-section">
                                <div class="section-title">📁 所有文件</div>
                                <FileList :data="fileList" />
                            </div>
                            <div
                                v-if="Array.isArray(item.originPaths) && item.originPaths.length"
                                style="margin-top: 8px; opacity: 0.75"
                            >
                                <div>原始路径</div>
                                <div
                                    v-for="p in item.originPaths"
                                    :key="p"
                                    style="font-size: 12px; word-break: break-all"
                                >
                                    {{ p }}
                                </div>
                            </div>
                        </div>
                    </el-popover>
                    <div v-else :class="{ 'clip-over-sized-content': isOverSizedContent(item) }">
                        <FileList :data="fileListPreview" />
                    </div>
                </template>
            </div>
        </div>
        <ClipOperate
            v-show="showOperate"
            :item="item"
            :currentActiveTab="currentActiveTab"
            @onDataChange="emit('row-data-change')"
            @onDataRemove="emit('row-data-remove')"
            @openTagEdit="emit('row-open-tag-edit', $event)"
        />
        <div class="clip-count" v-show="isMultiple || !isActive">
            {{ index + 1 }}
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import FileList from "./FileList.vue";
import ClipOperate from "./ClipOperate.vue";
import { dateFormat } from "../utils";

const props = defineProps({
    item: { type: Object, required: true },
    index: { type: Number, required: true },
    isMultiple: { type: Boolean, required: true },
    isActive: { type: Boolean, required: true },
    isSelected: { type: Boolean, required: true },
    isCollected: { type: Boolean, required: true },
    showOperate: { type: Boolean, required: true },
    currentActiveTab: { type: String, required: true },
    isOverSizedContent: { type: Function, required: true },
    getItemImageSrc: { type: Function, required: true },
    hasImageFiles: { type: Function, required: true },
    getImageFiles: { type: Function, required: true },
    toFileUrl: { type: Function, required: true },
    showImageFilePreview: { type: Function, required: true },
});

const emit = defineEmits([
    "row-click-left",
    "row-click-right",
    "row-mouseenter",
    "row-mouseleave",
    "row-data-change",
    "row-data-remove",
    "row-open-tag-edit",
    "row-image-click",
]);

const itemTags = computed(() =>
    Array.isArray(props.item.tags) ? props.item.tags : [],
);
const textPreviewContent = computed(() =>
    String(props.item.data || "")
        .split("\n")
        .slice(0, 6)
        .join("\n")
        .trim(),
);
const fileList = computed(() => {
    if (props.item.type !== "file") return [];
    try {
        return JSON.parse(props.item.data) || [];
    } catch (_) {
        return [];
    }
});
const fileListPreview = computed(() => fileList.value.slice(0, 6));
const imageFiles = computed(() =>
    enableRichFilePreview.value && props.hasImageFiles(props.item)
        ? props.getImageFiles(props.item)
        : [],
);
const imageSrc = computed(() => props.getItemImageSrc(props.item));
const enableRichFilePreview = computed(
    () => props.item.type === "file" && props.isActive,
);

const handleImageClick = (event) => {
    event.stopPropagation();
    emit("row-image-click", event);
};

const handleImageError = (event) => {
    event.target.style.display = "none";
};

const handleImageLoad = () => {};
</script>

<style lang="less" scoped>
@import "../style";
</style>
