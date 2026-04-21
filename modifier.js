// modifier.js - Block modifiers system with LLM integration
// 
// MASTER LIST OF MODIFIERS:
// =========================
// 
// Color Modifiers: colorRed, colorGreen, colorBlue, colorYellow, colorPurple, colorGrey, colorBrown
// Scale Modifiers: scaleSmall (0.5x), scaleLarge (1.5x), scaleHuge (2x)
// Transparency: transparent (50%), veryTransparent (20%)
// Glow: glowRed, glowGreen, glowBlue
// Rotation: rotateX, rotateY, rotateZ
// Display: wireframe
//
// HOW LLM CHOOSES MODIFIERS:
// ==========================
// 
// When a block is placed or crafted, the system asks the LLM:
// "Given this block name and these available modifiers, which modifiers should apply?"
//
// The LLM analyzes the block name and returns appropriate modifier keys.
// Examples:
// - "boulder" → LLM selects: colorGrey, scaleHuge
// - "crystal" → LLM selects: colorBlue, glowBlue, scaleSmall
// - "lava" → LLM selects: colorRed, glowRed
// - "ice" → LLM selects: colorBlue, transparent, veryTransparent
// 
// WORKFLOW:
// =========
// 1. Player crafts blocks (e.g., "dirt" + "stone" = "boulder")
// 2. Block creation calls getModifiersForBlockLLM(blockName)
// 3. LLM receives prompt with block name and available modifiers
// 4. LLM returns comma-separated list of modifier keys
// 5. Modifiers are applied to the block mesh
// 6. Block appears with its LLM-selected visual properties
//
// FALLBACK:
// If LLM is unavailable, falls back to getModifiersForBlock() which uses keyword matching
// ======================================================================================

// Modifier definitions
const MODIFIERS = {
    // Color modifiers
    colorRed: {
        name: 'Red',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0xFF3333);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorGreen: {
        name: 'Green',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0x33FF33);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorBlue: {
        name: 'Blue',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0x3333FF);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorYellow: {
        name: 'Yellow',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0xFFFF33);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorPurple: {
        name: 'Purple',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0xFF33FF);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorGrey: {
        name: 'Grey',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0x888888);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },
    colorBrown: {
        name: 'Brown',
        category: 'Color',
        apply: (block) => {
            if (block.material) {
                block.material.color.setHex(0x8B4513);
                block.material.emissive.setHex(0x000000);
            }
        },
        remove: (block, originalColor) => {
            if (block.material) block.material.color.copy(originalColor);
        }
    },

    // Scale modifiers
    scaleSmall: {
        name: 'Small (0.5x)',
        category: 'Scale',
        apply: (block) => {
            block.scale.set(0.5, 0.5, 0.5);
        },
        remove: (block) => {
            block.scale.set(1, 1, 1);
        }
    },
    scaleLarge: {
        name: 'Large (1.5x)',
        category: 'Scale',
        apply: (block) => {
            block.scale.set(1.5, 1.5, 1.5);
        },
        remove: (block) => {
            block.scale.set(1, 1, 1);
        }
    },
    scaleHuge: {
        name: 'Huge (2x)',
        category: 'Scale',
        apply: (block) => {
            block.scale.set(2, 2, 2);
        },
        remove: (block) => {
            block.scale.set(1, 1, 1);
        }
    },

    // Transparency modifiers
    transparent: {
        name: 'Transparent',
        category: 'Transparency',
        apply: (block) => {
            if (block.material) {
                block.material.transparent = true;
                block.material.opacity = 0.5;
            }
        },
        remove: (block) => {
            if (block.material) {
                block.material.transparent = false;
                block.material.opacity = 1.0;
            }
        }
    },
    veryTransparent: {
        name: 'Very Transparent',
        category: 'Transparency',
        apply: (block) => {
            if (block.material) {
                block.material.transparent = true;
                block.material.opacity = 0.2;
            }
        },
        remove: (block) => {
            if (block.material) {
                block.material.transparent = false;
                block.material.opacity = 1.0;
            }
        }
    },

    // Emission modifiers - much brighter with intensity
    glowRed: {
        name: 'Glow Red',
        category: 'Glow',
        apply: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0xFF3333);
                block.material.emissiveIntensity = 1.5;
            }
        },
        remove: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0x000000);
                block.material.emissiveIntensity = 0;
            }
        }
    },
    glowGreen: {
        name: 'Glow Green',
        category: 'Glow',
        apply: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0x33FF33);
                block.material.emissiveIntensity = 1.5;
            }
        },
        remove: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0x000000);
                block.material.emissiveIntensity = 0;
            }
        }
    },
    glowBlue: {
        name: 'Glow Blue',
        category: 'Glow',
        apply: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0x3333FF);
                block.material.emissiveIntensity = 1.5;
            }
        },
        remove: (block) => {
            if (block.material) {
                block.material.emissive.setHex(0x000000);
                block.material.emissiveIntensity = 0;
            }
        }
    },

    // Rotation modifiers
    rotateX: {
        name: 'Rotate X',
        category: 'Rotation',
        apply: (block) => {
            block.rotation.x = Math.PI / 4;
        },
        remove: (block) => {
            block.rotation.x = 0;
        }
    },
    rotateY: {
        name: 'Rotate Y',
        category: 'Rotation',
        apply: (block) => {
            block.rotation.y = Math.PI / 4;
        },
        remove: (block) => {
            block.rotation.y = 0;
        }
    },
    rotateZ: {
        name: 'Rotate Z',
        category: 'Rotation',
        apply: (block) => {
            block.rotation.z = Math.PI / 4;
        },
        remove: (block) => {
            block.rotation.z = 0;
        }
    },

    // Wireframe modifier
    wireframe: {
        name: 'Wireframe',
        category: 'Display',
        apply: (block) => {
            if (block.material) block.material.wireframe = true;
        },
        remove: (block) => {
            if (block.material) block.material.wireframe = false;
        }
    }
};

