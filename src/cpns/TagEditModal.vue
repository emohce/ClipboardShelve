<template>
    <div
        class="tag-edit-modal-overlay"
        v-show="visible"
        @click="handleOverlayClick"
    >
        <div class="tag-edit-modal" @click.stop>
            <div class="tag-edit-modal-header">
                <h3>编辑收藏</h3>
                <button class="tag-edit-modal-close" @click="close">✕</button>
            </div>

            <div class="tag-edit-modal-body">
                <!-- 标签输入区域 -->
                <div class="form-group">
                    <label>标签</label>
                    <div class="tag-input-container">
                        <TagInput
                            v-model="tags"
                            :suggestions="tagSuggestions"
                            @input="handleTagInput"
                            @select="handleTagSelect"
                            placeholder="输入标签，按回车添加"
                        />
                    </div>
                    <div class="tag-help-text">
                        按回车添加标签，点击标签删除
                    </div>
                </div>

                <!-- 备注输入区域 -->
                <div class="form-group">
                    <label>备注</label>
                    <textarea
                        v-model="remark"
                        class="remark-textarea"
                        placeholder="添加备注信息..."
                        rows="3"
                    ></textarea>
                </div>

                <!-- 原始内容：text 可编辑，image/file 仅预览 -->
                <div class="form-group" v-if="item">
                    <label>{{ item.type === 'text' ? '原始内容' : '内容预览' }}</label>
                    <textarea
                        v-if="item.type === 'text'"
                        v-model="originalData"
                        class="remark-textarea original-data-textarea"
                        placeholder="编辑原始文本..."
                        rows="6"
                    ></textarea>
                    <div v-else class="content-preview">
                        <div
                            v-if="item.type === 'image'"
                            class="image-preview"
                        >
                            <img
                                v-if="getImageSrc(item)"
                                :src="getImageSrc(item)"
                                alt="预览图片"
                            />
                            <span v-else>图片预览不可用</span>
                        </div>
                        <div
                            v-else-if="item.type === 'file'"
                            class="file-preview"
                        >
                            <div
                                v-for="file in getFileList(item)"
                                :key="file.path"
                                class="file-item"
                            >
                                📄 {{ file.name }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="tag-edit-modal-footer">
                <button @click="close" class="btn-cancel">取消</button>
                <button @click="handleUncollect" class="btn-uncollect">
                    取消收藏
                </button>
                <button @click="save" class="btn-save" :disabled="saving">
                    {{ saving ? "保存中..." : "保存 (Ctrl+S)" }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { activateLayer, deactivateLayer } from "../global/hotkeyLayers";
import { registerFeature } from "../global/hotkeyRegistry";
import { ElMessage } from "element-plus";
import TagInput from "./TagInput.vue";

const props = defineProps({
    visible: Boolean,
    item: Object,
});

const emit = defineEmits(["close", "save", "uncollect"]);

// 表单数据
const tags = ref([]);
const remark = ref("");
const originalData = ref("");
const saving = ref(false);
const tagSuggestions = ref([]);

// 监听item变化，初始化表单数据
watch(
    () => props.item,
    (newItem) => {
        if (newItem) {
            tags.value = Array.isArray(newItem.tags) ? [...newItem.tags] : [];
            remark.value = newItem.remark || "";
            originalData.value = newItem.type === "text" ? (newItem.data || "") : "";
        }
    },
    { immediate: true },
);

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            activateLayer("tag-edit");
        } else {
            deactivateLayer("tag-edit");
        }
    },
    { immediate: true },
);

// 阻断键盘事件穿透，并处理快捷键
const stopAndHandleKey = (e) => {
    if (!props.visible) return;
    // 冒泡阶段阻断向上层传播，保留输入框自身默认行为
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    e.stopPropagation();

    if (e.type === "keydown") {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            save();
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            close();
            return;
        }
        // 回车：阻断并阻止默认，避免触发底层复制等热键；TagInput 内部会在自身 keydown 中处理添加
        if (e.key === "Enter") {
            e.preventDefault();
            return;
        }
    }
};

function getFocusableInputs() {
    const modal = document.querySelector(".tag-edit-modal");
    if (!modal) return [];
    const list = modal.querySelectorAll(".tag-input, textarea");
    return Array.from(list).filter(
        (el) => el.offsetParent != null && !el.disabled
    );
}

onMounted(() => {
    document.addEventListener("keydown", stopAndHandleKey, false);
    document.addEventListener("keypress", stopAndHandleKey, false);
    document.addEventListener("keyup", stopAndHandleKey, false);
    registerFeature("tag-edit-focus-tab", (e) => {
        if (!props.visible) return false;
        const focusables = getFocusableInputs();
        if (focusables.length === 0) return false;
        const current = document.activeElement;
        const idx = focusables.indexOf(current);
        const nextIdx =
            e.shiftKey
                ? idx <= 0
                    ? focusables.length - 1
                    : idx - 1
                : idx >= focusables.length - 1
                  ? 0
                  : idx + 1;
        focusables[nextIdx].focus();
        e.preventDefault();
        return true;
    });
    registerFeature("tag-edit-save", (e) => {
        if (!props.visible) return false;
        e.preventDefault();
        save();
        return true;
    });
    registerFeature("tag-edit-block", () => ({
        handled: true,
        preventDefault: false,
        stopPropagation: false,
    }));
});

