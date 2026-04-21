// Frustum culling helper
const cameraFrustum = new THREE.Frustum();
const cameraMatrix = new THREE.Matrix4();

// world.js - World generation, terrain, and chunk management

// Chunk system
const chunkSize = 8;
let renderDistance = 2; // chunks - will be updated by UI slider
const loadedChunks = new Set();
const chunkData = new Map(); // chunkKey -> Map of posKey -> visibleFaces
const chunkMeshes = new Map(); // chunkKey -> array of Meshes
let chunkBuildQueue = [];
let lastChunkScheduleX = null;
let lastChunkScheduleZ = null;

// Perlin noise helper
const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,
    190, 6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,
    74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,
    1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186, 3,64,52,217,226,250,124,123,5,202,
    38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152, 2,44,154,163, 70,221,153,101,155,
    167, 43,172,9,129,22,39,253, 19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,
    81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184, 84,204,176,115,121,50,45,127,  4,150,254,138,236,205,93,222,114,67,
    29,24,72,243,141,128,195,78,66,215,61,156,180];
const p = new Array(512);
for (let i = 0; i < 512; i++) {
    p[i] = permutation[i % 256];
}

function fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t, a, b) {
    return a + t * (b - a);
}

function grad(hash, x, y) {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
}

function perlin2(x, y) {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = fade(xf);
    const v = fade(yf);

    const aa = p[p[xi] + yi];
    const ab = p[p[xi] + yi + 1];
    const ba = p[p[xi + 1] + yi];
    const bb = p[p[xi + 1] + yi + 1];

    const x1 = lerp(u, grad(aa, xf, yf), grad(ba, xf - 1, yf));
    const x2 = lerp(u, grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1));
    return lerp(v, x1, x2);
}

function getTerrainHeight(x, z, chunkX, chunkZ) {
    const chunkOffset = 100;

    // Low frequency noise for gentle hills
    const lowFreq = 0.05;
    const lowAmp = 0.5;
    const noiseLow = perlin2((x + chunkX * chunkOffset) * lowFreq, (z + chunkZ * chunkOffset) * lowFreq);

    // High frequency noise for detailed terrain
    const highFreq = 0.15;
    const highAmp = 1.5;
    const noiseHigh = perlin2((x + chunkX * chunkOffset) * highFreq, (z + chunkZ * chunkOffset) * highFreq);

    // Control noise to decide terrain type (very low frequency for large regions)
    const controlFreq = 0.01;
    const controlNoise = perlin2((x + chunkX * chunkOffset) * controlFreq, (z + chunkZ * chunkOffset) * controlFreq);

    // If control noise is high, use detailed terrain; otherwise use gentle hills
    const useDetailed = controlNoise > 0.2; // 20% of areas will be detailed

    const noiseValue = useDetailed ? noiseHigh : noiseLow;
    const amplitude = useDetailed ? highAmp : lowAmp;

    return Math.round(noiseValue * amplitude);
}

function getChunkKey(cx, cz) {
    return `${cx},${cz}`;
}

// Block type constants
const BLOCK_GRASS = 'grass';
const BLOCK_DIRT = 'dirt';
const BLOCK_STONE = 'stone';

// Block color map
const BLOCK_COLORS = {
    grass: 0x3cb043, // green
    dirt: 0x8B4513,  // brown
    stone: 0x888888, // grey
    glass: 0xB3E5FC  // light blue
};

// Block material cache
const BLOCK_MATERIALS = {
    grass: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS.grass, side: THREE.DoubleSide }),
    dirt: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS.dirt, side: THREE.DoubleSide }),
    stone: new THREE.MeshLambertMaterial({ color: BLOCK_COLORS.stone, side: THREE.DoubleSide }),
    glass: new THREE.MeshLambertMaterial({ 
        color: BLOCK_COLORS.glass, 
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.2
    })
};

function getStableColorFromType(type) {
    let hash = 0;
    for (let i = 0; i < type.length; i++) {
        hash = ((hash << 5) - hash + type.charCodeAt(i)) | 0;
    }

    const r = 96 + (Math.abs(hash) % 128);
    const g = 96 + (Math.abs(hash >> 8) % 128);
    const b = 96 + (Math.abs(hash >> 16) % 128);
    return (r << 16) | (g << 8) | b;
}

