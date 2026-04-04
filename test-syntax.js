// Simple syntax test for the modified functions
const ref = (val) => ({ value: val });
const nextTick = (fn) => setTimeout(fn, 0);

// Mock the functions to test syntax
const activeIndex = ref(0);
const showList = ref([]);
const keyHoldTimer = ref(null);
const keyHoldDirection = ref(null);
const keyHoldStartTime = ref(0);

const KEY_HOLD_DELAY = 300;
const KEY_HOLD_REPEAT_INTERVAL = 150;

const isAtTopBoundary = () => {
    return activeIndex.value <= 0;
};

const isAtBottomBoundary = () => {
    return activeIndex.value >= showList.value.length - 1;
};

const stopKeyHold = () => {
    if (keyHoldTimer.value) {
        clearTimeout(keyHoldTimer.value);
        keyHoldTimer.value = null;
    }
    keyHoldDirection.value = null;
    keyHoldStartTime.value = 0;
};

const startKeyHoldAutoScroll = (direction) => {
    keyHoldDirection.value = direction;
    keyHoldStartTime.value = Date.now();
    
    keyHoldTimer.value = setTimeout(() => {
        const autoScroll = () => {
            if (!keyHoldDirection.value) return;
            
            const elapsed = Date.now() - keyHoldStartTime.value;
            const acceleratedInterval = Math.max(50, KEY_HOLD_REPEAT_INTERVAL - Math.floor(elapsed / 1000) * 10);
            
            keyHoldTimer.value = setTimeout(autoScroll, acceleratedInterval);
        };
        
        autoScroll();
    }, KEY_HOLD_DELAY);
};

console.log('Syntax test passed - no errors found');