onUnmounted(() => {
    document.removeEventListener("keydown", stopAndHandleKey, false);
    document.removeEventListener("keypress", stopAndHandleKey, false);
    document.removeEventListener("keyup", stopAndHandleKey, false);
    deactivateLayer("tag-edit");
});

// 获取图片预览地址
const getImageSrc = (item) => {
    if (!item || !item.data) return "";
    // 如果是base64图片数据
    if (item.data.startsWith("data:image/")) {
        return item.data;
    }
    // 其他情况返回空字符串
    return "";
};

// 获取文件列表
const getFileList = (item) => {
    if (!item || !item.data) return [];
    try {
        return JSON.parse(item.data);
    } catch {
        return [];
    }
};

// 处理标签输入
const handleTagInput = (query) => {
    if (!query || !window.db) {
        tagSuggestions.value = [];
        return;
    }

    try {
        tagSuggestions.value = window.db.getTagSuggestions(query);
    } catch (error) {
        console.error("[TagEditModal] 获取标签建议失败:", error);
        tagSuggestions.value = [];
    }
};

// 处理标签选择
const handleTagSelect = (tag) => {
    if (!tags.value.includes(tag)) {
        tags.value.push(tag);
    }
};

// 保存
const save = async () => {
    if (!props.item || !window.db) return;

    saving.value = true;

    try {
        await window.db.updateItemTags(props.item.id, tags.value);
        await window.db.updateItemRemark(props.item.id, remark.value);
        if (props.item.type === "text" && typeof originalData.value === "string") {
            window.db.updateItemData(props.item.id, originalData.value);
        }
        if (window.listener) {
            window.listener.emit("view-change");
        }
        ElMessage({
            message: "保存成功",
            type: "success",
        });
        emit("save");
        close();
    } catch (error) {
        console.error("[TagEditModal] 保存失败:", error);
        ElMessage({
            message: "保存失败，请稍后重试",
            type: "error",
        });
    } finally {
        saving.value = false;
    }
};

// 取消收藏
const handleUncollect = () => {
    if (!props.item || !window.db) return;

    try {
        window.db.removeCollect(props.item.id);

        // 通知视图更新
        if (window.listener) {
            window.listener.emit("view-change");
        }

        ElMessage({
            message: "已取消收藏",
            type: "info",
        });

        emit("uncollect");
        close();
    } catch (error) {
        console.error("[TagEditModal] 取消收藏失败:", error);
        ElMessage({
            message: "取消收藏失败，请稍后重试",
            type: "error",
        });
    }
};

// 关闭模态框
const close = () => {
    emit("close");
};

// 点击遮罩关闭
const handleOverlayClick = () => {
    close();
};
</script>

<style lang="less" scoped>
.tag-edit-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(22, 27, 45, 0.45);
    backdrop-filter: blur(2px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tag-edit-modal {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 30px 80px rgba(25, 34, 68, 0.18);
    width: 480px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.tag-edit-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid #e5e7eb;

    h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
    }
}

.tag-edit-modal-close {
    background: none;
    border: none;
    font-size: 18px;
    color: #6b7280;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;

    &:hover {
        background: #f3f4f6;
        color: #374151;
    }
}

.tag-edit-modal-body {
    padding: 20px 24px;
    flex: 1;
    overflow-y: auto;
}

.form-group {
    margin-bottom: 20px;

    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #374151;
        font-size: 14px;
    }
}

.tag-input-container {
    position: relative;
}

.tag-help-text {
    font-size: 12px;
    color: #6b7280;
    margin-top: 4px;
}

.remark-textarea {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    resize: vertical;
    font-family: inherit;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }
}

.content-preview {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    min-height: 60px;
    font-size: 13px;
    color: #4b5563;
}

.text-preview {
    white-space: pre-wrap;
    word-break: break-word;
}

.image-preview {
    text-align: center;

    img {
        max-width: 100%;
        max-height: 120px;
        border-radius: 4px;
    }
}

.file-preview {
    .file-item {
        padding: 4px 0;
        border-bottom: 1px solid #e5e7eb;

        &:last-child {
            border-bottom: none;
        }
    }
}

.tag-edit-modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 24px 20px;
    border-top: 1px solid #e5e7eb;

    button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        border: none;
        transition: all 0.2s;

        &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    }
}

.btn-cancel {
    background: #f3f4f6;
    color: #374151;

    &:hover:not(:disabled) {
        background: #e5e7eb;
    }
}

.btn-uncollect {
    background: #fef2f2;
    color: #dc2626;

    &:hover:not(:disabled) {
        background: #fee2e2;
    }
}

.btn-save {
    background: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
        background: #2563eb;
    }
}
</style>