function getMaterialForType(type) {
    if (BLOCK_MATERIALS[type]) {
        return BLOCK_MATERIALS[type];
    }

    let color = null;
    if (typeof window !== 'undefined' && window.BLOCK_METADATA && window.BLOCK_METADATA[type] && window.BLOCK_METADATA[type].color) {
        const raw = window.BLOCK_METADATA[type].color;
        if (typeof raw === 'string') {
            color = Number.parseInt(raw.replace('#', ''), 16);
        }
    }

    if (!Number.isFinite(color)) {
        color = getStableColorFromType(type);
    }

    const material = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide });
    BLOCK_MATERIALS[type] = material;
    return material;
}

// Store block types for each position
const blockTypes = new Map(); // posKey -> type
let chunkStorageDisabled = false;

// LocalStorage helpers for chunk save/load
function saveChunkToStorage(chunkX, chunkZ, data, blockTypes) {
    if (chunkStorageDisabled) return;

    const key = `chunk_${chunkX}_${chunkZ}`;
    // Serialize chunk data: { blocks: [[x,y,z,type], ...] }
    const blocks = [];
    for (const [pos, visibleFaces] of data.entries()) {
        const [x, y, z] = pos.split(',').map(Number);
        const type = blockTypes.get(pos);
        blocks.push([x, y, z, type]);
    }

    try {
        localStorage.setItem(key, JSON.stringify({ blocks }));
    } catch (error) {
        // Avoid crashing render loop when storage quota is exhausted.
        if (error && error.name === 'QuotaExceededError') {
            chunkStorageDisabled = true;
            console.warn('[World] Local storage quota exceeded. Chunk persistence disabled for this session.');
            return;
        }
        throw error;
    }
}

