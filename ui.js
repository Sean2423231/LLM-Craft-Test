// Crafting Table UI
const craftingOverlay = document.createElement('div');
craftingOverlay.id = 'craftingOverlay';
craftingOverlay.style.position = 'absolute';
craftingOverlay.style.top = '50%';
craftingOverlay.style.left = '50%';
craftingOverlay.style.transform = 'translate(-50%, -50%)';
craftingOverlay.style.background = 'rgba(30,30,30,0.95)';
craftingOverlay.style.border = '2px solid #888';
craftingOverlay.style.borderRadius = '10px';
craftingOverlay.style.padding = '32px 24px 24px 24px';
craftingOverlay.style.display = 'none';
craftingOverlay.style.zIndex = '200';
craftingOverlay.style.textAlign = 'center';

// Title
const craftingTitle = document.createElement('div');
craftingTitle.innerText = 'Crafting Table';
craftingTitle.style.fontSize = '22px';
craftingTitle.style.color = '#fff';
craftingTitle.style.marginBottom = '18px';
craftingOverlay.appendChild(craftingTitle);

// Helper to create block slot display
function createBlockSlotDisplay(blockType) {
    const container = document.createElement('div');
    container.style.display = 'inline-block';
    container.style.width = '90px';
    container.style.height = '90px';
    container.style.marginInline = '10px';
    container.style.border = '2px solid #555';
    container.style.borderRadius = '6px';
    container.style.backgroundColor = 'rgba(0,0,0,0.3)';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'center';
    container.style.alignItems = 'center';
    container.style.cursor = 'pointer';
    container.style.transition = 'all 0.2s ease';
    
    const colorBox = document.createElement('div');
    colorBox.style.width = '60px';
    colorBox.style.height = '60px';
    colorBox.style.borderRadius = '3px';
    colorBox.style.marginBottom = '4px';
    colorBox.style.border = '2px solid #999';
    
    const label = document.createElement('div');
    label.style.fontSize = '11px';
    label.style.color = '#ccc';
    label.style.textAlign = 'center';
    label.style.width = '100%';
    
    if (blockType) {
        const metadata = window.BLOCK_METADATA && window.BLOCK_METADATA[blockType];
        colorBox.style.backgroundColor = metadata ? metadata.color : '#CCCCCC';
        label.innerText = blockType.split('_').join('\n');
    } else {
        colorBox.style.backgroundColor = '#444';
        label.innerText = 'Empty';
        label.style.color = '#888';
    }
    
    container.appendChild(colorBox);
    container.appendChild(label);
    
    return { container, colorBox, label };
}

// Input slots - show selected inventory blocks
let selectedSlot1 = null;
let selectedSlot2 = null;
let selectedSlot1Index = null;
let selectedSlot2Index = null;

const slot1Container = document.createElement('div');
const slot1Display = createBlockSlotDisplay(null);
slot1Container.appendChild(slot1Display.container);
slot1Container.style.display = 'inline-block';
slot1Container.style.marginRight = '10px';
slot1Container.style.position = 'relative';

const slot2Container = document.createElement('div');
const slot2Display = createBlockSlotDisplay(null);
slot2Container.appendChild(slot2Display.container);
slot2Container.style.display = 'inline-block';
slot2Container.style.marginLeft = '10px';
slot2Container.style.position = 'relative';

craftingOverlay.appendChild(slot1Container);
craftingOverlay.appendChild(document.createTextNode(' + '));
craftingOverlay.appendChild(slot2Container);

function resetCraftingSlot(display) {
    display.label.innerText = 'Empty';
    display.label.style.color = '#888';
    display.colorBox.style.backgroundColor = '#444';
}

