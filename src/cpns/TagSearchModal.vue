<template>
    <div
        class="tag-search-modal-overlay"
        v-show="visible"
        @click="handleOverlayClick"
    >
        <div class="tag-search-modal" @click.stop>
            <div class="tag-search-modal-header">
                <h3>标签搜索</h3>
                <button class="tag-search-modal-close" @click="close">✕</button>
            </div>

            <div class="tag-search-modal-body">
                <!-- 搜索输入框 -->
                <div class="search-input-container">
                    <input
                        ref="searchInputRef"
                        v-model="searchQuery"
                        class="search-input"
                        placeholder="输入标签名称搜索..."
                        @input="handleSearchInput"
                        @keydown="handleKeydown"
                    />
                    <div class="search-icon">🔍</div>
                </div>

                <!-- 搜索结果 -->
                <div class="search-results">
                    <div
                        v-if="filteredTags.length === 0 && searchQuery.trim()"
                        class="no-results"
                    >
                        未找到匹配的标签
                    </div>

                    <div
                        v-else-if="
                            filteredTags.length === 0 && !searchQuery.trim()
                        "
                        class="empty-state"
                    >
                        <div class="empty-icon">🏷️</div>
                        <div class="empty-text">暂无标签</div>
                        <div class="empty-hint">先为收藏项目添加标签</div>
                    </div>

                    <div
                        v-for="(tag, index) in filteredTags"
                        :key="tag.name"
                        class="tag-result-item"
                        :class="{
                            active: selectedIndex === index,
                            selected: selectedTag === tag.name,
                        }"
                        @click="selectTag(tag.name)"
                        @mouseenter="selectedIndex = index"
                    >
                        <div class="tag-info">
                            <div class="tag-name">
                                <span class="tag-icon">🏷️</span>
                                {{ tag.name }}
                            </div>
                            <div class="tag-count">{{ tag.count }} 个项目</div>
                        </div>
                        <div class="tag-actions">
                            <button
                                v-if="selectedTag === tag.name"
                                class="action-button primary"
                                @click.stop="jumpToTag"
                            >
                                跳转
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 快捷键提示 -->
                <div class="shortcuts-hint">
                    <div class="hint-item"><kbd>↑</kbd><kbd>↓</kbd><span>选择</span></div>
                    <div class="hint-item"><kbd>Enter</kbd><span>跳转</span></div>
<!--                    <div class="hint-item"><kbd>Ctrl+Enter</kbd><span>快速跳转</span></div>-->
                    <div class="hint-item"><kbd>Esc</kbd><span>关闭</span></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import { activateLayer, deactivateLayer } from "../global/hotkeyLayers";
import { registerFeature } from "../global/hotkeyRegistry";

const props = defineProps({
    visible: Boolean,
});

const emit = defineEmits(["close", "selectTag"]);

// 搜索相关
const searchInputRef = ref(null);
const searchQuery = ref("");
const selectedIndex = ref(-1);
const selectedTag = ref("");

// 标签数据
const allTags = ref([]);
const tagUsage = ref({});

// 过滤后的标签
const filteredTags = computed(() => {
    if (!searchQuery.value.trim()) {
        return allTags.value.map((tag) => ({
            name: tag,
            count: tagUsage.value[tag] || 0,
        }));
    }

    const query = searchQuery.value.toLowerCase().trim();
    return allTags.value
        .filter((tag) => tag.toLowerCase().includes(query))
        .map((tag) => ({
            name: tag,
            count: tagUsage.value[tag] || 0,
        }))
        .sort((a, b) => {
            // 按匹配度排序，然后按使用频率排序
            const aStartsWith = a.name.toLowerCase().startsWith(query);
            const bStartsWith = b.name.toLowerCase().startsWith(query);

            if (aStartsWith && !bStartsWith) return -1;
            if (!aStartsWith && bStartsWith) return 1;

            return b.count - a.count;
        });
});

// 监听可见性变化
watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            loadTags();
            nextTick(() => {
                searchInputRef.value?.focus();
            });
            activateLayer("tag-search");
        } else {
            resetState();
            deactivateLayer("tag-search");
        }
    },
);

// 监听搜索查询变化
watch(searchQuery, () => {
    selectedIndex.value = -1;
});

// 监听键盘事件
const handleKeydown = (e) => {
    const results = filteredTags.value;
    const stopEvent = () => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
    };

    switch (e.key) {
        case "ArrowUp":
            stopEvent();
            if (results.length > 0) {
                selectedIndex.value =
                    selectedIndex.value <= 0
                        ? results.length - 1
                        : selectedIndex.value - 1;
            }
            break;

        case "ArrowDown":
            stopEvent();
            if (results.length > 0) {
                selectedIndex.value =
                    selectedIndex.value >= results.length - 1
                        ? 0
                        : selectedIndex.value + 1;
            }
            break;

        case "Enter":
            stopEvent();
            if (selectedIndex.value >= 0 && results[selectedIndex.value]) {
                selectTag(results[selectedIndex.value].name);
                jumpToTag();
            } else if (results.length === 1) {
                selectTag(results[0].name);
                jumpToTag();
            }
            break;

        case "Escape":
            stopEvent();
            close();
            break;
    }

    // Ctrl+Enter 也触发跳转
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        stopEvent();
        if (selectedTag.value) {
            jumpToTag();
        }
    }
};

