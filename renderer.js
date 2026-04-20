// renderer.js - Scene, camera, renderer, and lighting setup

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue

// Camera
const cameraHeight = 1.8; // Camera height relative to ground
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x87CEEB);
renderer.shadowMap.enabled = false; // Disable shadows for now
document.body.appendChild(renderer.domElement);

// First-person controls
const controls = new THREE.PointerLockControls(camera, document.body);
controls.getObject().position.set(0, cameraHeight, 0);
const movementSpeed = 4; // blocks per second
const playerRadius = 0.25;
const playerHeight = 2;
const gravity = -3; // blocks per second squared
const jumpForce = .5; // tuned for 1 block jump with gravity -20
let velocity = new THREE.Vector3();
let isOnGround = false;

// Lighting setup
function setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = false; // Disable shadows
    scene.add(directionalLight);
    scene.add(new THREE.AxesHelper(2));
}