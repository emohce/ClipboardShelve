<template>
    <div
        class="pin-group-editor-overlay"
        v-if="visible"
        @click="close"
    >
        <div class="pin-group-editor" @click.stop>
            <div class="pin-group-editor-header">
                <div>
                    <h3>置顶组合</h3>
                    <span>上下移动高亮，空格多选，Alt+U / Alt+E 排序，Alt+G 清空</span>
                </div>
                <button class="pin-group-editor-close" @click="close">×</button>
            </div>
            <div class="pin-group-editor-list">
                <draggable
                    v-model="draftItems"
                    item-key="id"
                    handle=".pin-group-drag"
                    ghost-class="pin-group-item-ghost"
                >
                    <template #item="{ element, index }">
                        <div
                            class="pin-group-item"
                            :class="{
                                active: activeIndex === index,
                                selected: selectedIndexSet.has(index),
                            }"
                            @click="setActiveIndex(index, $event)"
                        >
                            <span class="pin-group-drag">⋮⋮</span>
                            <span class="pin-group-check" aria-hidden="true">
                                {{ selectedIndexSet.has(index) ? "✓" : "" }}
                            </span>
                            <span class="pin-group-index">{{ index + 1 }}</span>
                            <span class="pin-group-type">{{ getTypeLabel(element) }}</span>
                            <span class="pin-group-text">{{ getItemSummary(element) }}</span>
                        </div>
                    </template>
                </draggable>
            </div>
            <div class="pin-group-editor-footer">
                <div class="pin-group-editor-actions">
                    <button class="pin-group-secondary" @click="close">
                        <span>取消</span>
                        <small>Esc</small>
                    </button>
                    <button class="pin-group-secondary" @click="clear">
                        <span>清空组合</span>
                        <small>Alt+G</small>
                    </button>
                    <button class="pin-group-primary" @click="save">
                        <span>保存组合</span>
                        <small>Enter</small>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from "vue";
import draggable from "vuedraggable";
import { activateLayer, deactivateLayer } from "../global/hotkeyLayers";
import { registerCommandFeaturePairs } from "../global/hotkeyRegistry";

const props = defineProps({
    visible: Boolean,
    items: {
        type: Array,
        default: () => [],
    },
});

const emit = defineEmits(["close", "save", "clear"]);

const draftItems = ref([]);
const activeIndex = ref(0);
const selectedIndices = ref([]);
const selectedIndexSet = computed(() => new Set(selectedIndices.value));
let disposePinGroupCommandHandlers = null;

const resetDraft = () => {
    draftItems.value = Array.isArray(props.items) ? props.items.filter(Boolean) : [];
    activeIndex.value = 0;
    selectedIndices.value = [];
};

watch(
    () => props.visible,
    (visible) => {
        if (visible) {
            resetDraft();
            activateLayer("pin-group-edit");
        } else {
            deactivateLayer("pin-group-edit");
        }
    },
    { immediate: true },
);

watch(
    () => props.items,
    () => {
        if (props.visible) resetDraft();
    },
);

const close = () => emit("close");
const clear = () => emit("clear");
const save = () => emit("save", draftItems.value);

const getTypeLabel = (item) => {
    if (item?.type === "text") return "文本";
    if (item?.type === "image") return "图片";
    if (item?.type === "file") return "文件";
    return "项目";
};

const getItemSummary = (item) => {
    if (!item) return "";
    if (item.type === "text") return String(item.data || "").replace(/\s+/g, " ").slice(0, 80);
    if (item.type === "image") return "图片内容";
    if (item.type === "file") {
        try {
            const files = JSON.parse(item.data);
            return Array.isArray(files)
                ? files.map((file) => file.name || file.path).filter(Boolean).join("、").slice(0, 80)
                : "文件内容";
        } catch (_) {
            return "文件内容";
        }
    }
    return String(item.data || "").slice(0, 80);
};