function setCraftingSlot(slotNumber, blockType, slotIndex) {
    const display = slotNumber === 1 ? slot1Display : slot2Display;
    const container = slotNumber === 1 ? slot1Container : slot2Container;
    const metadata = blockType && window.BLOCK_METADATA ? window.BLOCK_METADATA[blockType] : null;

    if (slotNumber === 1) {
        selectedSlot1 = blockType;
        selectedSlot1Index = slotIndex;
    } else {
        selectedSlot2 = blockType;
        selectedSlot2Index = slotIndex;
    }

    if (blockType) {
        display.label.innerText = blockType.split('_').join('\n');
        display.label.style.color = '#ccc';
        display.colorBox.style.backgroundColor = metadata ? metadata.color : '#CCCCCC';
        
        // Add modifier tooltip
        let tooltip = container.querySelector('[data-is-modifier-tooltip]');
        if (tooltip) {
            tooltip.remove();
        }

        tooltip = document.createElement('div');
        tooltip.setAttribute('data-is-modifier-tooltip', 'true');
        tooltip.style.position = 'fixed';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '9999';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        tooltip.style.border = '2px solid #00FF00';
        tooltip.style.color = '#00FF00';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '11px';
        tooltip.style.fontFamily = 'monospace';
        tooltip.style.maxWidth = '200px';
        tooltip.style.wordWrap = 'break-word';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
        tooltip.innerHTML = `<strong>${blockType}</strong><br><em>Loading modifiers...</em>`;
        document.body.appendChild(tooltip);

        // Get and display modifiers
        const loadModifiers = async () => {
            try {
                let modifiers = [];
                if (typeof window.getModifiersForBlockLLM === 'function') {
                    modifiers = await window.getModifiersForBlockLLM(blockType);
                } else if (typeof window.getModifiersForBlock === 'function') {
                    modifiers = window.getModifiersForBlock(blockType);
                }
                
                if (modifiers.length === 0) {
                    tooltip.innerHTML = `<strong>${blockType}</strong><br><em>No modifiers</em>`;
                } else {
                    const modifierNames = modifiers
                        .map(key => {
                            const mod = window.MODIFIERS ? window.MODIFIERS[key] : null;
                            return mod ? `• ${mod.name}` : `• ${key}`;
                        })
                        .join('<br>');
                    tooltip.innerHTML = `<strong>${blockType}</strong><br>${modifierNames}`;
                }
            } catch (error) {
                tooltip.innerHTML = `<strong>${blockType}</strong><br><em>Error loading modifiers</em>`;
                console.error('[Crafting] Error loading modifiers:', error);
            }
        };

        container.addEventListener('mouseenter', () => {
            loadModifiers();
            const rect = container.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.left = (rect.right + 8) + 'px';
            tooltip.style.top = (rect.top) + 'px';
        });

        container.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    } else {
        if (slotNumber === 1) selectedSlot1Index = null;
        if (slotNumber === 2) selectedSlot2Index = null;
        
        // Remove tooltip if it exists
        const tooltip = container.querySelector('[data-is-modifier-tooltip]');
        if (tooltip) {
            tooltip.remove();
        }
        
        resetCraftingSlot(display);
    }
}

function attachCraftingDropHandlers(slotNumber, display) {
    display.container.addEventListener('dragover', (event) => {
        event.preventDefault();
        display.container.style.borderColor = '#ffd54f';
    });

    display.container.addEventListener('dragleave', () => {
        display.container.style.borderColor = '#555';
    });

    display.container.addEventListener('drop', (event) => {
        event.preventDefault();
        display.container.style.borderColor = '#555';

        const indexText = event.dataTransfer ? event.dataTransfer.getData('text/plain') : '';
        const slotIndex = Number.parseInt(indexText, 10);
        if (Number.isNaN(slotIndex)) return;

        const allSlots = window.inventorySlots || [];
        const slot = allSlots[slotIndex];
        if (!slot || !slot.type) return;

        setCraftingSlot(slotNumber, slot.type, slotIndex);
    });

    display.container.addEventListener('click', () => {
        setCraftingSlot(slotNumber, null, null);
    });
}

attachCraftingDropHandlers(1, slot1Display);
attachCraftingDropHandlers(2, slot2Display);

// Craft button
const craftBtn = document.createElement('button');
craftBtn.innerText = 'Craft';
craftBtn.style.margin = '18px 0 0 0';
craftBtn.style.padding = '8px 24px';
craftBtn.style.fontSize = '16px';
craftBtn.style.borderRadius = '5px';
craftBtn.style.border = 'none';
craftBtn.style.background = '#4caf50';
craftBtn.style.color = '#fff';
craftBtn.style.cursor = 'pointer';
craftingOverlay.appendChild(document.createElement('br'));
craftingOverlay.appendChild(craftBtn);

// Output slot with color preview
const outputDiv = document.createElement('div');
outputDiv.style.marginTop = '18px';
outputDiv.style.color = '#fff';
outputDiv.style.fontSize = '14px';