function loadChunkFromStorage(chunkX, chunkZ) {
    const key = `chunk_${chunkX}_${chunkZ}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
        const obj = JSON.parse(raw);
        return obj.blocks;
    } catch {
        return null;
    }
}

function isChunkWithinRenderDistance(chunkX, chunkZ, centerChunkX, centerChunkZ) {
    return Math.abs(chunkX - centerChunkX) <= renderDistance && Math.abs(chunkZ - centerChunkZ) <= renderDistance;
}

function isChunkLoaded(chunkX, chunkZ) {
    return loadedChunks.has(getChunkKey(chunkX, chunkZ));
}

function ensureChunkLoaded(chunkX, chunkZ) {
    if (isChunkLoaded(chunkX, chunkZ)) {
        return true;
    }

    loadChunk(chunkX, chunkZ);
    return isChunkLoaded(chunkX, chunkZ);
}

function refreshChunkVisibleFaces(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    const data = chunkData.get(key);
    if (!data) return;

    for (const posKey of data.keys()) {
        const [x, y, z] = posKey.split(',').map(Number);
        data.set(posKey, getVisibleFaces(x, y, z));
    }
}

function rebuildChunkAndLoadedNeighbors(chunkX, chunkZ) {
    const chunksToRebuild = [
        [chunkX, chunkZ],
        [chunkX - 1, chunkZ],
        [chunkX + 1, chunkZ],
        [chunkX, chunkZ - 1],
        [chunkX, chunkZ + 1]
    ];

    for (const [cx, cz] of chunksToRebuild) {
        if (!chunkData.has(getChunkKey(cx, cz))) continue;
        refreshChunkVisibleFaces(cx, cz);
        buildChunkMesh(cx, cz);
    }
}

function rebuildChunkQueue(centerChunkX, centerChunkZ) {
    const nextQueue = [];

    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        for (let dz = -renderDistance; dz <= renderDistance; dz++) {
            const cx = centerChunkX + dx;
            const cz = centerChunkZ + dz;
            if (!loadedChunks.has(getChunkKey(cx, cz))) {
                nextQueue.push({
                    cx,
                    cz,
                    dist: Math.abs(dx) + Math.abs(dz)
                });
            }
        }
    }

    nextQueue.sort((a, b) => a.dist - b.dist);
    chunkBuildQueue = nextQueue;
}

function unloadOutOfRangeChunks(centerChunkX, centerChunkZ) {
    for (const key of [...loadedChunks]) {
        const [cx, cz] = key.split(',').map(Number);
        if (!isChunkWithinRenderDistance(cx, cz, centerChunkX, centerChunkZ)) {
            unloadChunk(cx, cz);
        }
    }
}

function loadChunk(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    if (loadedChunks.has(key)) return;
    loadedChunks.add(key);

    let data = new Map();
    const positions = [];
    // Try to load from storage
    const savedBlocks = loadChunkFromStorage(chunkX, chunkZ);
    if (savedBlocks) {
        for (const [x, y, z, type] of savedBlocks) {
            const posKey = `${x},${y},${z}`;
            blockTypes.set(posKey, type);
            occupied.add(posKey);
            data.set(posKey, []);
            positions.push(posKey);
        }
    } else {
        // Generate new chunk
        const startX = chunkX * chunkSize;
        const startZ = chunkZ * chunkSize;
        for (let x = startX; x < startX + chunkSize; x++) {
            for (let z = startZ; z < startZ + chunkSize; z++) {
                const surfaceY = getTerrainHeight(x, z, chunkX, chunkZ);
                for (let y = surfaceY - 32 + 1; y <= surfaceY; y++) {
                    let type;
                    if (y === surfaceY) {
                        type = BLOCK_GRASS;
                    } else if (y >= surfaceY - 2) {
                        type = BLOCK_DIRT;
                    } else {
                        type = BLOCK_STONE;
                    }
                    const posKey = `${x},${y},${z}`;
                    blockTypes.set(posKey, type);
                    occupied.add(posKey);
                    data.set(posKey, []);
                    positions.push(posKey);
                }
            }
        }
    }

    chunkData.set(key, data);

    for (const posKey of positions) {
        const [x, y, z] = posKey.split(',').map(Number);
        data.set(posKey, getVisibleFaces(x, y, z));
    }

    if (!savedBlocks) {
        saveChunkToStorage(chunkX, chunkZ, data, blockTypes);
    }

    rebuildChunkAndLoadedNeighbors(chunkX, chunkZ);
}

function buildChunkMesh(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    const data = chunkData.get(key);
    if (!data) return;

    // Remove old meshes
    if (chunkMeshes.has(key)) {
        const oldMeshes = chunkMeshes.get(key);
        for (const mesh of oldMeshes) {
            scene.remove(mesh);
            mesh.geometry.dispose();
        }
        chunkMeshes.delete(key);
    }

    // Defensive: skip if BufferGeometryUtils is missing
    if (typeof THREE.BufferGeometryUtils === 'undefined' || typeof THREE.BufferGeometryUtils.mergeBufferGeometries !== 'function') {
        console.error('THREE.BufferGeometryUtils.mergeBufferGeometries is not available!');
        return;
    }

    // Collect geometries by material and modifiers
    // Group by (type + modifiers) so we can apply color/transparency modifiers
    const geometriesByKey = new Map(); // key = "type:modifierSet" or just "type"
    const blocksWithGeomMods = []; // Blocks with scale/rotation modifiers need individual meshes

    for (const [pos, visibleFaces] of data) {
        if (visibleFaces.length === 0) continue;
        const [x, y, z] = pos.split(',').map(Number);
        const type = blockTypes.get(pos) || BLOCK_DIRT;
        
        // Check if block has modifiers
        const modifiers = typeof blockModifiers !== 'undefined' ? blockModifiers.get(pos) : [];
        
        // Check if modifiers include geometry-changing ones (scale, rotation)
        const hasGeometryMods = modifiers && modifiers.some(m => 
            m.startsWith('scale') || m.startsWith('rotate')
        );
        
        if (hasGeometryMods) {
            // Store for individual mesh creation
            blocksWithGeomMods.push({ pos, type, modifiers, visibleFaces });
            continue;
        }
        
        // Only render grass on the top face for grass blocks
        let faces = visibleFaces;
        if (type === BLOCK_GRASS) {
            faces = visibleFaces.filter(f => f !== 'top' ? f !== 'bottom' : true);
            if (visibleFaces.includes('top')) faces = [...faces, 'top'];
        }
        const geometry = createBlockGeometry(faces);
        if (!geometry || !geometry.attributes.position || geometry.attributes.position.count === 0) continue;
        geometry.translate(x, y, z);
        
        // Create a key that includes modifier info for material selection
        const modifierKey = modifiers && modifiers.length > 0 ? modifiers.sort().join(',') : '';
        const groupKey = modifierKey ? `${type}:${modifierKey}` : type;
        
        if (!geometriesByKey.has(groupKey)) {
            geometriesByKey.set(groupKey, { geoms: [], type, modifiers });
        }
        geometriesByKey.get(groupKey).geoms.push(geometry);
    }

    const meshes = [];
    
    // Create merged meshes for blocks without geometry modifiers
    for (const [groupKey, data] of geometriesByKey.entries()) {
        if (data.geoms.length > 0) {
            const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(data.geoms, false);
            let material = getMaterialForType(data.type);
            
            // If block has color modifiers, create a modified material
            if (data.modifiers && data.modifiers.length > 0) {
                material = material.clone();
                
                // Apply color modifiers
                const colorMods = data.modifiers.filter(m => m.startsWith('color'));
                if (colorMods.length > 0) {
                    const colorMap = {
                        colorRed: 0xFF3333,
                        colorGreen: 0x33FF33,
                        colorBlue: 0x3333FF,
                        colorYellow: 0xFFFF33,
                        colorPurple: 0xFF33FF,
                        colorGrey: 0x888888,
                        colorBrown: 0x8B4513
                    };
                    material.color.setHex(colorMap[colorMods[0]] || 0xFFFFFF);
                }
                
                // Apply transparency modifiers
                if (data.modifiers.includes('transparent')) {
                    material.transparent = true;
                    material.opacity = 0.5;
                }
                if (data.modifiers.includes('veryTransparent')) {
                    material.transparent = true;
                    material.opacity = 0.2;
                }
                
                // Apply glow modifiers
                const glowMods = data.modifiers.filter(m => m.startsWith('glow'));
                if (glowMods.length > 0) {
                    const glowMap = {
                        glowRed: 0xFF3333,
                        glowGreen: 0x33FF33,
                        glowBlue: 0x3333FF
                    };
                    material.emissive.setHex(glowMap[glowMods[0]] || 0x000000);
                }
            }
            
            const mesh = new THREE.Mesh(mergedGeometry, material);
            mesh.castShadow = false;
            mesh.receiveShadow = true;
            mesh.visible = true;
            mesh.userData.chunkX = chunkX;
            mesh.userData.chunkZ = chunkZ;
            scene.add(mesh);
            meshes.push(mesh);
        }
    }
    
    // Create individual meshes for blocks with geometry modifiers (scale, rotation)
    for (const blockData of blocksWithGeomMods) {
        const { pos, type, modifiers, visibleFaces } = blockData;
        const [x, y, z] = pos.split(',').map(Number);
        
        let faces = visibleFaces;
        if (type === BLOCK_GRASS) {
            faces = visibleFaces.filter(f => f !== 'top' ? f !== 'bottom' : true);
            if (visibleFaces.includes('top')) faces = [...faces, 'top'];
        }
        
        const geometry = createBlockGeometry(faces);
        if (!geometry || !geometry.attributes.position || geometry.attributes.position.count === 0) continue;
        
        let material = getMaterialForType(type);
        
        // Apply color modifiers to individual mesh material
        if (modifiers && modifiers.length > 0) {
            material = material.clone();
            
            const colorMods = modifiers.filter(m => m.startsWith('color'));
            if (colorMods.length > 0) {
                const colorMap = {
                    colorRed: 0xFF3333,
                    colorGreen: 0x33FF33,
                    colorBlue: 0x3333FF,
                    colorYellow: 0xFFFF33,
                    colorPurple: 0xFF33FF,
                    colorGrey: 0x888888,
                    colorBrown: 0x8B4513
                };
                material.color.setHex(colorMap[colorMods[0]] || 0xFFFFFF);
            }
            
            if (modifiers.includes('transparent')) {
                material.transparent = true;
                material.opacity = 0.5;
            }
            if (modifiers.includes('veryTransparent')) {
                material.transparent = true;
                material.opacity = 0.2;
            }
            
            const glowMods = modifiers.filter(m => m.startsWith('glow'));
            if (glowMods.length > 0) {
                const glowMap = {
                    glowRed: 0xFF3333,
                    glowGreen: 0x33FF33,
                    glowBlue: 0x3333FF
                };
                material.emissive.setHex(glowMap[glowMods[0]] || 0x000000);
            }
        }
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.userData.chunkX = chunkX;
        mesh.userData.chunkZ = chunkZ;
        
        // Apply scale modifiers
        if (modifiers && modifiers.length > 0) {
            if (modifiers.includes('scaleSmall')) mesh.scale.set(0.5, 0.5, 0.5);
            if (modifiers.includes('scaleLarge')) mesh.scale.set(1.5, 1.5, 1.5);
            if (modifiers.includes('scaleHuge')) mesh.scale.set(2, 2, 2);
            
            // Apply rotation modifiers
            if (modifiers.includes('rotateX')) mesh.rotation.x = Math.PI / 4;
            if (modifiers.includes('rotateY')) mesh.rotation.y = Math.PI / 4;
            if (modifiers.includes('rotateZ')) mesh.rotation.z = Math.PI / 4;
            
            // Apply wireframe
            if (modifiers.includes('wireframe')) material.wireframe = true;
        }
        
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.visible = true;
        scene.add(mesh);
        meshes.push(mesh);
    }
    chunkMeshes.set(key, meshes);
}

// Frustum culling for chunk meshes (call each frame)
function updateChunkVisibility() {
    camera.updateMatrix();
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    cameraMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    cameraFrustum.setFromProjectionMatrix(cameraMatrix);
    for (const meshArr of chunkMeshes.values()) {
        for (const mesh of meshArr) {
            // Use chunk center for culling
            const cx = mesh.userData.chunkX * chunkSize + chunkSize / 2;
            const cz = mesh.userData.chunkZ * chunkSize + chunkSize / 2;
            const box = new THREE.Box3().setFromCenterAndSize(
                new THREE.Vector3(cx, 0, cz),
                new THREE.Vector3(chunkSize, 64, chunkSize)
            );
            mesh.visible = cameraFrustum.intersectsBox(box);
        }
    }
}


function unloadChunk(chunkX, chunkZ) {
    const key = getChunkKey(chunkX, chunkZ);
    if (!loadedChunks.has(key)) return;
    loadedChunks.delete(key);

    // Remove meshes
    if (chunkMeshes.has(key)) {
        const meshes = chunkMeshes.get(key);
        for (const mesh of meshes) {
            scene.remove(mesh);
            mesh.geometry.dispose();
        }
        chunkMeshes.delete(key);
    }

    // Remove data and occupied
    const data = chunkData.get(key);
    if (data) {
        for (const pos of data.keys()) {
            occupied.delete(pos);
        }
        chunkData.delete(key);
    }

    // Remove any placed blocks in this chunk
    for (let i = blocks.length - 1; i >= 0; i--) {
        const block = blocks[i];
        const bx = Math.floor(block.position.x / chunkSize);
        const bz = Math.floor(block.position.z / chunkSize);
        if (bx === chunkX && bz === chunkZ) {
            block.geometry.dispose();
            block.material.dispose();
            scene.remove(block);
            occupied.delete(`${block.position.x},${block.position.y},${block.position.z}`);
            blocks.splice(i, 1);
        }
    }

    rebuildChunkAndLoadedNeighbors(chunkX, chunkZ);
}

function updateChunks(forceRefresh = false) {
    const playerPos = controls.getObject().position;
    const playerChunkX = Math.floor(playerPos.x / chunkSize);
    const playerChunkZ = Math.floor(playerPos.z / chunkSize);

    if (forceRefresh || playerChunkX !== lastChunkScheduleX || playerChunkZ !== lastChunkScheduleZ) {
        lastChunkScheduleX = playerChunkX;
        lastChunkScheduleZ = playerChunkZ;
        unloadOutOfRangeChunks(playerChunkX, playerChunkZ);
        rebuildChunkQueue(playerChunkX, playerChunkZ);
    }

    if (chunkBuildQueue.length > 0) {
        const nextChunk = chunkBuildQueue.shift();
        if (
            !loadedChunks.has(getChunkKey(nextChunk.cx, nextChunk.cz)) &&
            isChunkWithinRenderDistance(nextChunk.cx, nextChunk.cz, playerChunkX, playerChunkZ)
        ) {
            loadChunk(nextChunk.cx, nextChunk.cz);
        }
    }

    // Update chunk mesh visibility (frustum culling)
    updateChunkVisibility();
}