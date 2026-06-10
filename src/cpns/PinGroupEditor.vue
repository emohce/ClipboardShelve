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
                    <span>拖拽或用 Alt+U / Alt+E 调整顺序</span>
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
                            <span class="pin-group-index">{{ index + 1 }}</span>
                            <span class="pin-group-type">{{ getTypeLabel(element) }}</span>
                            <span class="pin-group-text">{{ getItemSummary(element) }}</span>
                        </div>
                    </template>
                </draggable>
            </div>
            <div class="pin-group-editor-footer">
                <button class="pin-group-secondary" @click="clear">取消组合</button>
                <div class="pin-group-editor-actions">
                    <button class="pin-group-secondary" @click="close">取消</button>
                    <button class="pin-group-primary" @click="save">保存组合</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, ref, watch, onMounted, onUnmounted } from "vue";
import draggable from "vuedraggable";
import { activateLayer, deactivateLayer } from "../global/hotkeyLayers";
import { registerFeature } from "../global/hotkeyRegistry";

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

const resetDraft = () => {
    draftItems.value = Array.isArray(props.items) ? props.items.filter(Boolean) : [];
    activeIndex.value = 0;
    selectedIndices.value = draftItems.value.length ? [0] : [];
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

const setActiveIndex = (index, event) => {
    activeIndex.value = index;
    if (event?.shiftKey) {
        const set = new Set(selectedIndices.value);
        if (set.has(index)) set.delete(index);
        else set.add(index);
        selectedIndices.value = [...set].sort((a, b) => a - b);
    } else {
        selectedIndices.value = [index];
    }
};

const moveSelection = (delta) => {
    if (!draftItems.value.length) return true;
    const selected = selectedIndices.value.length
        ? [...selectedIndices.value].sort((a, b) => a - b)
        : [activeIndex.value];
    if (delta < 0 && selected[0] <= 0) return true;
    if (delta > 0 && selected[selected.length - 1] >= draftItems.value.length - 1) return true;
    const moving = new Set(selected);
    const items = [...draftItems.value];
    const order = delta < 0 ? selected : [...selected].reverse();
    order.forEach((index) => {
        const target = index + delta;
        if (target < 0 || target >= items.length || moving.has(target)) return;
        [items[index], items[target]] = [items[target], items[index]];
    });
    draftItems.value = items;
    selectedIndices.value = selected.map((index) => index + delta);
    activeIndex.value = Math.min(Math.max(activeIndex.value + delta, 0), items.length - 1);
    nextTick(() => {
        document
            .querySelector(`.pin-group-item:nth-child(${activeIndex.value + 1})`)
            ?.scrollIntoView?.({ block: "nearest" });
    });
    return true;
};

function registerHotkeys() {
    registerFeature("pin-group-edit-close", () => {
        close();
        return true;
    });
    registerFeature("pin-group-edit-save", () => {
        save();
        return true;
    });
    registerFeature("pin-group-edit-up", () => moveSelection(-1));
    registerFeature("pin-group-edit-down", () => moveSelection(1));
    registerFeature("pin-group-edit-block", () => true);
}

onMounted(registerHotkeys);
onUnmounted(() => deactivateLayer("pin-group-edit"));
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
    grid-template-columns: 24px 28px 42px minmax(0, 1fr);
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
}
.pin-group-item.active {
    border-color: rgba(53, 95, 157, 0.36);
    background: #eef4fb;
}
.pin-group-item.selected {
    box-shadow: inset 3px 0 0 #355f9d;
}
.pin-group-item-ghost {
    opacity: 0.5;
}
.pin-group-drag {
    color: #94a3b8;
    cursor: grab;
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
    justify-content: space-between;
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