// ============================================================================
// MODIFIER MAPPING FOR LLM BLOCKS
// ============================================================================

// Maps block names/keywords to modifier sets
const BLOCK_MODIFIER_MAPPINGS = {
    // Gemstones and crystals
    crystal: ['colorBlue', 'glowBlue', 'scaleSmall'],
    amethyst: ['colorPurple', 'glowBlue'],
    ruby: ['colorRed', 'glowRed'],
    emerald: ['colorGreen', 'glowGreen'],
    sapphire: ['colorBlue', 'glowBlue'],
    diamond: ['colorBlue', 'transparent'],
    
    // Large natural features
    boulder: ['colorGrey', 'scaleHuge'],
    mountain: ['colorGrey', 'scaleHuge'],
    rock: ['colorGrey', 'scaleLarge'],
    cliff: ['colorGrey', 'scaleHuge'],
    
    // Magical/special blocks
    lava: ['colorRed', 'glowRed'],
    magma: ['colorRed', 'glowRed', 'scaleLarge'],
    ice: ['colorBlue', 'transparent', 'veryTransparent'],
    obsidian: ['colorPurple', 'scaleSmall'],
    gold: ['colorYellow', 'glowGreen'],
    ore: ['colorGrey', 'scaleLarge'],
    
    // Organic materials
    wood: ['colorBrown'],
    tree: ['colorBrown', 'scaleHuge'],
    leaves: ['colorGreen'],
    moss: ['colorGreen'],
    
    // Metal and crafted
    metal: ['colorGrey', 'wireframe'],
    steel: ['colorGrey', 'scaleSmall'],
    iron: ['colorGrey'],
    copper: ['colorBrown', 'glowGreen'],
    
    // Mixed/composite blocks
    gravel: ['colorGrey', 'scaleSmall'],
    sand: ['colorYellow', 'scaleSmall'],
    mud: ['colorBrown', 'scaleSmall'],
    clay: ['colorBrown'],
    brick: ['colorRed', 'scaleSmall'],
    
    // Special compounds
    glowstone: ['colorYellow', 'glowGreen'],
    inferno: ['colorRed', 'glowRed', 'scaleHuge'],
    frozen: ['colorBlue', 'transparent'],
    mystic: ['colorPurple', 'transparent'],
    prismatic: ['colorBlue', 'glowBlue', 'glowGreen'],
    
    // Transparent/Decorative
    glass: ['colorBlue', 'transparent', 'veryTransparent']
};

