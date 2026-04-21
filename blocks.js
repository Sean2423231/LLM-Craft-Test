// blocks.js - Block creation, placement, removal, and collision

// Blocks array
const blocks = [];
const blockSize = 1;
const occupied = new Set();
const blockModifiers = new Map(); // Store modifiers for each block position

// Block placement preview outline
const previewMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const previewGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(blockSize, blockSize, blockSize));
const previewOutline = new THREE.LineSegments(previewGeometry, previewMaterial);
previewOutline.visible = false;
scene.add(previewOutline);

// Function to create block geometry for visible faces only
function createBlockGeometry(visibleFaces) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const normals = [];
    const indices = [];
    let vertexIndex = 0;

    const faceData = {
        front: {
            positions: [
                -0.5, -0.5, 0.5,
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
                -0.5, 0.5, 0.5
            ],
            normal: [0, 0, 1]
        },
        back: {
            positions: [
                0.5, -0.5, -0.5,
                -0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                0.5, 0.5, -0.5
            ],
            normal: [0, 0, -1]
        },
        left: {
            positions: [
                -0.5, -0.5, -0.5,
                -0.5, 0.5, -0.5,
                -0.5, 0.5, 0.5,
                -0.5, -0.5, 0.5
            ],
            normal: [-1, 0, 0]
        },
        right: {
            positions: [
                0.5, -0.5, 0.5,
                0.5, 0.5, 0.5,
                0.5, 0.5, -0.5,
                0.5, -0.5, -0.5
            ],
            normal: [1, 0, 0]
        },
        top: {
            positions: [
                -0.5, 0.5, 0.5,
                0.5, 0.5, 0.5,
                0.5, 0.5, -0.5,
                -0.5, 0.5, -0.5
            ],
            normal: [0, 1, 0]
        },
        bottom: {
            positions: [
                -0.5, -0.5, -0.5,
                0.5, -0.5, -0.5,
                0.5, -0.5, 0.5,
                -0.5, -0.5, 0.5
            ],
            normal: [0, -1, 0]
        }
    };

    for (const face of visibleFaces) {
        const data = faceData[face];
        positions.push(...data.positions);
        for (let i = 0; i < 4; i++) {
            normals.push(...data.normal);
        }
        indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
        indices.push(vertexIndex, vertexIndex + 2, vertexIndex + 3);
        vertexIndex += 4;
    }

    if (positions.length === 0) {
        return geometry;
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setIndex(indices);
    return geometry;
}

function getVisibleFaces(x, y, z) {
    const visibleFaces = [];
    if (!isOccupied(x, y, z + blockSize)) visibleFaces.push('front');
    if (!isOccupied(x, y, z - blockSize)) visibleFaces.push('back');
    if (!isOccupied(x - blockSize, y, z)) visibleFaces.push('left');
    if (!isOccupied(x + blockSize, y, z)) visibleFaces.push('right');
    if (!isOccupied(x, y + blockSize, z)) visibleFaces.push('top');
    // Only add bottom face if not covered (air below)
    if (!isOccupied(x, y - blockSize, z)) visibleFaces.push('bottom');
    return visibleFaces;
}

// Function to check if a position is occupied
function isOccupied(x, y, z) {
    return occupied.has(`${x},${y},${z}`);
}

// Function to update a block's geometry
function updateBlockGeometry(block) {
    const visibleFaces = getVisibleFaces(block.position.x, block.position.y, block.position.z);
    block.geometry.dispose();
    block.geometry = createBlockGeometry(visibleFaces);
    block.visible = visibleFaces.length > 0;
}

function updateAdjacent(x, y, z) {
    if (occupied.has(`${x},${y},${z}`)) {
        const block = blocks.find(b => b.position.x === x && b.position.y === y && b.position.z === z);
        if (block) {
            updateBlockGeometry(block);
        }
    }
}