const outputPreviewBox = document.createElement('div');
outputPreviewBox.style.width = '60px';
outputPreviewBox.style.height = '60px';
outputPreviewBox.style.backgroundColor = '#444';
outputPreviewBox.style.borderRadius = '3px';
outputPreviewBox.style.border = '2px solid #999';
outputPreviewBox.style.margin = '8px auto';

const outputLabel = document.createElement('div');
outputLabel.innerText = 'Result: (empty)';
outputLabel.style.fontSize = '14px';

outputDiv.appendChild(outputLabel);
outputDiv.appendChild(outputPreviewBox);
craftingOverlay.appendChild(outputDiv);

// Close button
const closeBtn = document.createElement('button');
closeBtn.innerText = 'Close';
closeBtn.style.marginTop = '18px';
closeBtn.style.marginLeft = '12px';
closeBtn.style.padding = '6px 18px';
closeBtn.style.fontSize = '15px';
closeBtn.style.borderRadius = '5px';
closeBtn.style.border = 'none';
closeBtn.style.background = '#888';
closeBtn.style.color = '#fff';
closeBtn.style.cursor = 'pointer';
craftingOverlay.appendChild(document.createElement('br'));
craftingOverlay.appendChild(closeBtn);

const craftingInventoryTitle = document.createElement('div');
craftingInventoryTitle.innerText = 'Inventory (drag blocks into slots above)';
craftingInventoryTitle.style.marginTop = '18px';
craftingInventoryTitle.style.marginBottom = '8px';
craftingInventoryTitle.style.color = 'rgba(255,255,255,0.8)';
craftingInventoryTitle.style.fontSize = '12px';
craftingInventoryTitle.style.letterSpacing = '0.6px';
craftingOverlay.appendChild(craftingInventoryTitle);

const craftingInventoryGrid = document.createElement('div');
craftingInventoryGrid.style.display = 'grid';
craftingInventoryGrid.style.gridTemplateColumns = 'repeat(10, 56px)';
craftingInventoryGrid.style.gap = '6px';
craftingInventoryGrid.style.justifyContent = 'center';
craftingInventoryGrid.style.marginTop = '6px';
craftingOverlay.appendChild(craftingInventoryGrid);

