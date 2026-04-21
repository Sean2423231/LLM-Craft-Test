// inventory.js - Handles block inventory and selection

const inventorySlotCount = 40;
const inventorySlots = Array.from({ length: inventorySlotCount }, () => null);

inventorySlots[0] = { type: 'grass', count: 999 };
inventorySlots[1] = { type: 'dirt', count: 999 };
inventorySlots[2] = { type: 'stone', count: 999 };
inventorySlots[3] = { type: 'glass', count: 999 };

let selectedSlotIndex = 0;
let inventoryOpen = false;

function getInventoryState() {
    return {
        slots: inventorySlots.map(slot => slot ? { ...slot } : null),
        selectedSlotIndex
    };
}

function getSelectedSlot() {
    return inventorySlots[selectedSlotIndex];
}

function notifyInventoryChanged() {
    if (typeof updateInventoryUI === 'function') {
        updateInventoryUI();
    }
}

function setInventoryOpen(isOpen) {
    inventoryOpen = isOpen;

    if (typeof controls !== 'undefined') {
        if (inventoryOpen) {
            if (controls.isLocked) {
                controls.unlock();
            }
        } else if (!controls.isLocked) {
            const menuOpen = typeof window.isAnyMenuOpen === 'function'
                ? window.isAnyMenuOpen()
                : (typeof craftingOverlay !== 'undefined' && craftingOverlay.style.display !== 'none');
            if (!menuOpen) {
                controls.lock();
            }
            // Clean up tooltips when inventory closes
            if (typeof window.cleanupModifierTooltips === 'function') {
                window.cleanupModifierTooltips();
            }
        }
    }

    notifyInventoryChanged();
}

function toggleInventoryOpen() {
    setInventoryOpen(!inventoryOpen);
}

function selectInventorySlot(index) {
    if (index < 0 || index >= inventorySlotCount) return;
    selectedSlotIndex = index;
    notifyInventoryChanged();
}

function addInventoryItem(type, count = 1) {
    if (!type || count <= 0) return false;

    const existingIndex = inventorySlots.findIndex(slot => slot && slot.type === type);
    if (existingIndex !== -1) {
        inventorySlots[existingIndex].count += count;
        notifyInventoryChanged();
        return true;
    }

    const emptyIndex = inventorySlots.findIndex(slot => slot === null);
    if (emptyIndex === -1) {
        return false;
    }

    inventorySlots[emptyIndex] = { type, count };
    notifyInventoryChanged();
    return true;
}

function consumeSelectedInventoryItem(count = 1) {
    const selectedSlot = getSelectedSlot();
    if (!selectedSlot || selectedSlot.count < count) {
        return false;
    }

    selectedSlot.count -= count;
    if (selectedSlot.count <= 0) {
        inventorySlots[selectedSlotIndex] = null;
    }

    notifyInventoryChanged();
    return true;
}

window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyE' && !event.repeat) {
        if (typeof window.isCraftingOpen === 'function' && window.isCraftingOpen()) {
            if (typeof window.setCraftingOpen === 'function') {
                window.setCraftingOpen(false);
            }
            return;
        }
        toggleInventoryOpen();
        return;
    }

    if (!event.code.startsWith('Digit')) return;

    const keyNumber = Number.parseInt(event.code.replace('Digit', ''), 10);
    if (Number.isNaN(keyNumber) || keyNumber < 1 || keyNumber > 9) return;

    selectInventorySlot(keyNumber - 1);
});

window.getInventoryState = getInventoryState;
window.isInventoryOpen = () => inventoryOpen;
window.getSelectedBlockType = () => {
    const selectedSlot = getSelectedSlot();
    return selectedSlot ? selectedSlot.type : null;
};
window.setSelectedBlockType = (type) => {
    const slotIndex = inventorySlots.findIndex(slot => slot && slot.type === type);
    if (slotIndex !== -1) {
        selectInventorySlot(slotIndex);
    }
};
window.selectInventorySlot = selectInventorySlot;
window.addInventoryItem = addInventoryItem;
window.consumeSelectedInventoryItem = consumeSelectedInventoryItem;
window.setInventoryOpen = setInventoryOpen;
window.toggleInventoryOpen = toggleInventoryOpen;
window.notifyInventoryChanged = notifyInventoryChanged;
window.inventorySlots = inventorySlots;