function createBlock(x, y, z, type) {
    const chunkX = Math.floor(x / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    if (typeof ensureChunkLoaded === 'function' && !ensureChunkLoaded(chunkX, chunkZ)) {
        return;
    }

    const chunkKey = getChunkKey(chunkX, chunkZ);
    const chunkMap = chunkData.get(chunkKey);
    if (!chunkMap) return;

    const posKey = `${x},${y},${z}`;
    if (typeof blockTypes !== 'undefined') blockTypes.set(posKey, type);
    occupied.add(posKey);
    chunkMap.set(posKey, []);

    // Build chunk first for initial visibility
    if (typeof rebuildChunkAndLoadedNeighbors === 'function') {
        rebuildChunkAndLoadedNeighbors(chunkX, chunkZ);
    } else {
        buildChunkMesh(chunkX, chunkZ);
    }

    // Apply modifiers for this block type if they exist (async LLM call)
    // After modifiers arrive, rebuild the chunk to apply them
    if (typeof window.getModifiersForBlockLLM === 'function') {
        window.getModifiersForBlockLLM(type).then(modifiers => {
            if (modifiers && modifiers.length > 0) {
                blockModifiers.set(posKey, modifiers);
                console.log(`[Blocks] Applied ${modifiers.length} modifiers to "${type}" at ${posKey}:`, modifiers);
                
                // Rebuild chunk to apply modifier effects (colors, transparency, etc.)
                if (typeof rebuildChunkAndLoadedNeighbors === 'function') {
                    rebuildChunkAndLoadedNeighbors(chunkX, chunkZ);
                } else {
                    buildChunkMesh(chunkX, chunkZ);
                }
            }
        }).catch(error => {
            console.error(`[Blocks] Error getting modifiers for "${type}":`, error);
        });
    }

    saveChunkToStorage(chunkX, chunkZ, chunkMap, blockTypes);
}

function removeBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    if (!occupied.has(key)) return;

    const chunkX = Math.floor(x / chunkSize);
    const chunkZ = Math.floor(z / chunkSize);
    if (typeof ensureChunkLoaded === 'function' && !ensureChunkLoaded(chunkX, chunkZ)) {
        return;
    }

    const removedType = typeof blockTypes !== 'undefined' ? blockTypes.get(key) : null;
    occupied.delete(key);
    
    // Clean up modifiers
    blockModifiers.delete(key);

    const chunkKey = getChunkKey(chunkX, chunkZ);
    if (chunkData.has(chunkKey)) {
        const data = chunkData.get(chunkKey);
        const posKey = `${x},${y},${z}`;
        if (data.has(posKey)) {
            data.delete(posKey);
        }

        if (typeof rebuildChunkAndLoadedNeighbors === 'function') {
            rebuildChunkAndLoadedNeighbors(chunkX, chunkZ);
        } else {
            buildChunkMesh(chunkX, chunkZ);
        }

        saveChunkToStorage(chunkX, chunkZ, data, blockTypes);
    }

    if (typeof blockTypes !== 'undefined') blockTypes.delete(key);

    const blockIndex = blocks.findIndex(b => b.position.x === x && b.position.y === y && b.position.z === z);
    if (blockIndex !== -1) {
        const block = blocks[blockIndex];
        block.geometry.dispose();
        block.material.dispose();
        scene.remove(block);
        blocks.splice(blockIndex, 1);
    }

    if (removedType && typeof window.addInventoryItem === 'function') {
        window.addInventoryItem(removedType, 1);
    }
}

function getTargetBlockPosition() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const start = controls.getObject().position.clone();
    for (let distance = 1; distance <= 5; distance += 0.5) {
        const position = start.clone().add(direction.clone().multiplyScalar(distance));
        const x = Math.round(position.x / blockSize) * blockSize;
        const y = Math.round(position.y / blockSize) * blockSize;
        const z = Math.round(position.z / blockSize) * blockSize;
        if (isOccupied(x, y, z)) {
            return { x, y, z };
        }
    }
    return null;
}

function getPlacementPosition() {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    const position = controls.getObject().position.clone().add(direction.multiplyScalar(1));
    return {
        x: Math.round(position.x / blockSize) * blockSize,
        y: Math.round(position.y / blockSize) * blockSize,
        z: Math.round(position.z / blockSize) * blockSize
    };
}

function updatePreview() {
    const target = getPlacementPosition();
    if (target && !isOccupied(target.x, target.y, target.z) && isAdjacentToOccupied(target.x, target.y, target.z)) {
        previewOutline.position.set(target.x, target.y, target.z);
        previewOutline.visible = true;
    } else {
        previewOutline.visible = false;
    }
}

// Function to check if a position is adjacent to any occupied block
function isAdjacentToOccupied(x, y, z) {
    const directions = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]
    ];
    for (const [dx, dy, dz] of directions) {
        if (isOccupied(x + dx * blockSize, y + dy * blockSize, z + dz * blockSize)) return true;
    }
    return false;
}

function isPlayerColliding(nextPosition) {
    const playerMinY = nextPosition.y - playerHeight / 2;
    const playerMaxY = nextPosition.y + playerHeight / 2;

    // Only check blocks with visible faces
    const visibleBlocks = getCollisionBlocks();
    for (const pos of visibleBlocks) {
        const [x, y, z] = pos.split(',').map(Number);

        const blockMinY = y - 0.5;
        const blockMaxY = y + 0.5;

        // Check vertical overlap
        if (playerMinY > blockMaxY || playerMaxY < blockMinY) {
            continue;
        }

        const minX = x - 0.5 - playerRadius;
        const maxX = x + 0.5 + playerRadius;
        const minZ = z - 0.5 - playerRadius;
        const maxZ = z + 0.5 + playerRadius;

        if (nextPosition.x >= minX && nextPosition.x <= maxX && nextPosition.z >= minZ && nextPosition.z <= maxZ) {
            return true;
        }
    }
    return false;
}

function doesBlockCollideWithPlayer(blockX, blockY, blockZ) {
    const playerPos = controls.getObject().position;
    const playerMinY = playerPos.y - playerHeight / 2;
    const playerMaxY = playerPos.y + playerHeight / 2;

    const blockMinY = blockY - 0.5;
    const blockMaxY = blockY + 0.5;

    // Check vertical overlap
    if (playerMinY > blockMaxY || playerMaxY < blockMinY) {
        return false;
    }

    const minX = blockX - 0.5;
    const maxX = blockX + 0.5;
    const minZ = blockZ - 0.5;
    const maxZ = blockZ + 0.5;

    const playerMinX = playerPos.x - playerRadius;
    const playerMaxX = playerPos.x + playerRadius;
    const playerMinZ = playerPos.z - playerRadius;
    const playerMaxZ = playerPos.z + playerRadius;

    return playerMinX < maxX && playerMaxX > minX && playerMinZ < maxZ && playerMaxZ > minZ;
}

// Returns a Set of positions (as strings) for all blocks with visible faces
function getCollisionBlocks() {
    const visibleBlocks = new Set();
    for (const chunk of chunkData.values()) {
        for (const [pos, visibleFaces] of chunk.entries()) {
            if (visibleFaces.length > 0) visibleBlocks.add(pos);
        }
    }
    return visibleBlocks;
}