// 加载标签数据
const loadTags = () => {
    if (!window.db) return;

    try {
        allTags.value = window.db.getTags();
        tagUsage.value = window.db.getTagUsage();
    } catch (error) {
        console.error("[TagSearchModal] 加载标签失败:", error);
        allTags.value = [];
        tagUsage.value = {};
    }
};

// 处理搜索输入
const handleSearchInput = () => {
    // 搜索逻辑已在 computed 中处理
};

// 选择标签
const selectTag = (tagName) => {
    selectedTag.value = tagName;
    selectedIndex.value = filteredTags.value.findIndex(
        (tag) => tag.name === tagName,
    );
};

// 跳转到标签页
const jumpToTag = () => {
    if (!selectedTag.value) return;

    emit("selectTag", selectedTag.value);
    close();
};

// 重置状态
const resetState = () => {
    searchQuery.value = "";
    selectedIndex.value = -1;
    selectedTag.value = "";
};

// 关闭模态框
const close = () => {
    emit("close");
};

// 点击遮罩关闭
const handleOverlayClick = () => {
    close();
};

// 全局键盘事件处理
const handleGlobalKeydown = (e) => {
    if (!props.visible) return;

    // 防止事件冒泡
    if (e.key === "Tab") {
        e.preventDefault();
    }
};

const onViewChange = () => {
    if (props.visible) loadTags();
};
onMounted(() => {
    document.addEventListener("keydown", handleGlobalKeydown, true);
    if (window.listener) window.listener.on("view-change", onViewChange);
    registerFeature("tag-search-block", () => ({
        handled: true,
        preventDefault: false,
        stopPropagation: false,
    }));
    registerFeature("tag-search-close", () => {
        close();
        return true;
    });
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleGlobalKeydown, true);
    if (window.listener && window.listener.off) window.listener.off("view-change", onViewChange);
    deactivateLayer("tag-search");
});
</script>

<style lang="less" scoped>
.tag-search-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(22, 27, 45, 0.45);
    backdrop-filter: blur(2px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tag-search-modal {
    background: #fff;
    border-radius: 18px;
    box-shadow: 0 30px 80px rgba(25, 34, 68, 0.18);
    width: 520px;
    max-width: 90vw;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
}

.tag-search-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e5e7eb;

    h3 {
        margin: 0;
        font-size: 17px;
        font-weight: 700;
        color: #1f2937;
    }
}

.tag-search-modal-close {
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

.tag-search-modal-body {
    padding: 18px 22px;
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.search-input-container {
    position: relative;
}

.search-input {
    width: 100%;
    height: 44px;
    padding: 0 40px 0 14px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    font-size: 15px;
    background: #f9fafb;

    &:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    &::placeholder {
        color: #9ca3af;
    }
}

.search-icon {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #6b7280;
    font-size: 16px;
}

.search-results {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
}

.no-results,
.empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.empty-text {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #374151;
}

.empty-hint {
    font-size: 14px;
    color: #9ca3af;
}

.tag-result-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;

    &:hover {
        background: #f3f4f6;
    }

    &.active {
        background: #eff6ff;
        border-color: #3b82f6;
    }

    &.selected {
        background: #dbeafe;
        border-color: #3b82f6;
    }
}

.tag-info {
    flex: 1;
    min-width: 0;
}

.tag-name {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
    color: #1f2937;
    font-size: 14px;
}

.tag-icon {
    font-size: 16px;
}

.tag-count {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
}

.tag-actions {
    display: flex;
    gap: 8px;
    flex: 0 0 auto;
}

.action-button {
    min-width: 56px;
    height: 30px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;

    &.primary {
        background: #3b82f6;
        color: white;

        &:hover {
            background: #2563eb;
        }
    }
}

.shortcuts-hint {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-start;
    padding-top: 14px;
    border-top: 1px solid #e5e7eb;
    font-size: 12px;
    color: #6b7280;
}

.hint-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 30px;
    padding: 6px 10px;
    border-radius: 999px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    white-space: nowrap;
}

.hint-item span {
    color: #4b5563;
}

kbd {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 2px 6px;
    font-family: monospace;
    font-size: 11px;
    color: #374151;
}

@media (max-width: 560px) {
    .tag-search-modal {
        width: min(92vw, 520px);
    }

    .tag-search-modal-header,
    .tag-search-modal-body {
        padding-left: 16px;
        padding-right: 16px;
    }

    .tag-result-item {
        align-items: flex-start;
    }

    .tag-actions {
        align-self: center;
    }

    .hint-item {
        white-space: normal;
    }
}
</style>