// Get modifiers for a block by keyword matching
function getModifiersForBlock(blockName) {
    blockName = blockName.toLowerCase();
    
    // Exact match
    if (BLOCK_MODIFIER_MAPPINGS[blockName]) {
        return BLOCK_MODIFIER_MAPPINGS[blockName];
    }
    
    // Keyword matching (best match first)
    const keywords = Object.keys(BLOCK_MODIFIER_MAPPINGS);
    for (const keyword of keywords) {
        if (blockName.includes(keyword)) {
            return BLOCK_MODIFIER_MAPPINGS[keyword];
        }
    }
    
    // Reverse keyword matching
    for (const keyword of keywords) {
        if (keyword.includes(blockName)) {
            return BLOCK_MODIFIER_MAPPINGS[keyword];
        }
    }
    
    return [];
}

// Get modifiers from LLM (async version)
async function getModifiersForBlockLLM(blockName) {
    // First try to get LLM service
    if (!window.llmService) {
        console.log(`[Modifiers] No LLM service, using fallback for "${blockName}"`);
        return getModifiersForBlock(blockName);
    }

    try {
        // Get available modifiers list
        const modifierKeys = Object.keys(MODIFIERS);
        const modifierDescriptions = modifierKeys.map(key => {
            const m = MODIFIERS[key];
            return `- ${key}: ${m.name} (${m.category})`;
        }).join('\n');

        const prompt = `You are analyzing a Minecraft-like block name and deciding which visual modifiers to apply.

Block Name: "${blockName}"

Available Modifiers:
${modifierDescriptions}

Based on the block name "${blockName}", decide which modifiers should be applied to it. Consider:
- Color/appearance modifiers that match the material
- Scale modifiers that match typical size
- Special effects like glow or transparency

Respond with ONLY a comma-separated list of modifier keys from the list above. Example: colorRed,scaleLarge,glowRed

If none apply, respond with: none`;

        console.log(`[Modifiers] Asking LLM about modifiers for "${blockName}"`);
        const response = await window.llmService.callOllama(prompt);
        
        // Parse response
        const modifiersStr = response.trim().toLowerCase();
        
        if (modifiersStr === 'none') {
            console.log(`[Modifiers] LLM returned no modifiers for "${blockName}"`);
            return [];
        }

        // Parse comma-separated list
        const selectedModifiers = modifiersStr
            .split(',')
            .map(m => m.trim())
            .filter(m => m.length > 0 && MODIFIERS[m]); // Validate each modifier exists

        console.log(`[Modifiers] LLM selected modifiers for "${blockName}":`, selectedModifiers);
        return selectedModifiers;

    } catch (error) {
        console.error(`[Modifiers] LLM error for "${blockName}":`, error);
        // Fallback to keyword matching
        return getModifiersForBlock(blockName);
    }
}

// Get description of what modifiers will be applied (for UI display)
function getModifierDescriptionForBlock(blockName) {
    const modifiers = getModifiersForBlock(blockName);
    if (modifiers.length === 0) return 'No modifiers';
    
    return modifiers
        .map(key => MODIFIERS[key]?.name || key)
        .join(', ');
}

// Get description from LLM (async)
async function getModifierDescriptionForBlockLLM(blockName) {
    const modifiers = await getModifiersForBlockLLM(blockName);
    if (modifiers.length === 0) return 'No modifiers';
    
    return modifiers
        .map(key => MODIFIERS[key]?.name || key)
        .join(', ');
}