const normalizeActive = () => {
    activeIndex.value = Math.min(
        Math.max(activeIndex.value, 0),
        Math.max(0, draftItems.value.length - 1),
    );
};

const scrollActiveIntoView = () => {
    nextTick(() => {
        document
            .querySelector(`.pin-group-item:nth-child(${activeIndex.value + 1})`)
            ?.scrollIntoView?.({ block: "nearest" });
    });
};

const moveActive = (delta) => {
    if (!draftItems.value.length) return true;
    activeIndex.value = Math.min(
        Math.max(activeIndex.value + delta, 0),
        draftItems.value.length - 1,
    );
    scrollActiveIntoView();
    return true;
};

const setActiveIndex = (index, event) => {
    activeIndex.value = index;
    if (event?.shiftKey || event?.metaKey || event?.ctrlKey) toggleActiveSelection(index);
};

const toggleActiveSelection = (index = activeIndex.value, options = {}) => {
    if (index < 0 || index >= draftItems.value.length) return true;
    const set = new Set(selectedIndices.value);
    const wasSelected = set.has(index);
    if (wasSelected) set.delete(index);
    else set.add(index);
    selectedIndices.value = [...set].sort((a, b) => a - b);
    if (!wasSelected && options.advance !== false) moveActive(1);
    return true;
};

const moveSelection = (delta) => {
    if (!draftItems.value.length) return true;
    const selected = selectedIndices.value.length
        ? [...selectedIndices.value].sort((a, b) => a - b)
        : [activeIndex.value];
    const selectedSet = new Set(selected);
    const selectedItems = selected.map((index) => draftItems.value[index]);
    const restItems = draftItems.value.filter((_, index) => !selectedSet.has(index));
    const min = selected[0];
    const max = selected[selected.length - 1];
    const count = selected.length;
    let insertIndex = delta < 0 ? max - count : min + 1;
    insertIndex = Math.min(Math.max(insertIndex, 0), restItems.length);
    const items = [
        ...restItems.slice(0, insertIndex),
        ...selectedItems,
        ...restItems.slice(insertIndex),
    ];
    draftItems.value = items;
    selectedIndices.value = selectedItems.map((_, index) => insertIndex + index);
    activeIndex.value = selectedIndices.value[Math.min(
        selectedIndices.value.length - 1,
        Math.max(0, selected.indexOf(activeIndex.value)),
    )] ?? insertIndex;
    scrollActiveIntoView();
    return true;
};

function handlePinGroupNavigateUpCommand() {
    return moveActive(-1);
}

function handlePinGroupNavigateDownCommand() {
    return moveActive(1);
}

function handlePinGroupMoveUpCommand() {
    return moveSelection(-1);
}

function handlePinGroupMoveDownCommand() {
    return moveSelection(1);
}

function registerHotkeys() {
    const handleCloseCommand = () => {
        if (selectedIndices.value.length) {
            selectedIndices.value = [];
            return true;
        }
        close();
        return true;
    };
    const handleToggleSelectCommand = () => toggleActiveSelection(activeIndex.value);
    const handleSaveCommand = () => {
        save();
        return true;
    };
    const handleClearCommand = () => {
        clear();
        return true;
    };
    const handleBlockCommand = () => true;
    disposePinGroupCommandHandlers = registerCommandFeaturePairs([
        { featureId: "pin-group-edit-close", commandId: "pin.group.edit.close", handler: handleCloseCommand },
        { featureId: "pin-group-edit-save", commandId: "pin.group.edit.save", handler: handleSaveCommand },
        { featureId: "pin-group-edit-nav-up", commandId: "pin.group.edit.navigate.up", handler: handlePinGroupNavigateUpCommand },
        { featureId: "pin-group-edit-nav-down", commandId: "pin.group.edit.navigate.down", handler: handlePinGroupNavigateDownCommand },
        { featureId: "pin-group-edit-toggle-select", commandId: "pin.group.edit.toggleSelect", handler: handleToggleSelectCommand },
        { featureId: "pin-group-edit-up", commandId: "pin.group.edit.moveUp", handler: handlePinGroupMoveUpCommand },
        { featureId: "pin-group-edit-down", commandId: "pin.group.edit.moveDown", handler: handlePinGroupMoveDownCommand },
        { featureId: "pin-group-edit-clear", commandId: "pin.group.edit.clear", handler: handleClearCommand },
        { featureId: "pin-group-edit-block", commandId: "pin.group.edit.blockUnhandled", handler: handleBlockCommand },
    ]);
}

