// player.js - Player controls and physics

// Keyboard controls
const keys = {};

document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'Space' && isOnGround) {
        velocity.y = jumpForce;
        isOnGround = false;
    }
});

document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

function updatePlayer(delta) {
    // Horizontal movement
    const move = new THREE.Vector3();
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (keys['KeyW']) move.add(forward);
    if (keys['KeyS']) move.sub(forward);
    if (keys['KeyD']) move.add(right);
    if (keys['KeyA']) move.sub(right);

    const playerPosition = controls.getObject().position;

    if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(movementSpeed * (delta || 1/60));
        const nextPosition = playerPosition.clone().add(move);
        nextPosition.y = playerPosition.y;
        if (!isPlayerColliding(nextPosition)) {
            playerPosition.add(move);
        }
    }

    // Vertical movement
    velocity.y += gravity * (delta || 1/60);
    const verticalMove = new THREE.Vector3(0, velocity.y, 0);
    const verticalNext = playerPosition.clone().add(verticalMove);

    if (isPlayerColliding(verticalNext)) {
        if (velocity.y < 0) {
            isOnGround = true;
        }
        velocity.y = 0;
    } else {
        playerPosition.add(verticalMove);
        isOnGround = false;
    }

    // Respawn if fallen too far
    if (playerPosition.y < -300) {
        playerPosition.set(0, cameraHeight, 0);
        velocity.set(0, 0, 0);
        isOnGround = false;
    }
}