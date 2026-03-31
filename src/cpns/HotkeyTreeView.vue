<template>
  <div class="hotkey-tree-view">
    <div v-if="!treeData || !Array.isArray(treeData) || treeData.length === 0" class="tree-empty">
      暂无快捷键数据
    </div>
    <div v-else class="tree-container" :style="containerStyle">
      <template v-for="(group, groupIdx) in groupedLayers" :key="`group-${groupIdx}`">
        <div v-if="group.title" class="group-title">{{ group.title }}</div>
        <div
          v-for="(layerNode, idx) in group.layers"
          :key="`layer-${layerNode.layer}-${layerNode.state || ''}-${idx}`"
          class="layer-group"
        >
          <LayerNode
            :node="layerNode"
            :expanded-keys="expandedKeys"
            :depth="0"
            @toggle-expand="handleToggleExpand"
          />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import LayerNode from './HotkeyTreeViewLayer.vue'

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  },
  bodyMaxHeight: {
    type: [Number, String],
    default: ''
  },
  defaultExpandAll: {
    type: Boolean,
    default: true
  }
})

const expandedKeys = ref(new Set())

const containerStyle = computed(() => {
  if (!props.bodyMaxHeight) return null
  const height = typeof props.bodyMaxHeight === 'number' ? `${props.bodyMaxHeight}px` : props.bodyMaxHeight
  return { maxHeight: height, overflowY: 'auto' }
})

const groupedLayers = computed(() => {
  if (!Array.isArray(props.treeData) || props.treeData.length === 0) return []
  
  const normalLayers = []
  const dialogLayers = []
  
  for (const layerNode of props.treeData) {
    if (layerNode.layer === 'main') {
      normalLayers.push(layerNode)
    } else {
      dialogLayers.push(layerNode)
    }
  }
  
  const groups = []
  if (normalLayers.length > 0) {
    groups.push({ title: '普通层', layers: normalLayers })
  }
  if (dialogLayers.length > 0) {
    groups.push({ title: '弹窗层', layers: dialogLayers })
  }
  
  return groups
})

watch(
  groupedLayers,
  (groups) => {
    if (!props.defaultExpandAll) return
    const keys = new Set()
    for (const group of groups) {
      for (const layerNode of group.layers) {
        keys.add(`layer-${layerNode.layer}-${layerNode.state || ''}`)
      }
    }
    expandedKeys.value = keys
  },
  { immediate: true }
)

function handleToggleExpand(key) {
  if (expandedKeys.value.has(key)) {
    expandedKeys.value.delete(key)
  } else {
    expandedKeys.value.add(key)
  }
}
</script>

<style lang="less" scoped>
.hotkey-tree-view {
  width: 100%;
}

.tree-empty {
  padding: 16px;
  text-align: center;
  color: var(--text-color-lighter);
}

.tree-container {
  border: 1px solid var(--border-color, var(--text-bg-color-lighter));
  border-radius: 18px;
  padding: 12px;
  background: var(--bg-elevated-color, #fff);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color);
  padding: 8px 6px;
  margin: 16px 0 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border-bottom: 1px solid var(--border-color, var(--text-bg-color-lighter));
}

.group-title:first-child {
  margin-top: 0;
}

.layer-group {
  margin-bottom: 14px;
}

.layer-group:last-child {
  margin-bottom: 0;
}
</style>