onMounted(registerHotkeys);
onUnmounted(() => {
    disposePinGroupCommandHandlers?.();
    disposePinGroupCommandHandlers = null;
    deactivateLayer("pin-group-edit");
});
</script>

<style scoped>
.pin-group-editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 2200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(15, 23, 42, 0.32);
}
.pin-group-editor {
    width: min(560px, 92vw);
    max-height: min(640px, 86vh);
    display: flex;
    flex-direction: column;
    border-radius: 18px;
    background: #fff;
    border: 1px solid rgba(53, 95, 157, 0.16);
    box-shadow: 0 28px 70px rgba(15, 23, 42, 0.22);
    overflow: hidden;
}
.pin-group-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid rgba(53, 95, 157, 0.12);
}
.pin-group-editor-header h3 {
    margin: 0;
    font-size: 17px;
}
.pin-group-editor-header span {
    display: block;
    margin-top: 6px;
    color: #6b7280;
    font-size: 12px;
}
.pin-group-editor-close {
    border: 0;
    background: transparent;
    color: #64748b;
    font-size: 22px;
    cursor: pointer;
}
.pin-group-editor-list {
    padding: 12px;
    overflow: auto;
}
.pin-group-item {
    display: grid;
    grid-template-columns: 24px 22px 28px 42px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    min-height: 42px;
    margin-bottom: 8px;
    padding: 8px 10px;
    border: 1px solid rgba(53, 95, 157, 0.12);
    border-radius: 12px;
    background: #f8fafc;
    color: #1f2937;
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}
.pin-group-item.active {
    border-color: rgba(53, 95, 157, 0.36);
    background: #eef4fb;
    box-shadow: 0 0 0 1px rgba(53, 95, 157, 0.12);
}
.pin-group-item.selected {
    border-color: rgba(53, 95, 157, 0.3);
    background: rgba(53, 95, 157, 0.08);
    box-shadow: inset 3px 0 0 #355f9d;
}
.pin-group-item.active.selected {
    border-color: rgba(53, 95, 157, 0.46);
    background: rgba(53, 95, 157, 0.12);
    box-shadow:
        inset 3px 0 0 #355f9d,
        0 0 0 1px rgba(53, 95, 157, 0.16);
}
.pin-group-item-ghost {
    opacity: 0.5;
}
.pin-group-drag {
    color: #94a3b8;
    cursor: grab;
}
.pin-group-check {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(53, 95, 157, 0.24);
    border-radius: 5px;
    color: #355f9d;
    background: rgba(255, 255, 255, 0.72);
    font-size: 12px;
    font-weight: 800;
    line-height: 1;
}
.pin-group-index,
.pin-group-type {
    color: #64748b;
    font-size: 12px;
}
.pin-group-text {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
}
.pin-group-editor-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    padding: 14px 16px;
    border-top: 1px solid rgba(53, 95, 157, 0.12);
}
.pin-group-editor-actions {
    display: inline-flex;
    gap: 10px;
}
.pin-group-primary,
.pin-group-secondary {
    min-height: 34px;
    padding: 0 14px;
    border-radius: 10px;
    border: 1px solid rgba(53, 95, 157, 0.18);
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    line-height: 1.1;
}
.pin-group-primary small,
.pin-group-secondary small {
    font-size: 10px;
    opacity: 0.68;
}
.pin-group-primary {
    background: #355f9d;
    color: #fff;
}
.pin-group-secondary {
    background: #fff;
    color: #334155;
}
</style>