// ============================================================================
// DEBUG MENU
// ============================================================================

// Apply modifiers to a world block
function applyModifiersToBlock(block, modifierKeys) {
    if (!block || !block.material) return false;
    
    modifierKeys = modifierKeys || [];
    let applied = 0;
    
    for (const key of modifierKeys) {
        if (MODIFIERS[key]) {
            MODIFIERS[key].apply(block);
            applied++;
        }
    }
    
    return applied > 0;
}

// Reset the world - clears all blocks and terrain
function resetWorld() {
    console.log('[DEBUG] Resetting world...');
    
    // Clear blocks
    if (typeof occupied !== 'undefined') {
        occupied.clear();
    }
    
    if (typeof blockTypes !== 'undefined') {
        blockTypes.clear();
    }
    
    if (typeof blockModifiers !== 'undefined') {
        blockModifiers.clear();
    }
    
    // Clear blocks array
    if (typeof blocks !== 'undefined') {
        blocks.length = 0;
    }
    
    // Clear chunk data
    if (typeof chunkData !== 'undefined') {
        chunkData.forEach(chunk => chunk.clear());
        chunkData.clear();
    }
    
    // Remove chunk meshes from scene
    if (typeof chunkMeshes !== 'undefined') {
        chunkMeshes.forEach(meshArray => {
            if (Array.isArray(meshArray)) {
                meshArray.forEach(mesh => {
                    if (mesh && typeof scene !== 'undefined') {
                        scene.remove(mesh);
                        if (mesh.geometry) mesh.geometry.dispose();
                        if (mesh.material) mesh.material.dispose();
                    }
                });
            }
        });
        chunkMeshes.clear();
    }
    
    // Clear loaded chunks
    if (typeof loadedChunks !== 'undefined') {
        loadedChunks.clear();
    }
    
    // Clear localStorage
    indexedDB.databases().then(dbs => {
        dbs.forEach(db => {
            indexedDB.deleteDatabase(db.name);
        });
    });
    
    // Clear browser storage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('[DEBUG] World reset complete');
    updateDebugStatus('World reset - rebuilding terrain...');
    
    // Rebuild chunks from scratch if the function exists
    if (typeof updateChunks === 'function') {
        updateChunks(true);
        console.log('[DEBUG] Chunks updated');
    }
}

// Get modifiers for LLM-generated blocks and apply them
function applyModifiersForBlockName(block, blockName) {
    const modifiers = getModifiersForBlock(blockName);
    if (modifiers.length > 0) {
        console.log(`[MODIFIERS] Applying ${modifiers.length} modifiers to "${blockName}":`, modifiers);
        return applyModifiersToBlock(block, modifiers);
    }
    return false;
}

// Store applied modifiers on blocks for tracking
function setBlockModifiers(block, modifierKeys) {
    if (!block) return;
    block.userData = block.userData || {};
    block.userData.appliedModifiers = modifierKeys;
}

// Get applied modifiers from a block
function getBlockModifiers(block) {
    if (!block || !block.userData) return [];
    return block.userData.appliedModifiers || [];
}

// Debug state
let debugMenu = null;
let debugBlockTestBlock = null;
let appliedModifiers = new Set();
let originalBlockColor = null;