function renderCraftingInventoryGrid() {
    if (craftingOverlay.style.display === 'none') return;
    if (typeof window.getInventoryState !== 'function') return;

    const inventoryState = window.getInventoryState();
    craftingInventoryGrid.innerHTML = '';

    inventoryState.slots.forEach((slot, index) => {
        const item = document.createElement('div');
        item.style.width = '56px';
        item.style.height = '56px';
        item.style.borderRadius = '6px';
        item.style.border = index === inventoryState.selectedSlotIndex ? '2px solid #ffd54f' : '1px solid rgba(255,255,255,0.16)';
        item.style.background = index === inventoryState.selectedSlotIndex ? 'rgba(255,213,79,0.16)' : 'rgba(255,255,255,0.07)';
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'flex-start';
        item.style.padding = '6px';
        item.style.fontSize = '10px';
        item.style.color = 'white';
        item.style.userSelect = 'none';
        item.style.position = 'relative';

        if (slot && slot.type) {
            const metadata = window.BLOCK_METADATA ? window.BLOCK_METADATA[slot.type] : null;
            const swatch = document.createElement('div');
            swatch.style.width = '100%';
            swatch.style.height = '10px';
            swatch.style.borderRadius = '2px';
            swatch.style.backgroundColor = metadata ? metadata.color : '#BBBBBB';
            item.appendChild(swatch);

            const name = document.createElement('div');
            name.innerText = formatItemLabel(slot.type);
            name.style.width = '100%';
            name.style.overflow = 'hidden';
            name.style.textOverflow = 'ellipsis';
            name.style.whiteSpace = 'nowrap';
            item.appendChild(name);

            const count = document.createElement('div');
            count.innerText = `x${slot.count}`;
            count.style.alignSelf = 'flex-end';
            count.style.fontWeight = 'bold';
            item.appendChild(count);

            // Add modifier tooltip on hover
            const tooltip = document.createElement('div');
            tooltip.style.position = 'fixed';
            tooltip.style.display = 'none';
            tooltip.style.zIndex = '9999';
            tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            tooltip.style.border = '2px solid #00FF00';
            tooltip.style.color = '#00FF00';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '11px';
            tooltip.style.fontFamily = 'monospace';
            tooltip.style.maxWidth = '200px';
            tooltip.style.wordWrap = 'break-word';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
            tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>Loading modifiers...</em>`;
            document.body.appendChild(tooltip);

            // Get and display modifiers
            const loadModifiers = async () => {
                try {
                    let modifiers = [];
                    if (typeof window.getModifiersForBlockLLM === 'function') {
                        modifiers = await window.getModifiersForBlockLLM(slot.type);
                    } else if (typeof window.getModifiersForBlock === 'function') {
                        modifiers = window.getModifiersForBlock(slot.type);
                    }
                    
                    if (modifiers.length === 0) {
                        tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>No modifiers</em>`;
                    } else {
                        const modifierNames = modifiers
                            .map(key => {
                                const mod = window.MODIFIERS ? window.MODIFIERS[key] : null;
                                return mod ? `• ${mod.name}` : `• ${key}`;
                            })
                            .join('<br>');
                        tooltip.innerHTML = `<strong>${slot.type}</strong><br>${modifierNames}`;
                    }
                } catch (error) {
                    tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>Error loading modifiers</em>`;
                    console.error('[Crafting Inventory] Error loading modifiers:', error);
                }
            };

            item.addEventListener('mouseenter', () => {
                loadModifiers();
                const rect = item.getBoundingClientRect();
                tooltip.style.display = 'block';
                tooltip.style.left = (rect.right + 8) + 'px';
                tooltip.style.top = (rect.top) + 'px';
            });

            item.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
            });

            item.draggable = true;
            item.style.cursor = 'grab';
            item.addEventListener('dragstart', (event) => {
                tooltip.style.display = 'none';  // Hide tooltip during drag
                if (!event.dataTransfer) return;
                event.dataTransfer.setData('text/plain', String(index));
                event.dataTransfer.effectAllowed = 'copy';
            });
        } else {
            item.style.opacity = '0.45';
            const empty = document.createElement('div');
            empty.innerText = 'Empty';
            item.appendChild(empty);
            item.draggable = false;
            item.style.cursor = 'default';
        }

        item.addEventListener('click', () => {
            if (typeof window.selectInventorySlot === 'function') {
                window.selectInventorySlot(index);
            }
        });

        craftingInventoryGrid.appendChild(item);
    });
}

function isCraftingOpen() {
    return craftingOverlay.style.display !== 'none';
}

window.isCraftingOpen = isCraftingOpen;
window.isAnyMenuOpen = () => {
    const inventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    return isCraftingOpen() || inventoryOpen;
};

function syncInstructionPrompt() {
    if (typeof controls === 'undefined') return;
    if (controls.isLocked) {
        instructions.style.display = 'none';
        return;
    }
    const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
    instructions.style.display = menuOpen ? 'none' : 'block';
}

function setCraftingOpen(isOpen) {
    if (isOpen) {
        craftingOverlay.style.display = 'block';
        if (typeof window.setInventoryOpen === 'function' && typeof window.isInventoryOpen === 'function' && window.isInventoryOpen()) {
            window.setInventoryOpen(false);
        }
        if (typeof controls !== 'undefined' && controls.isLocked) {
            controls.unlock();
        }
        renderCraftingInventoryGrid();
        syncInstructionPrompt();
        return;
    }

    craftingOverlay.style.display = 'none';
    window.crafting_selectSlot = null;
    syncInstructionPrompt();

    if (typeof controls !== 'undefined' && !controls.isLocked) {
        const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
        if (!menuOpen) {
            controls.lock();
        }
    }
}

window.setCraftingOpen = setCraftingOpen;

document.body.appendChild(craftingOverlay);

// Show/hide crafting overlay with C key
window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && !e.repeat) {
        setCraftingOpen(!isCraftingOpen());
    }
});

closeBtn.onclick = () => { 
    setCraftingOpen(false);
};

// Craft button functionality with LLM combination
craftBtn.onclick = async () => {
    if (!selectedSlot1 || !selectedSlot2) {
        outputLabel.innerText = 'Result: Select both blocks';
        return;
    }
    
    try {
        // Show loading state
        craftBtn.disabled = true;
        craftBtn.innerText = 'Crafting...';
        outputLabel.innerText = 'Result: Generating...';
        outputPreviewBox.style.backgroundColor = '#444';
        
        console.log('[Crafting] Starting combination:', selectedSlot1, '+', selectedSlot2);
        
        // Combine blocks using LLM
        let result;
        try {
            if (window.llmService) {
                result = await window.llmService.combineBlocks(selectedSlot1, selectedSlot2);
                console.log('[Crafting] LLM result:', result);
            } else {
                console.log('[Crafting] No LLM service, using fallback');
                const service = window.LLMService ? new window.LLMService() : null;
                if (!service) throw new Error('LLMService unavailable');
                result = service.generateFallbackCombination(selectedSlot1, selectedSlot2);
            }
        } catch (llmError) {
            console.error('[Crafting] LLM error, using fallback:', llmError);
            const service = window.LLMService ? new window.LLMService() : null;
            if (service) {
                result = service.generateFallbackCombination(selectedSlot1, selectedSlot2);
            } else {
                result = {
                    blockType: `${selectedSlot1}_${selectedSlot2}`,
                    color: '#888888',
                    rgb: [136, 136, 136],
                    confidence: 0.1,
                };
            }
        }
        
        if (!result || !result.blockType) {
            throw new Error('Invalid result from LLM service');
        }
        
        console.log('[Crafting] Result block:', result.blockType);
        
        // Display result
        outputLabel.innerText = `Result: ${result.blockType}`;
        outputPreviewBox.style.backgroundColor = result.color;
        
        // Consume input blocks from inventory and add result
        if (typeof window.addInventoryItem === 'function') {
            const allSlots = window.inventorySlots || [];
            const slot1Index = selectedSlot1Index;
            const slot2Index = selectedSlot2Index;

            if (slot1Index === null || slot2Index === null) {
                throw new Error('Drag inventory blocks into both crafting slots');
            }

            const firstSlot = allSlots[slot1Index];
            const secondSlot = allSlots[slot2Index];
            if (!firstSlot || firstSlot.type !== selectedSlot1) {
                throw new Error('First input block is no longer available');
            }
            if (!secondSlot || secondSlot.type !== selectedSlot2) {
                throw new Error('Second input block is no longer available');
            }

            const block1 = selectedSlot1;
            const block2 = selectedSlot2;

            try {
                if (slot1Index === slot2Index) {
                    if (firstSlot.count < 2) {
                        throw new Error('Need at least 2 of that block in one stack');
                    }
                    firstSlot.count -= 2;
                    if (firstSlot.count <= 0) {
                        allSlots[slot1Index] = null;
                    }
                } else {
                    firstSlot.count -= 1;
                    if (firstSlot.count <= 0) {
                        allSlots[slot1Index] = null;
                    }

                    secondSlot.count -= 1;
                    if (secondSlot.count <= 0) {
                        allSlots[slot2Index] = null;
                    }
                }

                // Give player the result block
                window.addInventoryItem(result.blockType, 1);

                console.log('[Crafting] Inventory updated, notifying...');

                if (typeof window.notifyInventoryChanged === 'function') {
                    window.notifyInventoryChanged();
                }

                // Reset crafting table
                setCraftingSlot(1, null, null);
                setCraftingSlot(2, null, null);

                console.log(`[Crafting] SUCCESS: Created ${result.blockType} from ${block1} + ${block2}`);
            } catch (inventoryError) {
                console.error('[Crafting] Inventory error:', inventoryError);
                throw inventoryError;
            }
        } else {
            console.error('[Crafting] addInventoryItem not available');
        }
        
    } catch (error) {
        console.error('[Crafting] Crafting failed:', error);
        const errorMsg = error.message || 'Unknown error';
        outputLabel.innerText = `Result: Failed - ${errorMsg}`;
    } finally {
        craftBtn.disabled = false;
        craftBtn.innerText = 'Craft';
    }
};

// Inventory UI
const hotbarDisplay = document.createElement('div');
hotbarDisplay.id = 'hotbarDisplay';
hotbarDisplay.style.position = 'absolute';
hotbarDisplay.style.bottom = '10px';
hotbarDisplay.style.left = '50%';
hotbarDisplay.style.transform = 'translateX(-50%)';
hotbarDisplay.style.color = 'white';
hotbarDisplay.style.fontSize = '14px';
hotbarDisplay.style.fontFamily = 'monospace';
hotbarDisplay.style.backgroundColor = 'rgba(0,0,0,0.72)';
hotbarDisplay.style.padding = '10px';
hotbarDisplay.style.borderRadius = '8px';
hotbarDisplay.style.border = '1px solid rgba(255,255,255,0.18)';
hotbarDisplay.style.zIndex = '120';
hotbarDisplay.style.pointerEvents = 'auto';
document.body.appendChild(hotbarDisplay);

const inventoryOverlay = document.createElement('div');
inventoryOverlay.id = 'inventoryOverlay';
inventoryOverlay.style.position = 'absolute';
inventoryOverlay.style.top = '50%';
inventoryOverlay.style.left = '50%';
inventoryOverlay.style.transform = 'translate(-50%, -50%)';
inventoryOverlay.style.color = 'white';
inventoryOverlay.style.fontSize = '14px';
inventoryOverlay.style.fontFamily = 'monospace';
inventoryOverlay.style.backgroundColor = 'rgba(0,0,0,0.86)';
inventoryOverlay.style.padding = '16px';
inventoryOverlay.style.borderRadius = '10px';
inventoryOverlay.style.border = '1px solid rgba(255,255,255,0.18)';
inventoryOverlay.style.zIndex = '180';
inventoryOverlay.style.pointerEvents = 'auto';
inventoryOverlay.style.minWidth = '620px';
inventoryOverlay.style.display = 'none';
document.body.appendChild(inventoryOverlay);

function formatItemLabel(type) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function createInventorySlotElement(slot, index, selectedSlotIndex) {
    const slotElement = document.createElement('button');
    slotElement.type = 'button';
    slotElement.dataset.slotIndex = String(index);
    slotElement.style.width = '56px';
    slotElement.style.height = '56px';
    slotElement.style.display = 'flex';
    slotElement.style.flexDirection = 'column';
    slotElement.style.justifyContent = 'space-between';
    slotElement.style.alignItems = 'flex-start';
    slotElement.style.padding = '6px';
    slotElement.style.borderRadius = '6px';
    slotElement.style.border = index === selectedSlotIndex ? '2px solid #ffd54f' : '1px solid rgba(255,255,255,0.16)';
    slotElement.style.background = index === selectedSlotIndex ? 'rgba(255,213,79,0.16)' : 'rgba(255,255,255,0.07)';
    slotElement.style.color = 'white';
    slotElement.style.cursor = 'pointer';
    slotElement.style.fontFamily = 'inherit';
    slotElement.style.position = 'relative';

    const slotIndexLabel = document.createElement('div');
    slotIndexLabel.textContent = index < 9 ? String(index + 1) : String(index + 1);
    slotIndexLabel.style.fontSize = '10px';
    slotIndexLabel.style.opacity = '0.7';
    slotElement.appendChild(slotIndexLabel);

    const itemName = document.createElement('div');
    itemName.textContent = slot ? formatItemLabel(slot.type) : 'Empty';
    itemName.style.fontSize = '11px';
    itemName.style.lineHeight = '1.1';
    itemName.style.textAlign = 'left';
    itemName.style.width = '100%';
    itemName.style.opacity = slot ? '1' : '0.45';
    slotElement.appendChild(itemName);

    const itemCount = document.createElement('div');
    itemCount.textContent = slot ? `x${slot.count}` : '';
    itemCount.style.fontSize = '11px';
    itemCount.style.fontWeight = 'bold';
    itemCount.style.alignSelf = 'flex-end';
    slotElement.appendChild(itemCount);

    // Add modifier tooltip on hover
    if (slot && slot.type) {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'fixed';
        tooltip.style.display = 'none';
        tooltip.style.zIndex = '9999';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        tooltip.style.border = '2px solid #00FF00';
        tooltip.style.color = '#00FF00';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '11px';
        tooltip.style.fontFamily = 'monospace';
        tooltip.style.maxWidth = '200px';
        tooltip.style.wordWrap = 'break-word';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.boxShadow = '0 0 15px rgba(0, 255, 0, 0.3)';
        tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>Loading modifiers...</em>`;
        document.body.appendChild(tooltip);

        // Get and display modifiers
        const loadModifiers = async () => {
            try {
                // Try LLM first, fall back to sync version
                let modifiers = [];
                if (typeof window.getModifiersForBlockLLM === 'function') {
                    modifiers = await window.getModifiersForBlockLLM(slot.type);
                } else if (typeof window.getModifiersForBlock === 'function') {
                    modifiers = window.getModifiersForBlock(slot.type);
                }
                
                if (modifiers.length === 0) {
                    tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>No modifiers</em>`;
                } else {
                    const modifierNames = modifiers
                        .map(key => {
                            const mod = window.MODIFIERS ? window.MODIFIERS[key] : null;
                            return mod ? `• ${mod.name}` : `• ${key}`;
                        })
                        .join('<br>');
                    tooltip.innerHTML = `<strong>${slot.type}</strong><br>${modifierNames}`;
                }
            } catch (error) {
                tooltip.innerHTML = `<strong>${slot.type}</strong><br><em>Error loading modifiers</em>`;
                console.error('[Inventory] Error loading modifiers:', error);
            }
        };

        slotElement.addEventListener('mouseenter', () => {
            loadModifiers();
            const rect = slotElement.getBoundingClientRect();
            tooltip.style.display = 'block';
            tooltip.style.left = (rect.right + 8) + 'px';
            tooltip.style.top = (rect.top) + 'px';
        });

        slotElement.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });

        // Clean up tooltip when element is removed
        slotElement.addEventListener('DOMNodeRemoved', () => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        });
    }

    slotElement.addEventListener('click', () => {
        if (typeof window.selectInventorySlot === 'function') {
            window.selectInventorySlot(index);
        }
    });

    return slotElement;
}

function updateInventoryUI() {
    if (typeof window.getInventoryState !== 'function') return;

    const inventoryState = window.getInventoryState();
    const isInventoryOpen = typeof window.isInventoryOpen === 'function' ? window.isInventoryOpen() : false;
    const isCraftingMenuOpen = typeof window.isCraftingOpen === 'function' ? window.isCraftingOpen() : false;
    hotbarDisplay.innerHTML = '';
    inventoryOverlay.innerHTML = '';
    inventoryOverlay.style.display = isInventoryOpen && !isCraftingMenuOpen ? 'block' : 'none';

    const hotbarGrid = document.createElement('div');
    hotbarGrid.style.display = 'grid';
    hotbarGrid.style.gridTemplateColumns = 'repeat(9, 56px)';
    hotbarGrid.style.gap = '6px';
    hotbarDisplay.appendChild(hotbarGrid);

    inventoryState.slots.slice(0, 9).forEach((slot, index) => {
        hotbarGrid.appendChild(createInventorySlotElement(slot, index, inventoryState.selectedSlotIndex));
    });

    if (!isInventoryOpen || isCraftingMenuOpen) {
        if (isCraftingMenuOpen) {
            renderCraftingInventoryGrid();
        }
        return;
    }

    const title = document.createElement('div');
    title.textContent = 'Inventory';
    title.style.marginBottom = '8px';
    title.style.fontSize = '13px';
    title.style.letterSpacing = '1px';
    title.style.textTransform = 'uppercase';
    title.style.color = 'rgba(255,255,255,0.75)';
    inventoryOverlay.appendChild(title);

    const hint = document.createElement('div');
    hint.textContent = 'Press E to close';
    hint.style.marginBottom = '12px';
    hint.style.fontSize = '12px';
    hint.style.color = 'rgba(255,255,255,0.6)';
    inventoryOverlay.appendChild(hint);

    const grid = document.createElement('div');
    grid.id = 'inventoryGrid';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(10, 56px)';
    grid.style.gap = '6px';
    inventoryOverlay.appendChild(grid);

    inventoryState.slots.forEach((slot, index) => {
        grid.appendChild(createInventorySlotElement(slot, index, inventoryState.selectedSlotIndex));
    });
}

if (typeof window.getInventoryState === 'function') updateInventoryUI();
// ui.js - User interface elements

// Instructions
const instructions = document.createElement('div');
instructions.style.position = 'absolute';
instructions.style.top = '50%';
instructions.style.width = '100%';
instructions.style.textAlign = 'center';
instructions.style.color = 'white';
instructions.style.fontSize = '20px';
instructions.innerHTML = 'Click to start';
document.body.appendChild(instructions);

// Coordinates display
const coordsDisplay = document.createElement('div');
coordsDisplay.style.position = 'absolute';
coordsDisplay.style.top = '10px';
coordsDisplay.style.left = '10px';
coordsDisplay.style.color = 'white';
coordsDisplay.style.fontSize = '16px';
coordsDisplay.style.fontFamily = 'monospace';
coordsDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
coordsDisplay.style.padding = '5px';
coordsDisplay.style.borderRadius = '3px';
document.body.appendChild(coordsDisplay);

// FPS display
const fpsDisplay = document.createElement('div');
fpsDisplay.style.position = 'absolute';
fpsDisplay.style.top = '10px';
fpsDisplay.style.right = '10px';
fpsDisplay.style.color = 'white';
fpsDisplay.style.fontSize = '16px';
fpsDisplay.style.fontFamily = 'monospace';
fpsDisplay.style.backgroundColor = 'rgba(0,0,0,0.5)';
fpsDisplay.style.padding = '5px';
fpsDisplay.style.borderRadius = '3px';
fpsDisplay.innerHTML = 'FPS: 0';
document.body.appendChild(fpsDisplay);

// Render distance slider
const renderDistanceContainer = document.createElement('div');
renderDistanceContainer.id = 'renderDistanceContainer';
renderDistanceContainer.style.position = 'absolute';
renderDistanceContainer.style.bottom = '10px';
renderDistanceContainer.style.left = '10px';
renderDistanceContainer.style.color = 'white';
renderDistanceContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
renderDistanceContainer.style.padding = '10px';
renderDistanceContainer.style.borderRadius = '3px';
renderDistanceContainer.style.fontFamily = 'Arial, sans-serif';
renderDistanceContainer.style.fontSize = '14px';

const renderDistanceLabel = document.createElement('label');
renderDistanceLabel.htmlFor = 'renderDistanceSlider';
renderDistanceLabel.innerHTML = 'Render Distance: ';

const renderDistanceSlider = document.createElement('input');
renderDistanceSlider.id = 'renderDistanceSlider';
renderDistanceSlider.type = 'range';
renderDistanceSlider.min = '1';
renderDistanceSlider.max = '10';
renderDistanceSlider.value = renderDistance;
renderDistanceSlider.style.marginLeft = '10px';
renderDistanceSlider.style.width = '150px';
renderDistanceSlider.style.verticalAlign = 'middle';

const renderDistanceValue = document.createElement('span');
renderDistanceValue.id = 'renderDistanceValue';
renderDistanceValue.innerHTML = renderDistance;
renderDistanceValue.style.marginLeft = '10px';

renderDistanceContainer.appendChild(renderDistanceLabel);
renderDistanceContainer.appendChild(renderDistanceSlider);
renderDistanceContainer.appendChild(renderDistanceValue);
document.body.appendChild(renderDistanceContainer);

function setupUI() {
    // Initialize LLM service for block naming
    // Configure with your local Ollama settings
    if (window.initLLMService) {
        window.initLLMService({
            baseUrl: 'http://localhost:11434',
            model: 'qwen2.5-coder',  // Using your installed Qwen model
            enabled: true,
            debug: true,
            timeout: 15000,  // Longer for GPU inference
            retries: 2
        });
    }

    instructions.addEventListener('click', () => {
        const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
        if (menuOpen) return;
        controls.lock();
    });

    controls.addEventListener('lock', () => {
        const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
        if (menuOpen) {
            controls.unlock();
            return;
        }
        instructions.style.display = 'none';
    });

    controls.addEventListener('unlock', () => {
        const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
        instructions.style.display = menuOpen ? 'none' : 'block';
    });

    document.addEventListener('pointerlockchange', () => {
        const menuOpen = typeof window.isAnyMenuOpen === 'function' ? window.isAnyMenuOpen() : false;
        if (menuOpen && controls.isLocked) {
            controls.unlock();
        }
    });

    renderDistanceSlider.addEventListener('input', (event) => {
        const newDistance = parseInt(event.target.value);
        renderDistance = newDistance;
        renderDistanceValue.innerHTML = newDistance;
        
        // Reload chunks with new render distance
        updateChunks(true);
    });
}

function updateUI() {
    const playerPos = controls.getObject().position;
    const playerChunkX = Math.floor(playerPos.x / chunkSize);
    const playerChunkZ = Math.floor(playerPos.z / chunkSize);
    coordsDisplay.innerHTML = `Player: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})<br>Chunk: (${playerChunkX}, ${playerChunkZ})`;
}