// game.js - Main game initialization and loop

// FPS tracking
let frameCount = 0;
let lastTime = Date.now();
let fps = 0;
let lastFrameTime = performance.now();

// Main game loop
function animate() {
    requestAnimationFrame(animate);

    // Calculate delta time in seconds
    const now = performance.now();
    const delta = (now - lastFrameTime) / 1000;
    lastFrameTime = now;

    // Calculate FPS
    frameCount++;
    const currentTime = Date.now();
    if (currentTime >= lastTime + 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
        fpsDisplay.innerHTML = `FPS: ${fps}`;
    }

    updatePlayer(delta);
    updatePreview();
    updateChunks();
    updateUI();

    renderer.render(scene, camera);
}

function init() {
    setupLighting();
    setupUI();

    updateChunks(true);

    animate();
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Mouse click event
function onMouseClick(event) {
    if (typeof window.isAnyMenuOpen === 'function' && window.isAnyMenuOpen()) {
        return;
    }

    if (typeof window.isInventoryOpen === 'function' && window.isInventoryOpen()) {
        return;
    }

    // Ignore clicks on UI elements - do this BEFORE preventDefault
    if (
        event.target.id === 'renderDistanceSlider' ||
        event.target.closest('#renderDistanceContainer') ||
        event.target.closest('#hotbarDisplay') ||
        event.target.closest('#inventoryOverlay') ||
        event.target.closest('#craftingOverlay')
    ) {
        return;
    }

    event.preventDefault();

    if (event.button === 2) {
        const target = getTargetBlockPosition();
        if (target) {
            removeBlock(target.x, target.y, target.z);
        }
        return;
    }

    if (event.button !== 0) return;

    const target = getPlacementPosition();
    if (target && !isOccupied(target.x, target.y, target.z) && isAdjacentToOccupied(target.x, target.y, target.z) && !doesBlockCollideWithPlayer(target.x, target.y, target.z)) {
        const selectedBlockType = typeof window.getSelectedBlockType === 'function' ? window.getSelectedBlockType() : null;
        if (!selectedBlockType) return;
        if (typeof window.consumeSelectedInventoryItem === 'function' && !window.consumeSelectedInventoryItem(1)) return;
        createBlock(target.x, target.y, target.z, selectedBlockType);
    }
}

window.addEventListener('mousedown', onMouseClick);
window.addEventListener('contextmenu', event => event.preventDefault());

init();