// Create debug menu UI
function createDebugMenu() {
    const menu = document.createElement('div');
    menu.id = 'debugMenu';
    menu.style.position = 'fixed';
    menu.style.right = '10px';
    menu.style.top = '10px';
    menu.style.width = '280px';
    menu.style.maxHeight = '80vh';
    menu.style.background = 'rgba(20, 20, 20, 0.95)';
    menu.style.border = '2px solid #00FF00';
    menu.style.borderRadius = '8px';
    menu.style.padding = '12px';
    menu.style.color = '#00FF00';
    menu.style.fontFamily = 'monospace';
    menu.style.fontSize = '12px';
    menu.style.overflowY = 'auto';
    menu.style.zIndex = '300';
    menu.style.display = 'none';
    menu.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.3)';

    // Title with close button
    const titleBar = document.createElement('div');
    titleBar.style.display = 'flex';
    titleBar.style.justifyContent = 'space-between';
    titleBar.style.alignItems = 'center';
    titleBar.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.innerHTML = '=== MODIFIER DEBUG ===';
    title.style.fontWeight = 'bold';
    title.style.flex = '1';
    titleBar.appendChild(title);

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.color = '#00FF00';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '16px';
    closeBtn.style.padding = '0 4px';
    closeBtn.onclick = () => toggleDebugMenu();
    titleBar.appendChild(closeBtn);

    menu.appendChild(titleBar);

    // Status
    const status = document.createElement('div');
    status.id = 'debugStatus';
    status.innerHTML = 'Status: Ready<br>Applied: 0 modifiers';
    status.style.marginBottom = '10px';
    status.style.padding = '8px';
    status.style.background = 'rgba(0, 0, 0, 0.5)';
    status.style.borderRadius = '4px';
    status.style.lineHeight = '1.4';
    menu.appendChild(status);

    // Control buttons
    const controlDiv = document.createElement('div');
    controlDiv.style.marginBottom = '10px';
    controlDiv.style.display = 'flex';
    controlDiv.style.gap = '5px';
    controlDiv.style.flexWrap = 'wrap';

    const placeBtn = document.createElement('button');
    placeBtn.innerHTML = 'Place Test Block';
    placeBtn.style.padding = '6px 8px';
    placeBtn.style.backgroundColor = '#00AA00';
    placeBtn.style.color = '#000';
    placeBtn.style.border = '1px solid #00FF00';
    placeBtn.style.borderRadius = '4px';
    placeBtn.style.cursor = 'pointer';
    placeBtn.style.fontSize = '11px';
    placeBtn.style.fontWeight = 'bold';
    placeBtn.style.flex = '1';
    placeBtn.onclick = placeTestBlock;
    controlDiv.appendChild(placeBtn);

    const clearBtn = document.createElement('button');
    clearBtn.innerHTML = 'Clear All';
    clearBtn.style.padding = '6px 8px';
    clearBtn.style.backgroundColor = '#AA0000';
    clearBtn.style.color = '#FFF';
    clearBtn.style.border = '1px solid #FF0000';
    clearBtn.style.borderRadius = '4px';
    clearBtn.style.cursor = 'pointer';
    clearBtn.style.fontSize = '11px';
    clearBtn.style.fontWeight = 'bold';
    clearBtn.style.flex = '1';
    clearBtn.onclick = clearAllModifiers;
    controlDiv.appendChild(clearBtn);

    const resetWorldBtn = document.createElement('button');
    resetWorldBtn.innerHTML = '🌍 Reset World';
    resetWorldBtn.style.padding = '6px 8px';
    resetWorldBtn.style.backgroundColor = '#FF6600';
    resetWorldBtn.style.color = '#FFF';
    resetWorldBtn.style.border = '1px solid #FFAA00';
    resetWorldBtn.style.borderRadius = '4px';
    resetWorldBtn.style.cursor = 'pointer';
    resetWorldBtn.style.fontSize = '11px';
    resetWorldBtn.style.fontWeight = 'bold';
    resetWorldBtn.style.flex = '1';
    resetWorldBtn.onclick = () => {
        if (confirm('Are you sure you want to reset the world? This cannot be undone.')) {
            resetWorld();
        }
    };
    controlDiv.appendChild(resetWorldBtn);

    menu.appendChild(controlDiv);

    // Add LLM block modifier preview section
    const previewSection = document.createElement('div');
    previewSection.style.marginBottom = '10px';
    previewSection.style.padding = '8px';
    previewSection.style.background = 'rgba(0, 0, 0, 0.5)';
    previewSection.style.borderRadius = '4px';
    previewSection.style.borderLeft = '2px solid #00FF88';

    const previewTitle = document.createElement('div');
    previewTitle.innerHTML = '📦 LLM Block Preview';
    previewTitle.style.fontWeight = 'bold';
    previewTitle.style.marginBottom = '6px';
    previewTitle.style.color = '#00FF88';
    previewSection.appendChild(previewTitle);

    const previewInput = document.createElement('input');
    previewInput.type = 'text';
    previewInput.placeholder = 'Enter block name...';
    previewInput.style.width = '100%';
    previewInput.style.padding = '4px';
    previewInput.style.backgroundColor = '#000000';
    previewInput.style.color = '#00FF00';
    previewInput.style.border = '1px solid #00AA00';
    previewInput.style.borderRadius = '3px';
    previewInput.style.marginBottom = '6px';
    previewInput.style.fontFamily = 'monospace';
    previewInput.style.fontSize = '11px';

    const previewResult = document.createElement('div');
    previewResult.style.fontSize = '10px';
    previewResult.style.color = '#00CCAA';
    previewResult.style.padding = '4px';
    previewResult.style.background = 'rgba(0, 0, 0, 0.3)';
    previewResult.style.borderRadius = '3px';
    previewResult.innerHTML = 'No block entered';

    previewInput.oninput = async () => {
        if (previewInput.value.trim()) {
            previewResult.innerHTML = `<em>Asking LLM...</em>`;
            try {
                const description = await getModifierDescriptionForBlockLLM(previewInput.value);
                previewResult.innerHTML = `<strong>${previewInput.value}</strong><br>${description}`;
            } catch (error) {
                previewResult.innerHTML = `<strong>${previewInput.value}</strong><br><em>Error: ${error.message}</em>`;
            }
        } else {
            previewResult.innerHTML = 'No block entered';
        }
    };

    previewSection.appendChild(previewInput);
    previewSection.appendChild(previewResult);
    menu.appendChild(previewSection);

    // Modifiers by category
    const categories = {};
    for (const [key, modifier] of Object.entries(MODIFIERS)) {
        if (!categories[modifier.category]) {
            categories[modifier.category] = [];
        }
        categories[modifier.category].push([key, modifier]);
    }

    // Create modifier buttons grouped by category
    for (const [category, modifiers] of Object.entries(categories)) {
        const categoryDiv = document.createElement('div');
        categoryDiv.style.marginBottom = '10px';

        const catTitle = document.createElement('div');
        catTitle.innerHTML = `▸ ${category}`;
        catTitle.style.fontWeight = 'bold';
        catTitle.style.marginBottom = '6px';
        catTitle.style.color = '#00FF88';
        categoryDiv.appendChild(catTitle);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.flexDirection = 'column';
        buttonContainer.style.gap = '4px';

        for (const [key, modifier] of modifiers) {
            const btn = document.createElement('button');
            btn.innerHTML = modifier.name;
            btn.dataset.modifier = key;
            btn.style.padding = '4px 6px';
            btn.style.backgroundColor = '#1a1a1a';
            btn.style.color = '#00FF00';
            btn.style.border = '1px solid #00AA00';
            btn.style.borderRadius = '3px';
            btn.style.cursor = 'pointer';
            btn.style.fontSize = '11px';
            btn.style.textAlign = 'left';
            btn.style.transition = 'all 0.2s';

            btn.onmouseover = () => {
                if (appliedModifiers.has(key)) {
                    btn.style.backgroundColor = '#00AA00';
                    btn.style.color = '#000';
                } else {
                    btn.style.backgroundColor = '#003300';
                }
            };
            btn.onmouseout = () => {
                if (appliedModifiers.has(key)) {
                    btn.style.backgroundColor = '#006600';
                    btn.style.color = '#00FF00';
                } else {
                    btn.style.backgroundColor = '#1a1a1a';
                    btn.style.color = '#00FF00';
                }
            };

            btn.onclick = () => toggleModifier(key);

            buttonContainer.appendChild(btn);
        }

        categoryDiv.appendChild(buttonContainer);
        menu.appendChild(categoryDiv);
    }

    document.body.appendChild(menu);
    return menu;
}

