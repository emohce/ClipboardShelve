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
import { ref, computed } from 'vue'
import LayerNode from './HotkeyTreeViewLayer.vue'

const props = defineProps({
  treeData: {
    type: Array,
    required: true
  },
  bodyMaxHeight: {
    type: [Number, String],
    default: ''
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
  border: 1px solid var(--text-bg-color-lighter);
  border-radius: 4px;
  padding: 8px;
}

.group-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--primary-color);
  padding: 8px 4px;
  margin: 16px 0 8px;
  border-bottom: 2px solid var(--primary-color);
}

.group-title:first-child {
  margin-top: 0;
}

.layer-group {
  margin-bottom: 12px;
}

.layer-group:last-child {
  margin-bottom: 0;
}
</style>
