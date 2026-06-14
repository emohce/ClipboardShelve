const getItemIdSet = (items) =>
    new Set((Array.isArray(items) ? items : []).map((item) => item?.id).filter(Boolean));

const findBottomIndexByIdSet = (items, idSet) => {
    if (!Array.isArray(items) || idSet.size === 0) return -1;
    let result = -1;
    for (let i = 0; i < items.length; i++) {
        if (idSet.has(items[i]?.id)) result = i;
    }
    return result;
};

const findRetainedItemIdNearAnchor = (showList, deletedIdSet, anchorIndex) => {
    const anchorItem = showList[anchorIndex];
    if (anchorItem?.id && !deletedIdSet.has(anchorItem.id)) return anchorItem.id;

    for (let i = anchorIndex + 1; i < showList.length; i++) {
        const item = showList[i];
        if (item?.id && !deletedIdSet.has(item.id)) return item.id;
    }

    for (let i = anchorIndex - 1; i >= 0; i--) {
        const item = showList[i];
        if (item?.id && !deletedIdSet.has(item.id)) return item.id;
    }

    return null;
};

export const computeDeleteAnchorMeta = ({
    showList,
    activeIndex,
    isMultiple,
    selectedItems = [],
    itemsToDelete = [],
    anchorItems = itemsToDelete,
} = {}) => {
    const list = Array.isArray(showList) ? showList : [];
    const idx = Number.isInteger(activeIndex) ? activeIndex : 0;
    const len = list.length;

    if (!isMultiple) {
        let preferItemId = null;
        if (len > 0) {
            if (idx < len - 1) preferItemId = list[idx + 1]?.id ?? null;
            else if (idx > 0) preferItemId = list[idx - 1]?.id ?? null;
        }
        return {
            anchor: { anchorIndex: idx, preferItemId },
            toKeep: null,
        };
    }

    const deleteIdSet = getItemIdSet(itemsToDelete);
    const anchorIdSet = getItemIdSet(anchorItems);
    const toKeep = (Array.isArray(selectedItems) ? selectedItems : []).filter(
        (item) => !deleteIdSet.has(item?.id),
    );
    const bottomAnchorIndex = findBottomIndexByIdSet(list, anchorIdSet);
    const anchorIndex = bottomAnchorIndex !== -1 ? bottomAnchorIndex : idx;

    return {
        anchor: {
            anchorIndex,
            preferItemId: findRetainedItemIdNearAnchor(list, deleteIdSet, anchorIndex),
        },
        toKeep,
    };
};

export const buildDeleteEventMeta = ({
    activeIndex,
    anchor,
    force = false,
} = {}) => ({
    anchorIndex: Number.isInteger(activeIndex) ? activeIndex : 0,
    preferItemId: anchor?.preferItemId ?? null,
    force,
});