// Toggle debug menu visibility
function toggleDebugMenu() {
    if (!debugMenu) {
        debugMenu = createDebugMenu();
    }
    const isHidden = debugMenu.style.display === 'none';
    debugMenu.style.display = isHidden ? 'block' : 'none';
    console.log('[DEBUG] Menu toggled:', isHidden ? 'OPEN' : 'CLOSED');
}

// Place a test block at player position
function placeTestBlock() {
    // Get player position from camera controls
    if (!controls) {
        console.error('[DEBUG] Controls not loaded yet');
        updateDebugStatus('Controls not loaded!');
        return;
    }

    const playerPos = controls.getObject().position;
    console.log('[DEBUG] Player position:', playerPos.x, playerPos.y, playerPos.z);

    // Place block in front of player (3 units forward)
    const forwardDist = 3;
    const testX = Math.round(playerPos.x + Math.cos(camera.rotation.order) * forwardDist);
    const testY = Math.round(playerPos.y);
    const testZ = Math.round(playerPos.z + Math.sin(camera.rotation.order) * forwardDist);

    // Simpler placement: just place it slightly forward on Z
    const testX2 = Math.round(playerPos.x);
    const testY2 = Math.round(playerPos.y - 1); // 1 unit below eye level
    const testZ2 = Math.round(playerPos.z + 3); // 3 units in front

    console.log('[DEBUG] Placing test block at:', testX2, testY2, testZ2);

    // Remove old test block if exists
    if (debugBlockTestBlock) {
        scene.remove(debugBlockTestBlock);
        if (debugBlockTestBlock.geometry) debugBlockTestBlock.geometry.dispose();
        if (debugBlockTestBlock.material) debugBlockTestBlock.material.dispose();
        debugBlockTestBlock = null;
    }

    // Create test block as a three.js mesh (not in the world blocks array)
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
        color: 0xCCCCCC,  // Light gray for color modifiers to be clearly visible
        side: THREE.DoubleSide,
        emissive: 0x000000,
        emissiveIntensity: 0,
        shininess: 100
    });
    debugBlockTestBlock = new THREE.Mesh(geometry, material);
    debugBlockTestBlock.position.set(testX2, testY2, testZ2);
    debugBlockTestBlock.castShadow = false;
    debugBlockTestBlock.receiveShadow = false;
    scene.add(debugBlockTestBlock);

    console.log('[DEBUG] Test block created and added to scene');

    // Store original color
    originalBlockColor = new THREE.Color(0xCCCCCC);

    // Clear applied modifiers
    appliedModifiers.clear();

    // Update UI
    updateDebugStatus('Block placed at ' + testX2 + ', ' + testY2 + ', ' + testZ2);
    updateModifierButtons();
}

