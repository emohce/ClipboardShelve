export const rewindLoadedCursorAfterDelete = (cursor, removedCount) => {
    if (cursor == null) return null;
    const current = Math.max(0, Number(cursor) || 0);
    const removed = Math.max(0, Number(removedCount) || 0);
    return Math.max(0, current - removed);
};
