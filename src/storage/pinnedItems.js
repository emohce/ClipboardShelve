export const PINNED_ITEM_MAP_KEY = "pin.item.map";
export const PIN_LAST_ACTIVE_CONTEXT_KEY = "pin.lastActiveContext";

const readStorageObject = (key) => {
    try {
        const value = utools?.dbStorage?.getItem?.(key);
        return value && typeof value === "object" && !Array.isArray(value)
            ? value
            : {};
    } catch (_) {
        return {};
    }
};

const writeStorageObject = (key, value) => {
    try {
        utools?.dbStorage?.setItem?.(key, value);
    } catch (_) {
        // dbStorage is unavailable in browser-only development.
    }
};

export const getPinnedMap = () => readStorageObject(PINNED_ITEM_MAP_KEY);

export const isPinnedItem = (itemId) => {
    if (!itemId) return false;
    return Boolean(getPinnedMap()[itemId]);
};

export const togglePinnedItem = (item) => {
    if (!item?.id) return { pinned: false, map: getPinnedMap() };
    const map = { ...getPinnedMap() };
    if (map[item.id]) {
        delete map[item.id];
        writeStorageObject(PINNED_ITEM_MAP_KEY, map);
        return { pinned: false, map };
    }
    map[item.id] = { pinnedAt: Date.now() };
    writeStorageObject(PINNED_ITEM_MAP_KEY, map);
    return { pinned: true, map };
};

export const removePinnedItems = (ids = []) => {
    const idSet = new Set(ids.filter(Boolean));
    if (!idSet.size) return getPinnedMap();
    const map = { ...getPinnedMap() };
    let changed = false;
    idSet.forEach((id) => {
        if (map[id]) {
            delete map[id];
            changed = true;
        }
    });
    if (changed) writeStorageObject(PINNED_ITEM_MAP_KEY, map);
    return map;
};

export const sortPinnedItems = (items = [], map = getPinnedMap()) =>
    [...items].sort((a, b) => {
        const aTime = Number(map[a?.id]?.pinnedAt) || 0;
        const bTime = Number(map[b?.id]?.pinnedAt) || 0;
        return bTime - aTime;
    });

export const getLastActiveContext = () => {
    const context = readStorageObject(PIN_LAST_ACTIVE_CONTEXT_KEY);
    return {
        tab: context.tab || "all",
        collectTag: context.collectTag || "*全部*",
        keyword: typeof context.keyword === "string" ? context.keyword : "",
        lockFilter: context.lockFilter || "all",
    };
};

export const setLastActiveContext = (context = {}) => {
    writeStorageObject(PIN_LAST_ACTIVE_CONTEXT_KEY, {
        tab: context.tab || "all",
        collectTag: context.collectTag || "*全部*",
        keyword: typeof context.keyword === "string" ? context.keyword : "",
        lockFilter: context.lockFilter || "all",
        updatedAt: Date.now(),
    });
};