// Toggle a modifier on/off
function toggleModifier(modifierKey) {
    if (!debugBlockTestBlock) {
        updateDebugStatus('No test block placed!');
        return;
    }

    if (appliedModifiers.has(modifierKey)) {
        // Remove modifier
        appliedModifiers.delete(modifierKey);
        const modifier = MODIFIERS[modifierKey];
        modifier.remove(debugBlockTestBlock, originalBlockColor);
        updateDebugStatus(`Removed: ${modifier.name}`);
    } else {
        // Apply modifier
        appliedModifiers.add(modifierKey);
        const modifier = MODIFIERS[modifierKey];
        modifier.apply(debugBlockTestBlock);
        updateDebugStatus(`Applied: ${modifier.name}`);
    }

    updateModifierButtons();
}

// Clear all modifiers from test block
function clearAllModifiers() {
    if (!debugBlockTestBlock) {
        updateDebugStatus('No test block placed!');
        return;
    }

    // Remove all modifiers
    for (const key of appliedModifiers) {
        const modifier = MODIFIERS[key];
        modifier.remove(debugBlockTestBlock, originalBlockColor);
    }
    appliedModifiers.clear();

    // Reset block appearance
    if (debugBlockTestBlock.material) {
        debugBlockTestBlock.material.color.copy(originalBlockColor);
    }
    debugBlockTestBlock.scale.set(1, 1, 1);
    debugBlockTestBlock.rotation.set(0, 0, 0);

    updateDebugStatus('All modifiers cleared');
    updateModifierButtons();
}

// Update debug status display
function updateDebugStatus(message) {
    const status = document.getElementById('debugStatus');
    if (status) {
        const blockInfo = debugBlockTestBlock ? 'Block: Active' : 'Block: None';
        status.innerHTML = `Status: ${message}<br>${blockInfo}<br>Applied: ${appliedModifiers.size} modifiers`;
    }
}

// Update modifier button visual states
function updateModifierButtons() {
    const buttons = document.querySelectorAll('#debugMenu button[data-modifier]');
    buttons.forEach(btn => {
        const key = btn.dataset.modifier;
        if (appliedModifiers.has(key)) {
            btn.style.backgroundColor = '#006600';
            btn.style.color = '#00FF00';
            btn.style.fontWeight = 'bold';
        } else {
            btn.style.backgroundColor = '#1a1a1a';
            btn.style.color = '#00FF00';
            btn.style.fontWeight = 'normal';
        }
    });
}

// Initialize modifier system after game loads
function initializeModifierSystem() {
    console.log('[DEBUG] Initializing modifier system...');
    if (!debugMenu) {
        debugMenu = createDebugMenu();
        updateDebugStatus('Ready (Press F4 to toggle)');
    }
    
    // Create fallback button in case F4 doesn't work
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'modifierToggleBtn';
    toggleBtn.innerHTML = '🔧 Debug';
    toggleBtn.style.position = 'fixed';
    toggleBtn.style.right = '10px';
    toggleBtn.style.bottom = '10px';
    toggleBtn.style.padding = '8px 12px';
    toggleBtn.style.backgroundColor = '#00AA00';
    toggleBtn.style.color = '#000';
    toggleBtn.style.border = '2px solid #00FF00';
    toggleBtn.style.borderRadius = '6px';
    toggleBtn.style.cursor = 'pointer';
    toggleBtn.style.fontSize = '12px';
    toggleBtn.style.fontWeight = 'bold';
    toggleBtn.style.zIndex = '299';
    toggleBtn.style.transition = 'all 0.2s';
    toggleBtn.onmouseover = () => {
        toggleBtn.style.backgroundColor = '#00FF00';
        toggleBtn.style.color = '#000';
    };
    toggleBtn.onmouseout = () => {
        toggleBtn.style.backgroundColor = '#00AA00';
    };
    toggleBtn.onclick = toggleDebugMenu;
    document.body.appendChild(toggleBtn);
    
    console.log('[DEBUG] Modifier system ready!');
}

// Add keyboard listener for F4 (after game loads)
function setupModifierKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'F4' || e.key === 'F4') {
            e.preventDefault();
            console.log('[DEBUG] F4 pressed - toggleDebugMenu');
            toggleDebugMenu();
        }
    }, true);
    console.log('[DEBUG] Modifier keyboard listener attached');
}

// Initialize when game.js animate() starts
const originalInit = (typeof init !== 'undefined') ? init : null;
init = function() {
    if (originalInit) originalInit();
    initializeModifierSystem();
    setupModifierKeyboard();
};

// Fallback: initialize on window load
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!debugMenu) {
            console.log('[DEBUG] Fallback initialization...');
            initializeModifierSystem();
            setupModifierKeyboard();
        }
    }, 100);
});
