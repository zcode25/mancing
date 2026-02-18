import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

// Game Constants
const FISH_TYPES = [
    // Common
    { name: 'Sardine', rarity: 'Common', value: 10, points: 5, color: '#bdc3c7', time: 'any' },
    { name: 'Mackerel', rarity: 'Common', value: 15, points: 7, color: '#95a5a6', time: 'day' },
    { name: 'Moonfish', rarity: 'Common', value: 18, points: 8, color: '#aab7b8', time: 'night' },
    { name: 'Blue Gill', rarity: 'Common', value: 12, points: 6, color: '#5dade2', time: 'day' },
    { name: 'Starry Minnow', rarity: 'Common', value: 20, points: 10, color: '#f7dc6f', time: 'night' },

    // Rare
    { name: 'Tuna', rarity: 'Rare', value: 50, points: 20, color: '#3498db', time: 'day' },
    { name: 'Salmon', rarity: 'Rare', value: 75, points: 30, color: '#e67e22', time: 'any' },
    { name: 'Stardust Eel', rarity: 'Rare', value: 85, points: 35, color: '#8e44ad', time: 'night' },
    { name: 'Neon Tetra', rarity: 'Rare', value: 65, points: 25, color: '#31e8ff', time: 'night' },
    { name: 'Swordfish', rarity: 'Rare', value: 90, points: 40, color: '#566573', time: 'day' },

    // Legend
    { name: 'Golden Koi', rarity: 'Legend', value: 500, points: 200, color: '#f1c40f', time: 'day' },
    { name: 'Rainbow Trout', rarity: 'Legend', value: 1000, points: 500, color: '#9b59b6', time: 'any' },
    { name: 'Abyssal Whale', rarity: 'Legend', value: 1500, points: 750, color: '#2c3e50', time: 'night' },
    { name: 'Solar Flare', rarity: 'Legend', value: 1200, points: 600, color: '#e74c3c', time: 'day' },
    { name: 'Galactic Ray', rarity: 'Legend', value: 2000, points: 1000, color: '#17202a', time: 'night' },

    // Boss Fish (Special)
    { name: 'The Great Kraken', rarity: 'BOSS', value: 5000, points: 5000, color: '#ff0000', time: 'boss' }
];


const UPGRADE_ITEMS = {
    rod: [
        { id: 'rod_1', name: 'Carbon Rod', price: 100, desc: 'Faster reeling speed', value: 0.7 },
        { id: 'rod_2', name: 'Golden Rod', price: 500, desc: 'Ultra fast reeling & higher luck', value: 0.4 }
    ],
    bag: [
        { id: 'bag_1', name: 'Medium Bag', price: 150, desc: 'Carry 10 fish', value: 10 },
        { id: 'bag_2', name: 'Large Bag', price: 400, desc: 'Carry 20 fish', value: 20 }
    ],
    bait: [
        { id: 'bait_1', name: 'Premium Worms', price: 50, desc: 'Higher chance for Rare fish', value: 0.1 }
    ]
};

// Game State
let state = {
    gameStarted: false, // For cinematic camera
    menuCameraAngle: 0,
    money: 0,
    points: 0,
    inventory: [],
    world: {
        time: Math.random() * 24, // Starting at a random time of day
        timeSpeed: 0.02, // Hours per real second (1 hour = 50s)
        isNight: false,
        bossEvent: null // "The Great Kraken" or null
    },

    audio: {
        bgm: null,
        isPlaying: false,
        muted: true // Start muted to comply with browser policies
    },
    player: {
        x: 0,
        z: 5,
        y: 1.0,
        speed: 0.1,
        isFishing: false,
        fishingState: 'idle', // 'idle', 'casting', 'waiting', 'bite', 'reeling'
        mesh: null,
        limbs: {
            legL: null,
            legR: null,
            armL: null,
            armR: null,
            rod: null,
            line: null,
            bobber: null
        },
        walkCycle: 0,
        fishingTimer: 0,
        rodTension: 0, // State-based rod bending factor
        rodSnap: 0,    // Spring back factor for casting
        upgrades: {
            rod: { level: 0, name: 'Basic Rod' },
            bag: { level: 0, name: 'Small Bag', capacity: 5 }
        },
        baitCount: 0,
        rarityStats: { Common: 0, Rare: 0, Legend: 0, BOSS: 0 },
        caughtSpecies: [] // Track unique species names
    },
    keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        space: false
    },
    camera: {
        yaw: 0,
        pitch: -0.4,
        distance: 8,
        targetYaw: 0,
        targetPitch: -0.4
    },
    stations: {
        shop: { position: new THREE.Vector3(-8, 0, -8), radius: 5, npc: "Old Jenkins", dialogue: "Fresh fish for sale! Best prices on the island." },
        chest: { position: new THREE.Vector3(8, 0, -8), radius: 5, npc: "Security Bob", dialogue: "Your loot is safe with me. Want to check your stash?" }
    },
    botsBase: [
        { name: 'Fisher Garry', color: '#9b59b6', pos: [15, 15] },
        { name: 'Sea Captain', color: '#1abc9c', pos: [-15, 15] },
        { name: 'Lil Fisher', color: '#e67e22', pos: [15, -15] }
    ],
    bots: [] // Initialized below
};

// Personality types for bots
const PERSONALITIES = ['speed', 'luck', 'hoarder', 'balanced'];

state.bots = state.botsBase.map(b => ({
    id: b.name.toLowerCase(),
    name: b.name,
    color: b.color,
    money: 0,
    pos: new THREE.Vector3(b.pos[0], 0, b.pos[1]),
    state: 'idle',
    target: null,
    timer: 0,
    mesh: null,
    limbs: {},
    walkCycle: 0,
    inventory: [],
    rodTension: 0,
    upgrades: { rod: 0, bag: 0 },
    baitCount: 0,
    points: 0,
    rarityStats: { Common: 0, Rare: 0, Legend: 0, BOSS: 0 },
    personality: PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)]
}));


const invModal = document.getElementById('inventory-modal');
const shopModal = document.getElementById('shop-modal');
const soundToggle = document.getElementById('sound-toggle');

// Game Flow Elements
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const gameOverModal = document.getElementById('game-over-modal');
const finishBtn = document.getElementById('finish-btn');
const gameStatsEl = document.getElementById('game-stats');
const uiOverlay = document.getElementById('ui-overlay');

// Ripple System
const ripples = [];
class Ripple {
    constructor(x, z) {
        const geo = new THREE.RingGeometry(0.1, 0.2, 32);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(x, -0.45, z);
        scene.add(this.mesh);
        this.life = 1.0;
        this.scale = 1.0;
    }
    update(delta) {
        this.life -= delta * 0.8;
        this.scale += delta * 2.0;
        this.mesh.scale.set(this.scale, this.scale, 1);
        this.mesh.material.opacity = this.life;
        if (this.life <= 0) {
            scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            return false;
        }
        return true;
    }
}


// UI Elements
const moneyEl = document.getElementById('money');
const pointsEl = document.getElementById('points');
const messageContainer = document.getElementById('message-container');
const interactPrompt = document.getElementById('interact-prompt');
const npcDialogue = document.getElementById('npc-dialogue');
const npcNameEl = document.getElementById('npc-name');
const npcTextEl = document.getElementById('npc-text');
const lbEntriesEl = document.getElementById('leaderboard-entries');
const clockEl = document.getElementById('game-clock');
const upgradeListEl = document.getElementById('upgrade-list');
const tabSell = document.getElementById('tab-sell');
const tabUpgrade = document.getElementById('tab-upgrade');
const sellView = document.getElementById('shop-sell-view');
const upgradeView = document.getElementById('shop-upgrade-view');

// Leaderboard Toggle
const lbContainer = document.getElementById('leaderboard');
const lbToggleBtn = document.getElementById('lb-toggle-btn');
if (lbToggleBtn && lbContainer) {
    lbToggleBtn.onclick = () => {
        lbContainer.classList.toggle('collapsed');
        lbToggleBtn.textContent = lbContainer.classList.contains('collapsed') ? '◀' : '▼';
    };
}

const tabBackpack = document.getElementById('tab-backpack');
const tabIndex = document.getElementById('tab-index');
const backpackView = document.getElementById('backpack-view');
const indexView = document.getElementById('index-view');

function updateUI() {
    moneyEl.textContent = state.money;
    pointsEl.textContent = state.points;
    const baitCountEl = document.getElementById('bait-count');
    if (baitCountEl) baitCountEl.textContent = state.player.baitCount;
    updateLeaderboard();
    updateUpgradeList();
    updateClockUI();
}

function updateClockUI() {
    const hours = Math.floor(state.world.time);
    const minutes = Math.floor((state.world.time % 1) * 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const clockText = document.getElementById('clock-text');
    const clockIcon = document.getElementById('clock-icon');
    if (clockText) clockText.textContent = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    if (clockIcon) clockIcon.textContent = state.world.isNight ? '🌙' : '☀️';
}


function updateUpgradeList() {
    let html = '';
    // Rods
    UPGRADE_ITEMS.rod.forEach((item, idx) => {
        const isBought = state.player.upgrades.rod.level > idx;
        const isLocked = state.player.upgrades.rod.level < idx;
        const canAfford = state.money >= item.price;
        html += createUpgradeHTML(item, isBought, canAfford, 'rod', isLocked);
    });
    // Bags
    UPGRADE_ITEMS.bag.forEach((item, idx) => {
        const isBought = state.player.upgrades.bag.level > idx;
        const isLocked = state.player.upgrades.bag.level < idx;
        const canAfford = state.money >= item.price;
        html += createUpgradeHTML(item, isBought, canAfford, 'bag', isLocked);
    });
    // Bait
    UPGRADE_ITEMS.bait.forEach((item) => {
        const canAfford = state.money >= item.price;
        // Bait is never "Bought" (isBought=false), it's a consumable stack
        html += createUpgradeHTML(item, false, canAfford, 'bait', false);
    });
    upgradeListEl.innerHTML = html;
}

function createUpgradeHTML(item, isBought, canAfford, type, isLocked) {
    const icons = { rod: '🎣', bag: '🎒', bait: '🪱' };
    return `
        <div class="upgrade-item ${isLocked ? 'locked' : ''}">
            <div style="display:flex; align-items:center; gap:15px; opacity: ${isLocked ? '0.5' : '1'}">
                <div style="font-size:2rem">${icons[type]}</div>
                <div class="upgrade-info">
                    <h4>${item.name}</h4>
                    <p>${item.desc} — <b>$${item.price}</b></p>
                </div>
            </div>
            <button class="buy-btn" 
                ${(isBought || isLocked) ? 'disabled' : ''} 
                onclick="buyUpgrade('${type}', '${item.id}')">
                ${isBought ? 'Owned' : (isLocked ? 'Locked' : 'Buy')}
            </button>
        </div>
    `;
}


window.buyUpgrade = (type, id) => {
    const categories = UPGRADE_ITEMS[type];
    const item = categories.find(i => i.id === id);

    if (state.money >= item.price) {
        state.money -= item.price;
        if (type === 'rod') {
            state.player.upgrades.rod.level++;
            state.player.upgrades.rod.name = item.name;
        } else if (type === 'bag') {
            state.player.upgrades.bag.level++;
            state.player.upgrades.bag.name = item.name;
            state.player.upgrades.bag.capacity = item.value;
        } else if (type === 'bait') {
            state.player.baitCount++;
        }
        updateUI();
        showMessage(`✅ Purchased ${item.name}!`);
    } else {
        showMessage("❌ Not enough money!");
    }
};

tabSell.onclick = () => {
    tabSell.classList.add('active');
    tabUpgrade.classList.remove('active');
    sellView.classList.remove('hidden');
    upgradeView.classList.add('hidden');
};

tabUpgrade.onclick = () => {
    tabUpgrade.classList.add('active');
    tabSell.classList.remove('active');
    upgradeView.classList.remove('hidden');
    sellView.classList.add('hidden');
};


function updateLeaderboard() {
    const players = [
        {
            name: 'You',
            money: state.money,
            points: state.points,
            rarityStats: state.player.rarityStats,
            isPlayer: true,
            status: state.player.isFishing ? 'Fishing' : 'Running',
            gear: `${state.player.upgrades.rod.name}${state.player.baitCount > 0 ? ` +${state.player.baitCount}` : ''}`
        },
        ...state.bots.map(b => ({
            name: b.name,
            money: b.money,
            points: b.points,
            rarityStats: b.rarityStats,
            isPlayer: false,
            status: b.state.replace(/_/g, ' '),
            gear: `${b.upgrades.rod === 2 ? 'Golden Rod' : (b.upgrades.rod === 1 ? 'Carbon Rod' : 'Basic Rod')}${b.baitCount > 0 ? ` +${b.baitCount}` : ''}`
        }))
    ];
    // Sort by points for more competitive feel
    players.sort((a, b) => b.points - a.points);

    lbEntriesEl.innerHTML = players.map(p => `
        <div class="lb-entry ${p.isPlayer ? 'player' : ''}" style="align-items: flex-start; padding: 8px 0;">
            <div style="display:flex; flex-direction:column; gap: 2px; flex: 1;">
                <span style="font-weight:bold; font-size: 0.85rem;">${p.name}</span>
                <div class="lb-rarity-row" style="margin-bottom: 2px;">
                    <span title="Common">🐟${p.rarityStats.Common}</span>
                    <span title="Rare">💎${p.rarityStats.Rare}</span>
                    <span title="Legend">🌟${p.rarityStats.Legend}</span>
                    <span title="BOSS">🐙${p.rarityStats.BOSS}</span>
                </div>
                <small style="opacity:0.7; font-size:0.65rem; color: #444;">${p.status}</small>
                <small style="opacity:0.5; font-size:0.6rem; font-style: italic;">${p.gear}</small>
            </div>
            <div style="display:flex; flex-direction:column; align-items: flex-end; gap: 4px;">
                <span style="color:black; font-weight:bold; font-size: 0.95rem;">$${p.money}</span>
                <span class="lb-pts badge" style="font-size: 0.55rem; padding: 1px 4px;">${p.points} PTS</span>
            </div>
        </div>
    `).join('');
}



// Game Helpers
function getTerrainHeight(x, z) {
    const d = Math.hypot(x, z);

    // 1. Grass Center (Radius 0-14, Target Y=0.7)
    if (d < 14) return 0.7;

    // 2. Inner Slope (Radius 14-16, transition from 0.7 to 0.5)
    if (d < 16) {
        const t = (d - 14) / (16 - 14);
        return 0.7 + (0.5 - 0.7) * t;
    }

    // 3. Flat Sand (Radius 16-20, fixed Y=0.5)
    if (d < 20) return 0.5;

    // 4. Outer Slope (Radius 20-25, slopes down to water)
    // Formula based on CylinderGeo(20, 25, 2) at position y=-0.5
    // Top is R=20, Y=0.5. Bottom is R=25, Y=-1.5.
    const t = (d - 20) / (25 - 20);
    return 0.5 + (-1.5 - 0.5) * t;
}

function showMessage(msg, type = 'normal') {
    const div = document.createElement('div');
    div.className = `message ${type}`;
    div.textContent = msg;
    messageContainer.appendChild(div);

    if (type === 'boss') {
        // Screen shake effect for boss message
        document.body.classList.add('shake');
        setTimeout(() => document.body.classList.remove('shake'), 1000);
    }

    setTimeout(() => div.remove(), 4000);
}

// 3D Engine Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color('#a3e4ff');
scene.fog = new THREE.FogExp2('#a3e4ff', 0.005); // Reduced fog density for better visibility

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 30); // Even closer center-focused drone view
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Audio System Setup (Moved here to ensure camera is defined)
const listener = new THREE.AudioListener();
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
const sounds = {
    bgm: new THREE.Audio(listener)
};

function playSound(name, volume = 0.5) {
    // SFX disabled by user request
}

// Pointer Lock Controls (Declared once)
const controls = new PointerLockControls(camera, document.body);
// We do NOT add controls.object to scene because we manage camera position manually for 3rd person


document.addEventListener('click', () => {
    const isMenuOpen = !invModal.classList.contains('hidden') || !shopModal.classList.contains('hidden');

    if (!controls.isLocked && !isMenuOpen) {
        controls.lock();
        if (!state.audio.isPlaying) initAudio();
    }
});

// Manual Mouse tracking for Orbit
document.addEventListener('mousemove', (e) => {
    if (controls.isLocked) {
        state.camera.targetYaw -= e.movementX * 0.003;
        state.camera.targetPitch -= e.movementY * 0.003;

        // Limit pitch to avoid flipping
        state.camera.targetPitch = Math.max(-1.0, Math.min(0.2, state.camera.targetPitch));
    }
});

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfff0dd, 1.2);
sunLight.position.set(20, 40, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
scene.add(sunLight);

// Atmosphere (Simple Sky Gradient)
const skyGeo = new THREE.SphereGeometry(150, 32, 32);
const skyMat = new THREE.MeshBasicMaterial({ color: '#87CEEB', side: THREE.BackSide });
const sky = new THREE.Mesh(skyGeo, skyMat);
scene.add(sky);

// --- Starfield ---
const starsCount = 2000;
const starsGeo = new THREE.BufferGeometry();
const starsPos = new Float32Array(starsCount * 3);
for (let i = 0; i < starsCount; i++) {
    const r = 140 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starsPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starsPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starsPos[i * 3 + 2] = r * Math.cos(phi);
}
starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.8, transparent: true, opacity: 0 });
const starfield = new THREE.Points(starsGeo, starsMat);
scene.add(starfield);

// --- Atmospheric Particles (Fireflies/Dust) ---
const partCount = 100;
const partGeo = new THREE.BufferGeometry();
const partPos = new Float32Array(partCount * 3);
const partVel = [];
for (let i = 0; i < partCount; i++) {
    partPos[i * 3] = (Math.random() - 0.5) * 60;
    partPos[i * 3 + 1] = 1 + Math.random() * 10;
    partPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    partVel.push(new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02));
}
partGeo.setAttribute('position', new THREE.BufferAttribute(partPos, 3));
const partMat = new THREE.PointsMaterial({ color: 0xffffaa, size: 0.1, transparent: true, opacity: 0.6 });
const particles = new THREE.Points(partGeo, partMat);
scene.add(particles);

// Environment
// Realastic Ocean (Dynamic Waves V2 - Calmer)
const oceanGeo = new THREE.PlaneGeometry(500, 500, 256, 256);
const oceanMat = new THREE.MeshStandardMaterial({
    color: '#005b96',
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92
});

oceanMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.vertexShader = `
        uniform float uTime;
        varying float vHeight;
        varying vec3 vPos;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 v = vec3(position);
        
        // Calculate distance from center to damp waves near island
        float dist = length(v.xy);
        float damping = smoothstep(20.0, 45.0, dist); // No waves inside radius 20, full waves after 45
        
        // Calmer WAVE Layer 1 (Swells - reduced from 0.4 to 0.15)
        float w1 = sin(v.x * 0.05 + uTime * 0.6) * cos(v.y * 0.05 + uTime * 0.5) * 0.15;
        
        // Calmer WAVE Layer 2 (Ripples - reduced from 0.15 to 0.08)
        float w2 = sin(v.x * 0.12 - uTime * 1.0) * 0.08;
        
        // Calmer WAVE Layer 3 (Choppy - reduced from 0.08 to 0.04)
        float w3 = cos((v.x + v.y) * 0.25 + uTime * 2.0) * 0.04;
        
        float finalHeight = (w1 + w2 + w3) * damping;
        v.z += finalHeight;
        
        vec3 transformed = vec3(v);
        vHeight = finalHeight;
        vPos = transformed;
        `
    );

    shader.fragmentShader = `
        varying float vHeight;
        varying vec3 vPos;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        float h = vHeight; 
        
        // Foam Effect on peaks (adjusted for lower heights)
        float foam = smoothstep(0.1, 0.25, h);
        diffuseColor.rgb += foam * vec3(0.3, 0.4, 0.5) * 0.5;
        
        // Depth Shading
        float depth = smoothstep(-0.25, 0.1, h);
        diffuseColor.rgb *= (0.7 + 0.3 * depth);
        
        // Crest highlight
        float crest = smoothstep(0.2, 0.27, h);
        diffuseColor.rgb += crest * 0.15;
        `
    );

    oceanMat.userData.shader = shader;
};

const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.y = -0.8; // Lowered from -0.6 to -0.8 for safety
ocean.receiveShadow = true;
scene.add(ocean);

// Realistic Island (High-poly look with Cylinder)
const islandGroup = new THREE.Group();
const islandGeo = new THREE.CylinderGeometry(20, 25, 2, 64);
const islandMat = new THREE.MeshStandardMaterial({ color: '#f5deb3', roughness: 0.8 }); // Sand
const island = new THREE.Mesh(islandGeo, islandMat);
island.position.y = -0.5;
island.receiveShadow = true;
islandGroup.add(island);

// Grass Center (Uneven look)
const grassGeo = new THREE.CylinderGeometry(15, 15, 0.2, 64);
const grassMat = new THREE.MeshStandardMaterial({ color: '#3a5f0b', roughness: 0.9 });
const grass = new THREE.Mesh(grassGeo, grassMat);
grass.position.y = 0.6;
grass.receiveShadow = true;
islandGroup.add(grass);
scene.add(islandGroup);

// Decoration: Procedural Trees
function createTree(x, z) {
    const tree = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4b3621' });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    tree.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(1.2, 2.5, 8);
    const leavesMat = new THREE.MeshStandardMaterial({ color: '#1b4d3e' });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 2.5;
    leaves.castShadow = true;
    tree.add(leaves);

    tree.position.set(x, 0.6, z);
    scene.add(tree);
}

// Physical Stations
function createShopStall(x, z) {
    const stall = new THREE.Group();
    // Counter
    const counterGeo = new THREE.BoxGeometry(3, 1, 1.5);
    const counterMat = new THREE.MeshStandardMaterial({ color: '#8b4513' });
    const counter = new THREE.Mesh(counterGeo, counterMat);
    counter.position.y = 0.5;
    counter.castShadow = true;
    counter.receiveShadow = true;
    stall.add(counter);
    // Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.05, 0.05, 2);
    const pillarMat = new THREE.MeshStandardMaterial({ color: '#5d3a1a' });
    for (let i = 0; i < 4; i++) {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(i < 2 ? -1.4 : 1.4, 1.5, i % 2 === 0 ? -0.6 : 0.6);
        p.castShadow = true;
        stall.add(p);
    }
    // Roof
    const roofGeo = new THREE.BoxGeometry(3.5, 0.2, 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: '#e67e22' });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 2.4;
    roof.rotation.x = 0.2;
    stall.add(roof);

    stall.position.set(x, 0.7, z);
    stall.rotation.y = Math.PI / 4;
    scene.add(stall);
}

// --- Sun and Moon Visuals ---
const sunMeshGeo = new THREE.SphereGeometry(3, 32, 32);
const sunMeshMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
const sunMesh = new THREE.Mesh(sunMeshGeo, sunMeshMat);
scene.add(sunMesh);

const moonMeshGeo = new THREE.SphereGeometry(2, 32, 32);
const moonMeshMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee });
const moonMesh = new THREE.Mesh(moonMeshGeo, moonMeshMat);
scene.add(moonMesh);

// --- Ambient Fish System V2 ---
class AmbientFishSystem {
    constructor(scene) {
        this.scene = scene;
        this.fishGroup = new THREE.Group();
        this.scene.add(this.fishGroup);
        this.fish = [];
        this.jumpingFish = [];
        this.splashParticles = [];
        this.jumpTimer = 5 + Math.random() * 5;

        // Schooling centers (Wandering targets)
        this.schools = [];
        this.initSchools();
        this.initFish();
    }

    initSchools() {
        const schoolsCount = 5;
        for (let i = 0; i < schoolsCount; i++) {
            const angle = (i / schoolsCount) * Math.PI * 2;
            const radius = 18 + Math.random() * 10;
            this.schools.push({
                center: new THREE.Vector3(Math.cos(angle) * radius, -1.5, Math.sin(angle) * radius),
                target: new THREE.Vector3(),
                wanderAngle: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5,
                color: [0x2980b9, 0x1abc9c, 0xe67e22, 0x8e44ad, 0x27ae60][i % 5]
            });
            this._pickNewSchoolTarget(this.schools[i]);
        }
    }

    _pickNewSchoolTarget(school) {
        // Schools wander in the ocean
        school.wanderAngle += (Math.random() - 0.5) * 1.5;
        const moveDist = 5 + Math.random() * 10;
        const tx = school.center.x + Math.cos(school.wanderAngle) * moveDist;
        const tz = school.center.z + Math.sin(school.wanderAngle) * moveDist;

        // Stay in water, avoid island (radius 22)
        const dist = Math.hypot(tx, tz);
        if (dist < 25) { // Too close to island
            school.wanderAngle += Math.PI; // Turn back
        } else if (dist > 50) { // Too far from island
            const angleToCenter = Math.atan2(-tz, -tx);
            school.wanderAngle = angleToCenter + (Math.random() - 0.5);
        }

        school.target.set(
            school.center.x + Math.cos(school.wanderAngle) * moveDist,
            -1.5 - Math.random() * 1.5, // deeper range
            school.center.z + Math.sin(school.wanderAngle) * moveDist
        );
    }

    _createFishMesh(scale = 1, color = 0x2980b9) {
        const group = new THREE.Group();

        // Body
        const bodyGeo = new THREE.SphereGeometry(0.12 * scale, 8, 6);
        bodyGeo.scale(1, 0.6, 2.2);
        const bodyMat = new THREE.MeshStandardMaterial({
            color: color, roughness: 0.3, metalness: 0.2,
            transparent: true, opacity: 0.9
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Belly
        const bellyGeo = new THREE.SphereGeometry(0.09 * scale, 8, 4);
        bellyGeo.scale(1, 0.4, 1.8);
        const bellyMat = new THREE.MeshStandardMaterial({
            color: 0xffffff, transparent: true, opacity: 0.6
        });
        const belly = new THREE.Mesh(bellyGeo, bellyMat);
        belly.position.y = -0.05 * scale;
        group.add(belly);

        // Tail
        const tailGeo = new THREE.ConeGeometry(0.1 * scale, 0.2 * scale, 3);
        const tailMat = new THREE.MeshStandardMaterial({
            color: color, transparent: true, opacity: 0.8, side: THREE.DoubleSide
        });
        const tail = new THREE.Mesh(tailGeo, tailMat);
        tail.position.z = 0.28 * scale;
        tail.rotation.z = Math.PI / 2;
        group.add(tail);

        // Fins
        const finGeo = new THREE.ConeGeometry(0.04 * scale, 0.08 * scale, 3);
        const fin = new THREE.Mesh(finGeo, tailMat);
        fin.position.y = 0.1 * scale;
        group.add(fin);

        group.userData.tail = tail;
        return group;
    }

    initFish() {
        this.schools.forEach(school => {
            const size = 5 + Math.floor(Math.random() * 5);
            for (let i = 0; i < size; i++) {
                const fish = this._createFishMesh(0.8 + Math.random() * 0.4, school.color);
                fish.position.copy(school.center).add(new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 5
                ));
                fish.userData = {
                    school: school,
                    velocity: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2),
                    maxSpeed: 2 + Math.random() * 2,
                    phase: Math.random() * Math.PI * 2,
                    tail: fish.userData.tail
                };
                this.fishGroup.add(fish);
                this.fish.push(fish);
            }
        });
    }

    update(time, delta) {
        const t = time * 0.001;

        // Update schools
        this.schools.forEach(school => {
            const dist = school.center.distanceTo(school.target);
            if (dist < 1) {
                this._pickNewSchoolTarget(school);
            }
            const dir = school.target.clone().sub(school.center).normalize();
            school.center.add(dir.multiplyScalar(school.speed * delta));
        });

        // Update fish behavior (Boid-ish)
        this.fish.forEach(fish => {
            const d = fish.userData;
            const school = d.school;

            // 1. Move towards school center
            const toCenter = school.center.clone().sub(fish.position);
            const distToCenter = toCenter.length();
            toCenter.normalize();

            // 2. Alignment/Cohersion (Simplified)
            if (distToCenter > 3) d.velocity.add(toCenter.multiplyScalar(delta * 2));

            // 3. Separation
            this.fish.forEach(other => {
                if (other === fish) return;
                const diff = fish.position.clone().sub(other.position);
                const dist = diff.length();
                if (dist < 1.0) {
                    d.velocity.add(diff.normalize().multiplyScalar(delta * 5));
                }
            });

            // 4. Island avoidance
            const distToIsland = Math.hypot(fish.position.x, fish.position.z);
            if (distToIsland < 23) {
                const pushOut = new THREE.Vector3(fish.position.x, 0, fish.position.z).normalize();
                d.velocity.add(pushOut.multiplyScalar(delta * 20));
            }

            // 5. Water surface constraint (Ocean is at -0.6)
            if (fish.position.y > -0.8) {
                d.velocity.y -= delta * 15;
            } else if (fish.position.y < -3.0) {
                d.velocity.y += delta * 10;
            }

            // Speed limit
            if (d.velocity.length() > d.maxSpeed) d.velocity.setLength(d.maxSpeed);

            // Move
            fish.position.add(d.velocity.clone().multiplyScalar(delta));

            // Fixed height clamp for safety
            if (fish.position.y > -0.75) fish.position.y = -0.75;

            // Rotate to face velocity
            if (d.velocity.length() > 0.1) {
                const targetQuat = new THREE.Quaternion().setFromUnitVectors(
                    new THREE.Vector3(0, 0, -1),
                    d.velocity.clone().normalize()
                );
                fish.quaternion.slerp(targetQuat, 0.1);
            }

            // Body animations
            if (d.tail) d.tail.rotation.y = Math.sin(t * 10 + d.phase) * 0.5;
            // Roll based on turn
            const yawDelta = d.velocity.x * 0.2; // roughly simulate bank
            fish.rotation.z = THREE.MathUtils.lerp(fish.rotation.z, yawDelta, 0.1);
        });

        // Update effects
        this._updateJumps(delta);
        this._updateSplashes(delta);
    }

    _updateJumps(delta) {
        for (let i = this.jumpingFish.length - 1; i >= 0; i--) {
            const jf = this.jumpingFish[i];
            jf.elapsed += delta;
            const p = jf.elapsed / jf.duration;
            if (p >= 1) {
                this.fishGroup.remove(jf.mesh);
                this.jumpingFish.splice(i, 1);
                this._createSplash(jf.endX, jf.endZ);
            } else {
                jf.mesh.position.x = jf.startX + (jf.endX - jf.startX) * p;
                jf.mesh.position.z = jf.startZ + (jf.endZ - jf.startZ) * p;
                jf.mesh.position.y = jf.startY + Math.sin(p * Math.PI) * jf.height;
                jf.mesh.rotation.x = -Math.sin(p * Math.PI) * 1.5;
                jf.mesh.rotation.z += delta * 5;
            }
        }
        this.jumpTimer -= delta;
        if (this.jumpTimer <= 0) {
            this._triggerJump();
            this.jumpTimer = 5 + Math.random() * 10;
        }
    }

    _updateSplashes(delta) {
        for (let i = this.splashParticles.length - 1; i >= 0; i--) {
            const sp = this.splashParticles[i];
            sp.elapsed += delta;
            if (sp.elapsed > sp.lifetime) {
                this.scene.remove(sp.mesh);
                this.splashParticles.splice(i, 1);
            } else {
                const p = sp.elapsed / sp.lifetime;
                sp.mesh.position.x += sp.vx * delta;
                sp.mesh.position.y += sp.vy * delta;
                sp.mesh.position.z += sp.vz * delta;
                sp.vy -= 10 * delta; // strong gravity
                sp.mesh.material.opacity = (1 - p);
                sp.mesh.scale.setScalar(1 - p * 0.5);
            }
        }
    }

    _triggerJump() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 25 + Math.random() * 15;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const mesh = this._createFishMesh(1.2, 0x1abc9c);
        mesh.position.set(x, -0.7, z);
        this.fishGroup.add(mesh);
        this._createSplash(x, z);
        this.jumpingFish.push({
            mesh: mesh, startX: x, startZ: z, endX: x + (Math.random() - 0.5) * 6, endZ: z + (Math.random() - 0.5) * 6,
            startY: -0.7,
            height: 0.8 + Math.random() * 1.2, // Reduced height (max 2.0)
            duration: 0.8 + Math.random() * 0.4, // Faster, punchier jump
            elapsed: 0
        });
    }

    _createSplash(x, z) {
        const dropMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 12; i++) {
            const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 4, 4), dropMat.clone());
            d.position.set(x, 0.1, z);
            this.scene.add(d);
            const a = Math.random() * Math.PI * 2;
            const s = 1 + Math.random() * 3;
            this.splashParticles.push({
                mesh: d, vx: Math.cos(a) * s, vy: 3 + Math.random() * 4, vz: Math.sin(a) * s,
                lifetime: 0.5 + Math.random() * 0.5, elapsed: 0
            });
        }
    }
}
const ambientFish = new AmbientFishSystem(scene);

// --- Markers for Key Locations ---
const shopMarkerGeo = new THREE.ConeGeometry(0.5, 1, 4);
const shopMarkerMat = new THREE.MeshBasicMaterial({ color: "#3498db" });
const shopMarker = new THREE.Mesh(shopMarkerGeo, shopMarkerMat);
shopMarker.position.set(-8, 5, -8);
shopMarker.rotation.x = Math.PI;
scene.add(shopMarker);

const chestMarkerGeo = new THREE.ConeGeometry(0.5, 1, 4);
const chestMarkerMat = new THREE.MeshBasicMaterial({ color: '#f1c40f' });
const chestMarker = new THREE.Mesh(chestMarkerGeo, chestMarkerMat);
chestMarker.position.set(8, 5, -8);
chestMarker.rotation.x = Math.PI;
scene.add(chestMarker);


function createInventoryChest(x, z) {
    const chest = new THREE.Group();
    // Base
    const baseGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const baseMat = new THREE.MeshStandardMaterial({ color: '#5d3a1a' });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.4;
    base.castShadow = true;
    chest.add(base);
    // Lid
    const lidGeo = new THREE.BoxGeometry(1.25, 0.2, 0.85);
    const lidMat = new THREE.MeshStandardMaterial({ color: '#8b4513' });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.85;
    lid.castShadow = true;
    chest.add(lid);
    // Lock
    const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.1);
    const lockMat = new THREE.MeshStandardMaterial({ color: '#f1c40f' });
    const lock = new THREE.Mesh(lockGeo, lockMat);
    lock.position.set(0, 0.6, 0.4);
    chest.add(lock);

    chest.position.set(x, 0.7, z);
    chest.rotation.y = -Math.PI / 4;
    scene.add(chest);
}


// --- Floating Text Labels ---
function createTextLabel(text, color = '#ffffff') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 64;

    // Clear canvas for perfect transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = 'bold 36px Inter, Arial';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; // Darker for better contrast
    // rounded bg
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 32);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    // depthWrite: false prevents artifacts with fog and transparency
    // fog: false ensures text stays white at night
    const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        fog: false
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2, 0.5, 1);
    return sprite;
}

function createNPC(x, z, skinColor, torsoColor, rotation = 0, name = '') {
    const npc = new THREE.Group();

    // Head
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.25;
    npc.add(head);

    // Name Label
    if (name) {
        const label = createTextLabel(name);
        label.position.y = 1.8;
        npc.add(label);
    }

    // Eyes
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.08, 0.05, 0.15);
    head.add(eyeL);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.08, 0.05, 0.15);
    head.add(eyeR);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.8;
    npc.add(torso);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.15, 0.25, 0);
    npc.add(legL);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.15, 0.25, 0);
    npc.add(legR);

    npc.position.set(x, 0.7, z);
    npc.rotation.y = rotation;
    scene.add(npc);
}


createShopStall(state.stations.shop.position.x, state.stations.shop.position.z);
createInventoryChest(state.stations.chest.position.x, state.stations.chest.position.z);
createNPC(state.stations.shop.position.x + 1.5, state.stations.shop.position.z, '#ffdbac', '#2ecc71', -Math.PI / 2, 'Old Jenkins');
createNPC(state.stations.chest.position.x - 1.2, state.stations.chest.position.z, '#8d5524', '#34495e', Math.PI / 2, 'Security Bob');

// Spawn Bots
state.bots.forEach(bot => {
    bot.mesh = createNPCModel(bot.pos.x, bot.pos.z, '#ffdbac', bot.color, 0, bot.limbs, bot.name);
});

// Helper to create NPC model and return its limbs for animation
function createNPCModel(x, z, skinColor, torsoColor, rotation, limbsRef, name = '') {
    const npc = new THREE.Group();

    // Head
    const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const headMat = new THREE.MeshStandardMaterial({ color: skinColor });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.25;
    npc.add(head);

    // Name Label
    if (name) {
        const label = createTextLabel(name);
        label.position.y = 1.8;
        npc.add(label);
    }

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
    const torsoMat = new THREE.MeshStandardMaterial({ color: torsoColor });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.8;
    npc.add(torso);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
    const legMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
    limbsRef.legL = new THREE.Mesh(legGeo, legMat);
    limbsRef.legL.position.set(-0.15, 0.25, 0);
    npc.add(limbsRef.legL);

    limbsRef.legR = new THREE.Mesh(legGeo, legMat);
    limbsRef.legR.position.set(0.15, 0.25, 0);
    npc.add(limbsRef.legR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    limbsRef.armL = new THREE.Mesh(armGeo, torsoMat);
    limbsRef.armL.position.set(-0.35, 0.85, 0);
    npc.add(limbsRef.armL);

    limbsRef.armR = new THREE.Mesh(armGeo, torsoMat);
    limbsRef.armR.position.set(0.35, 0.85, 0);
    npc.add(limbsRef.armR);

    // Rod for Bot (Same as player: Cyl 0.02, 0.05, 3)
    const rodGroup = new THREE.Group();
    const rodStickGeo = new THREE.CylinderGeometry(0.02, 0.05, 3, 8);
    const rodStickMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
    const rodStick = new THREE.Mesh(rodStickGeo, rodStickMat);
    rodStick.position.y = 1.5;
    rodGroup.add(rodStick);

    rodGroup.position.set(0, 0.25, 0.1);
    rodGroup.rotation.x = Math.PI / 3;
    rodGroup.visible = false;
    limbsRef.armR.add(rodGroup);
    limbsRef.rod = rodGroup;

    // Line for Bot
    const botLinePoints = [];
    for (let i = 0; i < 20; i++) botLinePoints.push(new THREE.Vector3());
    const botLineCurve = new THREE.CatmullRomCurve3(botLinePoints);
    const botLineGeo = new THREE.BufferGeometry().setFromPoints(botLineCurve.getPoints(20));
    const botLineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    limbsRef.line = new THREE.Line(botLineGeo, botLineMat);
    limbsRef.line.visible = false;
    scene.add(limbsRef.line);

    // Bobber for Bot
    const botBobberGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const botBobberMat = new THREE.MeshStandardMaterial({ color: '#ff0000' });
    limbsRef.bobber = new THREE.Mesh(botBobberGeo, botBobberMat);
    limbsRef.bobber.visible = false;
    scene.add(limbsRef.bobber);

    npc.position.set(x, 0.7, z);
    scene.add(npc);
    return npc;
}


// Random trees on grass
for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 12;
    createTree(Math.cos(angle) * dist, Math.sin(angle) * dist);
}

// Character (Better representation - Low Poly human shape)
const playerGroup = new THREE.Group();

// Legs
const legGeo = new THREE.BoxGeometry(0.2, 0.5, 0.2);
const legMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
const legL = new THREE.Mesh(legGeo, legMat);
legL.position.set(-0.15, 0.25, 0);
legL.castShadow = true;
playerGroup.add(legL);

const legR = new THREE.Mesh(legGeo, legMat);
legR.position.set(0.15, 0.25, 0);
legR.castShadow = true;
playerGroup.add(legR);

// Torso
const torsoGeo = new THREE.BoxGeometry(0.5, 0.6, 0.25);
const torsoMat = new THREE.MeshStandardMaterial({ color: '#e74c3c' });
const torso = new THREE.Mesh(torsoGeo, torsoMat);
torso.position.set(0, 0.8, 0);
torso.castShadow = true;
playerGroup.add(torso);

// Head
const headGeo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
const headMat = new THREE.MeshStandardMaterial({ color: '#ffdbac' });
const head = new THREE.Mesh(headGeo, headMat);
head.position.set(0, 1.25, 0);
head.castShadow = true;
playerGroup.add(head);

// Face (Eyes)
const eyeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.05);
const eyeMat = new THREE.MeshStandardMaterial({ color: '#000000' });
const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
eyeL.position.set(-0.08, 0.05, 0.15); // Front face (+Z)
head.add(eyeL);

const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
eyeR.position.set(0.08, 0.05, 0.15);
head.add(eyeR);

// Hair/Detail
const hairGeo = new THREE.BoxGeometry(0.32, 0.1, 0.32);
const hairMat = new THREE.MeshStandardMaterial({ color: '#4b3621' });
const hair = new THREE.Mesh(hairGeo, hairMat);
hair.position.set(0, 0.12, 0);
head.add(hair);

// Arms
const armGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
const armL = new THREE.Mesh(armGeo, torsoMat);
armL.position.set(-0.35, 0.85, 0);
armL.castShadow = true;
playerGroup.add(armL);

const armR = new THREE.Mesh(armGeo, torsoMat);
armR.position.set(0.35, 0.85, 0);
armR.castShadow = true;
playerGroup.add(armR);

state.player.mesh = playerGroup;
state.player.limbs.legL = legL;
state.player.limbs.legR = legR;
state.player.limbs.armL = armL;
state.player.limbs.armR = armR;

// Fishing Rod
const rodGroup = new THREE.Group();
const rodGeo = new THREE.CylinderGeometry(0.02, 0.05, 3, 8);
const rodMat = new THREE.MeshStandardMaterial({ color: '#2c3e50' });
const rod = new THREE.Mesh(rodGeo, rodMat);
rod.position.y = 1.5;
rodGroup.add(rod);

// Fishing Line (Smooth Curved)
const linePoints = [];
for (let i = 0; i < 20; i++) linePoints.push(new THREE.Vector3());
const lineCurve = new THREE.CatmullRomCurve3(linePoints);
const lineGeo = new THREE.BufferGeometry().setFromPoints(lineCurve.getPoints(20));
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
const line = new THREE.Line(lineGeo, lineMat);
line.visible = false;
scene.add(line);

// Bobber
const bobberGeo = new THREE.SphereGeometry(0.1, 8, 8);
const bobberMat = new THREE.MeshStandardMaterial({ color: '#ff0000' });
const bobber = new THREE.Mesh(bobberGeo, bobberMat);
bobber.visible = false;
scene.add(bobber);


state.player.limbs.rod = rodGroup;
rodGroup.visible = false; // Hide rod initially
state.player.limbs.line = line;
state.player.limbs.bobber = bobber;

// Positioning on right hand, facing forward (+Z)
// Adjusting position to be closer to the torso/arm to look "held"
rodGroup.position.set(0.35, 0.85, 0.1);
rodGroup.rotation.x = Math.PI / 3.5; // Slightly more upright
playerGroup.add(rodGroup);

scene.add(playerGroup);

// Third Person Camera Setup
const playerPosition = new THREE.Vector3(0, 0.5, 5);
state.player.mesh.position.copy(playerPosition);

// Pointer Lock Controls moved to top of engine setup
// scene.add(controls.object); 


// Input Handling
window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (state.keys.hasOwnProperty(key)) state.keys[key] = true;
    if (key === ' ') state.keys.space = true;
    if (key === 'e') handleFishingInput();
    if (key === 'f') handleInteraction();
});


window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (state.keys.hasOwnProperty(key)) state.keys[key] = false;
    if (key === ' ') state.keys.space = false;
});

// --- Mobile Controls Logic ---
const mobileControls = document.getElementById('mobile-controls');
const joystickContainer = document.getElementById('joystick-container');
const joystickKnob = document.getElementById('joystick-knob');
const mobileActionBtn = document.getElementById('mobile-action-btn');

let joystickActive = false;
let joystickStart = { x: 0, y: 0 };
const joystickRange = 50;
const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

let touchRotationActive = false;
let lastTouchX = 0;
let lastTouchY = 0;

// Show mobile controls on first touch
window.addEventListener('touchstart', function onFirstTouch() {
    if (mobileControls) mobileControls.classList.remove('hidden');
    window.removeEventListener('touchstart', onFirstTouch);
}, { once: true });

if (joystickContainer) {
    joystickContainer.addEventListener('touchstart', (e) => {
        joystickActive = true;
        const rect = joystickContainer.getBoundingClientRect();
        joystickStart = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
        if (!joystickActive) return;
        const touch = e.touches[0];

        let dx = touch.clientX - joystickStart.x;
        let dy = touch.clientY - joystickStart.y;

        const distance = Math.hypot(dx, dy);
        if (distance > joystickRange) {
            dx = (dx / distance) * joystickRange;
            dy = (dy / distance) * joystickRange;
        }

        joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        // Map to state.keys
        const nx = dx / joystickRange;
        const ny = dy / joystickRange;

        state.keys.w = ny < -0.3;
        state.keys.s = ny > 0.3;
        state.keys.a = nx < -0.3;
        state.keys.d = nx > 0.3;

        e.preventDefault();
    }, { passive: false });

    window.addEventListener('touchend', () => {
        if (!joystickActive) return;
        joystickActive = false;
        joystickKnob.style.transform = `translate(-50%, -50%)`;
        state.keys.w = false;
        state.keys.s = false;
        state.keys.a = false;
        state.keys.d = false;
    });
}

if (mobileActionBtn) {
    const handleAction = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        const playerPos = state.player.mesh.position;
        const distToShop = Math.hypot(playerPos.x - state.stations.shop.position.x, playerPos.z - state.stations.shop.position.z);
        const distToChest = Math.hypot(playerPos.x - state.stations.chest.position.x, playerPos.z - state.stations.chest.position.z);

        if (distToShop < state.stations.shop.radius || distToChest < state.stations.chest.radius) {
            handleInteraction();
        } else {
            handleFishingInput();
        }
    };

    // Use both for maximum compatibility
    mobileActionBtn.addEventListener('pointerdown', handleAction);
    mobileActionBtn.addEventListener('touchstart', handleAction, { passive: false });
}

// --- Mobile Touch Camera Rotation ---
window.addEventListener('touchstart', (e) => {
    // Only track if not touching a UI element (buttons, joystick)
    const touch = e.touches[0];
    const target = e.target;

    // Skip if touching joystick or buttons
    if (target.closest('.mobile-btn') || target.closest('#joystick-container')) return;

    touchRotationActive = true;
    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!touchRotationActive) return;

    const touch = e.touches[0];
    const dx = touch.clientX - lastTouchX;
    const dy = touch.clientY - lastTouchY;

    // Update camera targets
    state.camera.targetYaw -= dx * 0.005;
    state.camera.targetPitch -= dy * 0.005;

    // Limit pitch (same as mouse)
    state.camera.targetPitch = Math.max(-1.0, Math.min(0.2, state.camera.targetPitch));

    lastTouchX = touch.clientX;
    lastTouchY = touch.clientY;
}, { passive: false });

window.addEventListener('touchend', () => {
    touchRotationActive = false;
});

function updateMobileActionUI() {
    if (!mobileActionBtn) return;

    const playerPos = state.player.mesh.position;
    const distToShop = Math.hypot(playerPos.x - state.stations.shop.position.x, playerPos.z - state.stations.shop.position.z);
    const distToChest = Math.hypot(playerPos.x - state.stations.chest.position.x, playerPos.z - state.stations.chest.position.z);

    if (distToShop < state.stations.shop.radius) {
        mobileActionBtn.textContent = '🏪'; // Shop icon
    } else if (distToChest < state.stations.chest.radius) {
        mobileActionBtn.textContent = '💬'; // NPC icon
    } else {
        // Fishing context
        if (state.player.isFishing) {
            mobileActionBtn.textContent = '🎣'; // Reeling icon (can add animation later)
        } else {
            mobileActionBtn.textContent = '🎣'; // Standard fish icon
        }
    }
}
// --- End Mobile Controls ---

function startFishing() {
    if (state.player.isFishing) return;

    const dist = Math.hypot(state.player.x, state.player.z);
    if (dist < 18) {
        showMessage("Approach the beach to fish! (E to interact)");
        return;
    }

    // Check inventory capacity
    if (state.inventory.length >= state.player.upgrades.bag.capacity) {
        showMessage(`🎒 Inventory full! (${state.player.upgrades.bag.capacity} max)`);
        return;
    }

    state.player.isFishing = true;
    state.player.fishingState = 'casting';
    state.player.rodSnap = 1.0; // Trigger snap forward
    state.player.limbs.rod.visible = true; // Show rod
    showMessage("🎣 Casting line...");

    setTimeout(() => {
        state.player.fishingState = 'waiting';
        state.player.limbs.line.visible = true;
        state.player.limbs.bobber.visible = true;

        // Place bobber in front of player
        const forward = new THREE.Vector3(0, 0, 15);
        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.player.mesh.rotation.y);
        state.player.limbs.bobber.position.copy(state.player.mesh.position).add(forward);
        state.player.limbs.bobber.position.y = -0.4;

        // CREATE RIPPLE on hit
        ripples.push(new Ripple(state.player.limbs.bobber.position.x, state.player.limbs.bobber.position.z));
        playSound('splash', 0.3);
    }, 1000);

    setTimeout(() => {
        if (!state.player.isFishing) return;
        state.player.fishingState = 'bite';
        showMessage("⚠️ SOMETHING IS BITING! Press E to Reel!");
    }, (4000 + Math.random() * 3000) * (state.player.upgrades.rod.level === 2 ? 0.5 : (state.player.upgrades.rod.level === 1 ? 0.75 : 1.0)));
}

// Update startFishing to handle re-pressing E for strike
function handleFishingInput() {
    if (!state.player.isFishing) {
        startFishing();
    } else if (state.player.fishingState === 'bite') {
        catchFish();
    }
}


function catchFish() {
    state.player.fishingState = 'reeling';

    setTimeout(() => {
        const rand = Math.random();
        let rarity;

        // Luck from rod
        let rodLuck = 0;
        if (state.player.upgrades.rod.level === 2) rodLuck = 0.1;

        if (state.player.baitCount > 0) {
            // WITH BAIT: Much better chances
            const luck = 0.15 + rodLuck;
            if (rand < 0.4) rarity = 'Common';
            else if (rand < 0.85) rarity = 'Rare';
            else rarity = 'Legend';

            state.player.baitCount--;
            updateUI();
        } else {
            // NO BAIT: Extreme difficulty
            if (rand < 0.90) rarity = 'Common';
            else if (rand < 0.995) rarity = 'Rare';
            else rarity = 'Legend';
        }

        const possibleFish = FISH_TYPES.filter(f => {
            const matchesRarity = f.rarity === rarity;
            if (rarity === 'BOSS') return true; // Boss fish doesn't care about time
            if (state.world.isNight) {
                return matchesRarity && (f.time === 'night' || f.time === 'any');
            } else {
                return matchesRarity && (f.time === 'day' || f.time === 'any');
            }
        });

        const caught = possibleFish[Math.floor(Math.random() * possibleFish.length)];

        state.inventory.push(caught);

        // Update Stats
        state.points += caught.points;
        state.player.rarityStats[caught.rarity]++;

        // Update Collection Index
        if (!state.player.caughtSpecies.includes(caught.name)) {
            state.player.caughtSpecies.push(caught.name);
        }

        // Standardized notification for Player catch
        const rarityIcon = caught.rarity === 'BOSS' ? '🐙' : (caught.rarity === 'Legend' ? '🌟' : (caught.rarity === 'Rare' ? '💎' : '🐟'));
        showMessage(`${rarityIcon} You caught: ${caught.name} (${caught.rarity})`, caught.rarity === 'BOSS' ? 'boss' : 'normal');

        playSound('catch', 0.5);
        updateInventoryUI();
        renderFishIndex(); // Force update index immediately
        updateUI();

        state.player.isFishing = false;
        state.player.fishingState = 'idle';
        state.player.limbs.rod.visible = false; // Hide rod
        state.player.limbs.line.visible = false;
        state.player.limbs.bobber.visible = false;
    }, 1000);
}

function handleInteraction() {
    const distToShop = Math.hypot(state.player.x - state.stations.shop.position.x, state.player.z - state.stations.shop.position.z);
    const distToChest = Math.hypot(state.player.x - state.stations.chest.position.x, state.player.z - state.stations.chest.position.z);

    if (distToShop < state.stations.shop.radius) {
        toggleModal(shopModal, true);
    } else if (distToChest < state.stations.chest.radius) {
        toggleModal(invModal, true);
    }
}

// Modal Toggle Logic
const closeBtns = document.querySelectorAll('.close-btn');
const invToggle = document.getElementById('inventory-toggle');

const toggleModal = (modal, show) => {
    if (show) {
        modal.classList.remove('hidden');
        controls.unlock();
    } else {
        modal.classList.add('hidden');
    }
};

invToggle.onclick = (e) => { e.stopPropagation(); toggleModal(invModal, true); };
closeBtns.forEach(btn => btn.onclick = () => {
    toggleModal(invModal, false);
    toggleModal(shopModal, false);
});

tabBackpack.onclick = () => {
    tabBackpack.classList.add('active');
    tabIndex.classList.remove('active');
    backpackView.classList.remove('hidden');
    indexView.classList.add('hidden');
    updateInventoryUI();
};

tabIndex.onclick = () => {
    tabIndex.classList.add('active');
    tabBackpack.classList.remove('active');
    indexView.classList.remove('hidden');
    backpackView.classList.add('hidden');
    renderFishIndex();
};

function updateInventoryUI() {
    const backpackEl = document.getElementById('backpack-list');
    const shopSellEl = document.getElementById('shop-sell-list');

    if (state.inventory.length === 0) {
        // Create the empty message element
        const emptyMsg = `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 10px;">🎒</div>
                <div>Your backpack is empty</div>
                <div style="font-size: 0.8rem; margin-top: 5px;">Go catch some fish!</div>
            </div>
        `;

        if (backpackEl) {
            backpackEl.innerHTML = emptyMsg;
            backpackEl.classList.add('is-empty');
        }

        if (shopSellEl) {
            shopSellEl.innerHTML = emptyMsg;
            shopSellEl.classList.add('is-empty');
        }
        return;
    }

    // Not empty: check if elements exist before removing class
    if (backpackEl) backpackEl.classList.remove('is-empty');
    if (shopSellEl) shopSellEl.classList.remove('is-empty');

    // Helper to get emoji
    const getRarityEmoji = (r) => r === 'BOSS' ? '🐙' : (r === 'Legend' ? '🌟' : (r === 'Rare' ? '💎' : '🐟'));

    // Render for Backpack (View only)
    if (backpackEl) {
        backpackEl.innerHTML = state.inventory.map(fish => `
            <div class="inv-item">
                <div class="fish-icon-inline">${getRarityEmoji(fish.rarity)}</div>
                <div class="fish-details">
                    <span class="fish-name">${fish.name}</span>
                    <span class="fish-rarity">${fish.rarity}</span>
                </div>
            </div>
        `).join('');
    }

    // Render for Shop Sell View (With Sell buttons)
    if (shopSellEl) {
        shopSellEl.innerHTML = state.inventory.map((fish, index) => `
            <div class="inv-item">
                <div class="fish-icon-inline">${getRarityEmoji(fish.rarity)}</div>
                <div class="fish-details">
                    <span class="fish-name">${fish.name}</span>
                    <span class="fish-rarity">${fish.rarity}</span>
                </div>
                <button class="sell-btn-small" onclick="sellFish(${index})">Sell</button>
            </div>
        `).join('');
    }
}

function renderFishIndex() {
    const list = document.getElementById('fish-index-list');
    list.innerHTML = FISH_TYPES.map(fish => {
        const isCaught = state.player.caughtSpecies.includes(fish.name);
        return `
            <div class="index-item ${isCaught ? 'caught' : 'locked'}">
                <div class="index-icon">${isCaught ? '🐟' : '❓'}</div>
                <div class="index-info">
                    <div class="index-name">${isCaught ? fish.name : '???'}</div>
                    <div class="index-rarity ${fish.rarity.toLowerCase()}">${isCaught ? fish.rarity : 'Unknown'}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.sellFish = (index) => {
    const distToShop = Math.hypot(state.player.x - state.stations.shop.position.x, state.player.z - state.stations.shop.position.z);
    if (distToShop > state.stations.shop.radius) {
        showMessage("🚶 Must be at the Shop to sell fish!");
        return;
    }

    const fish = state.inventory[index];
    state.money += fish.value;
    state.inventory.splice(index, 1);
    updateUI();
    updateInventoryUI();
    showMessage(`💰 Sold ${fish.name} for $${fish.value}`);
    playSound('sell', 0.4);
};

const sellAllLogic = () => {
    const distToShop = Math.hypot(state.player.x - state.stations.shop.position.x, state.player.z - state.stations.shop.position.z);
    if (distToShop > state.stations.shop.radius) {
        showMessage("🚶 Must be at the Shop to sell fish!");
        return;
    }

    if (state.inventory.length === 0) {
        showMessage("Nothing to sell!");
        return;
    }

    let totalValue = 0;
    state.inventory.forEach(f => {
        totalValue += f.value;
    });

    state.money += totalValue;
    state.inventory = [];

    updateUI();
    updateInventoryUI();
    showMessage(`Sold all for $${totalValue}!`);
};

document.getElementById('sell-all-btn').onclick = sellAllLogic;

// Main Game Loop Variables
const velocity = new THREE.Vector3();
const playerPos = new THREE.Vector3(0, 0.6, 5);
const cameraTarget = new THREE.Vector3(0, 0, 0); // Focus on island center initially
const smoothCameraPos = new THREE.Vector3();
let prevTime = performance.now();


function animate() {
    requestAnimationFrame(animate);
    const playerPos = state.player.mesh.position;

    const time = performance.now();
    const delta = Math.min((time - prevTime) / 1000, 0.1);
    prevTime = time;

    // Update Ocean Shader Uniforms
    if (oceanMat.userData.shader) {
        oceanMat.userData.shader.uniforms.uTime.value = time * 0.001;
    }

    // Day/Night Cycle Logic
    state.world.time += delta * state.world.timeSpeed;
    if (state.world.time >= 24) state.world.time = 0;

    // Boss Spawning (Exactly at Midnight)
    const hours = Math.floor(state.world.time);
    const minutes = Math.floor((state.world.time % 1) * 60);

    if (hours === 0 && minutes === 0 && !state.world.bossEvent) {
        state.world.bossEvent = 'The Great Kraken';
        showMessage("🚨 ⚠️ A MASSIVE SHADOW APPEARS IN THE DEEP! ⚠️ 🚨", 'boss');
        showMessage("THE GREAT KRAKEN HAS ARRIVED!", 'boss');
    } else if (hours === 4 && state.world.bossEvent) {
        // Boss leaves at 4 AM
        state.world.bossEvent = null;
        showMessage("The massive shadow recedes into the abyss...", 'normal');
    }

    updateClockUI();

    // Lighting Updates
    const h = state.world.time;
    let skyColor, sunIntensity, ambientIntensity, oceanColor;

    if (h >= 6 && h < 10) { // Sunrise
        const t = (h - 6) / 4;
        skyColor = new THREE.Color('#ffaa66').lerp(new THREE.Color('#a3e4ff'), t);
        oceanColor = new THREE.Color('#2c3e50').lerp(new THREE.Color('#005b96'), t);
        sunIntensity = THREE.MathUtils.lerp(0.5, 1.2, t);
        ambientIntensity = THREE.MathUtils.lerp(0.3, 0.7, t);
        state.world.isNight = false;
    } else if (h >= 10 && h < 17) { // Day
        skyColor = new THREE.Color('#a3e4ff');
        oceanColor = new THREE.Color('#005b96');
        sunIntensity = 1.2;
        ambientIntensity = 0.7;
        state.world.isNight = false;
    } else if (h >= 17 && h < 20) { // Sunset
        const t = (h - 17) / 3;
        skyColor = new THREE.Color('#a3e4ff').lerp(new THREE.Color('#ff5500'), t);
        oceanColor = new THREE.Color('#005b96').lerp(new THREE.Color('#1a252f'), t);
        sunIntensity = THREE.MathUtils.lerp(1.2, 0.6, t);
        ambientIntensity = THREE.MathUtils.lerp(0.7, 0.4, t);
        state.world.isNight = false;
    } else { // Night
        let t = 0;
        if (h >= 20) t = (h - 20) / 4;
        else t = (h + 4) / 10; // Wrap around for early morning

        skyColor = new THREE.Color('#ff5500').lerp(new THREE.Color('#050510'), Math.min(t * 2, 1));
        oceanColor = new THREE.Color('#1a252f').lerp(new THREE.Color('#090c10'), Math.min(t * 2, 1));
        sunIntensity = THREE.MathUtils.lerp(0.6, 0.1, Math.min(t * 2, 1));
        ambientIntensity = THREE.MathUtils.lerp(0.4, 0.15, Math.min(t * 2, 1));
        state.world.isNight = true;
    }

    scene.background = skyColor;
    scene.fog.color = skyColor;
    sunLight.intensity = sunIntensity;
    ambientLight.intensity = ambientIntensity;
    ocean.material.color = oceanColor;

    // --- Environmental Animations ---
    if (starfield) {
        // Fade in stars at night (7 PM - 5 AM)
        starfield.material.opacity = THREE.MathUtils.lerp(
            starfield.material.opacity,
            state.world.isNight ? 0.8 : 0,
            0.05
        );
        starfield.rotation.y += 0.0001; // Slow rotation of sky
    }

    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < 100; i++) {
            // Access defined partVel array
            const v = partVel[i];
            positions[i * 3] += v.x;
            positions[i * 3 + 1] += v.y;
            positions[i * 3 + 2] += v.z;

            // respawn if too far
            if (Math.abs(positions[i * 3]) > 40 || positions[i * 3 + 1] < 0 || positions[i * 3 + 1] > 15 || Math.abs(positions[i * 3 + 2]) > 40) {
                positions[i * 3] = (Math.random() - 0.5) * 60;
                positions[i * 3 + 1] = 1 + Math.random() * 10;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;

        // At night তারা turn yellow (fireflies), day they are white (dust)
        particles.material.color.lerp(
            state.world.isNight ? new THREE.Color('#ffff00') : new THREE.Color('#ffffff'),
            0.05
        );
    }

    // Floating Markers
    if (shopMarker) {
        shopMarker.position.y = 5 + Math.sin(time * 0.003) * 0.5;
        shopMarker.rotation.y += 0.02;
    }
    if (chestMarker) {
        chestMarker.position.y = 5 + Math.sin(time * 0.003 + 2) * 0.5;
        chestMarker.rotation.y += 0.02;
    }

    // Update Ambient Fish
    if (ambientFish) ambientFish.update(time, delta);

    // Position Celestial Objects
    const sunAngle = (state.world.time / 24) * Math.PI * 2 - Math.PI / 2;
    const moonAngle = sunAngle + Math.PI;

    if (sunMesh) {
        sunMesh.position.set(Math.cos(sunAngle) * 60, Math.sin(sunAngle) * 60, 0);
        sunLight.position.copy(sunMesh.position);
    }
    if (moonMesh) {
        moonMesh.position.set(Math.cos(moonAngle) * 60, Math.sin(moonAngle) * 60, 0);
    }

    // Hide stars during high sun
    if (starfield) {
        const sunHeight = Math.sin(sunAngle);
        if (sunHeight > 0.3) starfield.visible = false;
        else starfield.visible = true;
    }

    if (controls.isLocked || isMobile) {

        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        // Smooth camera rotation state
        state.camera.yaw += (state.camera.targetYaw - state.camera.yaw) * 0.1;
        state.camera.pitch += (state.camera.targetPitch - state.camera.pitch) * 0.1;

        // Movement relative to current yaw
        const moveDir = new THREE.Vector3();
        if (state.keys.w) moveDir.z -= 1;
        if (state.keys.s) moveDir.z += 1;
        if (state.keys.a) moveDir.x -= 1;
        if (state.keys.d) moveDir.x += 1;

        moveDir.normalize();
        moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), state.camera.yaw);

        velocity.x += moveDir.x * 100.0 * delta;
        velocity.z += moveDir.z * 100.0 * delta;

        // Position Updates
        const nextX = playerPos.x + velocity.x * delta;
        const nextZ = playerPos.z + velocity.z * delta;

        // Position Updates with Boundary Check
        if (Math.hypot(nextX, nextZ) < 22) {
            playerPos.x = nextX;
            playerPos.z = nextZ;
        }

        // Terrain Height Check (Smooth slope)
        const targetY = getTerrainHeight(playerPos.x, playerPos.z);
        state.player.mesh.position.set(playerPos.x, targetY, playerPos.z);
        state.player.x = playerPos.x;
        state.player.z = playerPos.z;

        if (moveDir.length() > 0) {
            const targetAngle = Math.atan2(moveDir.x, moveDir.z);
            state.player.mesh.rotation.y = targetAngle;

            // Walking Animation (Limb swing)
            state.player.walkCycle += delta * 10;
            const swing = Math.sin(state.player.walkCycle) * 0.5;
            state.player.limbs.legL.rotation.x = swing;
            state.player.limbs.legR.rotation.x = -swing;
            state.player.limbs.armL.rotation.x = -swing;
            state.player.limbs.armR.rotation.x = swing;
        } else {
            // Reset limbs if idle
            state.player.limbs.legL.rotation.x = 0;
            state.player.limbs.legR.rotation.x = 0;
            state.player.limbs.armL.rotation.x = 0;
            state.player.limbs.armR.rotation.x = 0;
        }

        // Fishing Animations
        if (state.player.isFishing) {
            if (state.player.fishingState === 'casting') {
                // Initial wind up
                state.player.rodTension = THREE.MathUtils.lerp(state.player.rodTension, -1.2, 0.1);
            } else if (state.player.fishingState === 'waiting') {
                // Snapping forward if just cast
                if (state.player.rodSnap > 0) {
                    state.player.rodTension = THREE.MathUtils.lerp(state.player.rodTension, 0.5, 0.2);
                    state.player.rodSnap -= delta * 2;
                } else {
                    state.player.rodTension = THREE.MathUtils.lerp(state.player.rodTension, 0, 0.05);
                }
                // Gentle sway
                state.player.limbs.rod.rotation.z = Math.sin(time * 0.002) * 0.02;
            } else if (state.player.fishingState === 'bite') {
                // Violent jitter
                state.player.rodTension = 0.3 + Math.sin(time * 0.05) * 0.3;
                state.player.limbs.bobber.position.y = -0.4 + Math.sin(time * 0.03) * 0.2;
            } else if (state.player.fishingState === 'reeling') {
                // High tension bend (bend back slightly)
                state.player.rodTension = THREE.MathUtils.lerp(state.player.rodTension, -0.5, 0.1);
                state.player.limbs.bobber.position.y = THREE.MathUtils.lerp(state.player.limbs.bobber.position.y, 2.0, 0.05);
            }

            // Apply Tension to Rod Rotation (Positive X is forward)
            state.player.limbs.rod.rotation.x = Math.PI / 4 + state.player.rodTension;

            // Dynamic Fishing Line (Curved)
            if (state.player.limbs.line.visible) {
                const rodTip = new THREE.Vector3(0, 3, 0).applyMatrix4(state.player.limbs.rod.matrixWorld);
                const bobberPos = state.player.limbs.bobber.position;

                // Calculate Curve Points
                const midPoint = new THREE.Vector3().addVectors(rodTip, bobberPos).multiplyScalar(0.5);
                midPoint.y -= 1.5; // Gravity dip

                const points = [rodTip, midPoint, bobberPos];
                const curve = new THREE.CatmullRomCurve3(points);
                state.player.limbs.line.geometry.setFromPoints(curve.getPoints(20));
            }
        } else {
            // Smooth reset to idle
            state.player.rodTension = THREE.MathUtils.lerp(state.player.rodTension, 0, 0.1);
            state.player.limbs.rod.rotation.x = Math.PI / 4 + state.player.rodTension;
            state.player.limbs.rod.rotation.z = THREE.MathUtils.lerp(state.player.limbs.rod.rotation.z, 0, 0.1);
        }

        // Ripple Updates
        for (let i = ripples.length - 1; i >= 0; i--) {
            if (!ripples[i].update(delta)) {
                ripples.splice(i, 1);
            }
        }

        // Periodic subtle ripples during waiting
        if (state.player.isFishing && state.player.fishingState === 'waiting') {
            if (time % 2000 < 20) {
                ripples.push(new Ripple(state.player.limbs.bobber.position.x, state.player.limbs.bobber.position.z));
            }
        }

        // --- STABLE CAMERA ORBIT ---
        if (!state.gameStarted) {
            // --- Menu Cinematic Orbit ---
            state.menuCameraAngle += delta * 0.1; // Slow rotation
            const orbitDist = 15;
            const orbitHeight = 10;
            const targetMenuPos = new THREE.Vector3(
                Math.cos(state.menuCameraAngle) * orbitDist,
                orbitHeight,
                Math.sin(state.menuCameraAngle) * orbitDist
            );
            camera.position.lerp(targetMenuPos, 0.05);
            cameraTarget.lerp(new THREE.Vector3(0, 0, 0), 0.05); // Focus on island center
            camera.lookAt(cameraTarget);
        } else {
            // --- Player Follow Camera ---
            const offset = new THREE.Vector3(0, 0, state.camera.distance);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationFromEuler(new THREE.Euler(state.camera.pitch, state.camera.yaw, 0, 'YXZ'));
            offset.applyMatrix4(rotationMatrix);

            const targetCameraPos = playerPos.clone().add(new THREE.Vector3(0, 2, 0)).add(offset);
            // Smooth transition from menu to player
            camera.position.lerp(targetCameraPos, 0.1);

            cameraTarget.lerp(new THREE.Vector3(playerPos.x, playerPos.y + 1, playerPos.z), 0.1);
            camera.lookAt(cameraTarget);
        }

        // Station Interaction Check
        const distToShop = Math.hypot(playerPos.x - state.stations.shop.position.x, playerPos.z - state.stations.shop.position.z);
        const distToChest = Math.hypot(playerPos.x - state.stations.chest.position.x, playerPos.z - state.stations.chest.position.z);

        if (distToShop < state.stations.shop.radius || distToChest < state.stations.chest.radius) {
            interactPrompt.classList.remove('hidden');
            npcDialogue.classList.remove('hidden');

            if (distToShop < state.stations.shop.radius) {
                npcNameEl.textContent = state.stations.shop.npc;
                npcTextEl.textContent = state.stations.shop.dialogue;
            } else {
                npcNameEl.textContent = state.stations.chest.npc;
                npcTextEl.textContent = state.stations.chest.dialogue;
            }
        } else {
            interactPrompt.classList.add('hidden');
            npcDialogue.classList.add('hidden');
        }

        // Update Mobile Action Button Context
        updateMobileActionUI();
    }


    // Bot AI Logic
    state.bots.forEach(bot => {
        bot.timer -= delta;

        if (bot.state === 'idle') {
            if (bot.timer <= 0) {
                const bagCapacity = bot.upgrades.bag === 2 ? 20 : (bot.upgrades.bag === 1 ? 10 : 5);

                if (bot.inventory.length >= bagCapacity) {
                    bot.target = state.stations.shop.position.clone();
                    bot.state = 'walking_to_shop';
                    bot.limbs.armR.rotation.x = 0; // Lower rod while walking
                } else {
                    // Strategic Reinvestment based on personality
                    const p = bot.personality;
                    const canAffordRod = (lvl) => UPGRADE_ITEMS.rod[lvl] && bot.money >= UPGRADE_ITEMS.rod[lvl].price;
                    const canAffordBag = (lvl) => UPGRADE_ITEMS.bag[lvl] && bot.money >= UPGRADE_ITEMS.bag[lvl].price;
                    const canAffordBait = () => bot.money >= 50;

                    if (p === 'speed') {
                        if (canAffordRod(bot.upgrades.rod) || (bot.baitCount < 3 && canAffordBait())) {
                            bot.target = state.stations.shop.position.clone();
                            bot.state = 'walking_to_shop';
                            bot.limbs.armR.rotation.x = 0;
                        }
                    } else if (p === 'luck') {
                        // Luck personality is obsessed with bait
                        if ((bot.baitCount < bagCapacity && canAffordBait()) || canAffordRod(bot.upgrades.rod)) {
                            bot.target = state.stations.shop.position.clone();
                            bot.state = 'walking_to_shop';
                            bot.limbs.armR.rotation.x = 0;
                        }
                    } else if (p === 'hoarder') {
                        if (canAffordBag(bot.upgrades.bag) || (bot.baitCount < 3 && canAffordBait())) {
                            bot.target = state.stations.shop.position.clone();
                            bot.state = 'walking_to_shop';
                            bot.limbs.armR.rotation.x = 0;
                        }
                    } else { // balanced
                        if (canAffordRod(bot.upgrades.rod) || canAffordBag(bot.upgrades.bag) || (bot.baitCount < 5 && canAffordBait())) {
                            bot.target = state.stations.shop.position.clone();
                            bot.state = 'walking_to_shop';
                            bot.limbs.armR.rotation.x = 0;
                        }
                    }

                    // Go to a random fishing spot at the edge
                    const angle = Math.random() * Math.PI * 2;
                    bot.target = new THREE.Vector3(Math.cos(angle) * 20, 0, Math.sin(angle) * 20);
                    bot.state = 'walking_to_fish';
                    bot.limbs.armR.rotation.x = 0; // Lower rod while walking
                }
            }
        } else if (bot.state.startsWith('walking')) {

            const dir = new THREE.Vector3().subVectors(bot.target, bot.pos).normalize();
            const moveStep = dir.clone().multiplyScalar(delta * 3);
            bot.pos.add(moveStep);

            const botY = getTerrainHeight(bot.pos.x, bot.pos.z);
            bot.mesh.position.set(bot.pos.x, botY, bot.pos.z);
            bot.mesh.rotation.y = Math.atan2(dir.x, dir.z);

            // Animation
            bot.walkCycle += delta * 10;
            const swing = Math.sin(bot.walkCycle) * 0.5;
            bot.limbs.legL.rotation.x = swing;
            bot.limbs.legR.rotation.x = -swing;
            bot.limbs.armL.rotation.x = -swing * 0.5;
            bot.limbs.armR.rotation.x = swing * 0.5;

            if (bot.pos.distanceTo(bot.target) < 1) {
                if (bot.state === 'walking_to_fish') {
                    bot.state = 'fishing';
                    bot.timer = 5 + Math.random() * 5;
                    bot.limbs.rod.visible = true; // Show rod for fishing
                    bot.rodTension = 0; // Initialize tension
                    // Reset pose for fishing
                    bot.limbs.legL.rotation.x = 0;
                    bot.limbs.legR.rotation.x = 0;
                    bot.limbs.armR.rotation.x = -Math.PI / 4; // Raise arm
                } else {
                    // Arrival at Shop: Sell fish and then handle upgrades
                    let soldValue = 0;
                    if (bot.inventory.length > 0) {
                        bot.inventory.forEach(f => soldValue += f.value);
                        bot.money += soldValue;
                        bot.inventory = [];
                        showMessage(`💰 ${bot.name} sold fish for $${soldValue}`);
                    }

                    // Strategic Reinvestment (Buying on arrival)
                    const p = bot.personality;
                    const canAffordRod = (lvl) => UPGRADE_ITEMS.rod[lvl] && bot.money >= UPGRADE_ITEMS.rod[lvl].price;
                    const canAffordBag = (lvl) => UPGRADE_ITEMS.bag[lvl] && bot.money >= UPGRADE_ITEMS.bag[lvl].price;
                    const canAffordBait = () => bot.money >= 50;

                    const bagCapacity = bot.upgrades.bag === 2 ? 20 : (bot.upgrades.bag === 1 ? 10 : 5);
                    if (p === 'speed') {
                        if (canAffordRod(bot.upgrades.rod)) buyBotUpgrade(bot, 'rod');
                        else if (bot.baitCount < 5 && canAffordBait()) buyBotUpgrade(bot, 'bait');
                    } else if (p === 'luck') {
                        if (bot.baitCount < bagCapacity && canAffordBait()) buyBotUpgrade(bot, 'bait');
                        else if (canAffordRod(bot.upgrades.rod)) buyBotUpgrade(bot, 'rod');
                    } else if (p === 'hoarder') {
                        if (canAffordBag(bot.upgrades.bag)) buyBotUpgrade(bot, 'bag');
                        else if (bot.baitCount < 5 && canAffordBait()) buyBotUpgrade(bot, 'bait');
                    } else { // balanced
                        if (bot.upgrades.rod <= bot.upgrades.bag && canAffordRod(bot.upgrades.rod)) buyBotUpgrade(bot, 'rod');
                        else if (canAffordBag(bot.upgrades.bag)) buyBotUpgrade(bot, 'bag');
                        else if (bot.baitCount < 10 && canAffordBait()) buyBotUpgrade(bot, 'bait');
                    }

                    bot.state = 'idle';
                    bot.timer = 2;
                    updateLeaderboard();
                }
            }
        } else if (bot.state === 'fishing') {
            // Match player tension physics
            if (bot.timer > 1.0) {
                // Bots also use rod/bait luck
                const waitTimeMult = bot.upgrades.rod === 2 ? 0.5 : (bot.upgrades.rod === 1 ? 0.75 : 1.0);
                const castingThreshold = 4.0 * waitTimeMult;

                if (bot.timer > castingThreshold) {
                    // Casting wind up (simulated)
                    bot.rodTension = THREE.MathUtils.lerp(bot.rodTension, -1.2, 0.1);
                    bot.limbs.line.visible = false;
                    bot.limbs.bobber.visible = false;
                } else {
                    // Waiting state
                    bot.rodTension = THREE.MathUtils.lerp(bot.rodTension, 0, 0.05);
                    bot.limbs.rod.rotation.z = Math.sin(Date.now() * 0.002) * 0.02;

                    if (!bot.limbs.line.visible) {
                        bot.limbs.line.visible = true;
                        bot.limbs.bobber.visible = true;
                        // Place bobber
                        const forward = new THREE.Vector3(0, 0, 15);
                        forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), bot.mesh.rotation.y);
                        bot.limbs.bobber.position.copy(bot.mesh.position).add(forward);
                        bot.limbs.bobber.position.y = -0.4;
                    }
                }
            } else {
                // "Bite" state: Violent jitter
                bot.rodTension = 0.3 + Math.sin(Date.now() * 0.05) * 0.3;
                bot.limbs.bobber.position.y = -0.4 + Math.sin(Date.now() * 0.03) * 0.2;
            }

            // Apply Tension like player
            bot.limbs.rod.rotation.x = Math.PI / 4 + bot.rodTension;

            // Update NPC Line
            if (bot.limbs.line.visible) {
                const rodTip = new THREE.Vector3(0, 3, 0).applyMatrix4(bot.limbs.rod.matrixWorld);
                const bobberPos = bot.limbs.bobber.position;
                const midPoint = new THREE.Vector3().addVectors(rodTip, bobberPos).multiplyScalar(0.5);
                midPoint.y -= 1.5;
                const points = [rodTip, midPoint, bobberPos];
                const curve = new THREE.CatmullRomCurve3(points);
                bot.limbs.line.geometry.setFromPoints(curve.getPoints(20));
            }

            if (bot.timer <= 0) {
                // Caught a fish
                const rand = Math.random();
                let rarity;

                // Sync with player difficulty logic
                let botRodLuck = 0;
                if (bot.upgrades.rod === 2) botRodLuck = 0.1;

                if (bot.baitCount > 0) {
                    // WITH BAIT: Better chances
                    const luck = 0.15 + botRodLuck;
                    if (rand < 0.4) rarity = 'Common';
                    else if (rand < 0.85) rarity = 'Rare';
                    else rarity = 'Legend';

                    bot.baitCount--;
                } else {
                    // NO BAIT: Extreme difficulty
                    if (rand < 0.90) rarity = 'Common';
                    else if (rand < 0.995) rarity = 'Rare';
                    else rarity = 'Legend';
                }

                // Higher chance for Boss during Event for bots too!
                if (state.world.bossEvent && Math.random() < 0.20) {
                    rarity = 'BOSS';
                }

                const possibleFish = FISH_TYPES.filter(f => {
                    const matchesRarity = f.rarity === rarity;
                    if (rarity === 'BOSS') return true;
                    if (state.world.isNight) {
                        return matchesRarity && (f.time === 'night' || f.time === 'any');
                    } else {
                        return matchesRarity && (f.time === 'day' || f.time === 'any');
                    }
                });

                const caught = possibleFish[Math.floor(Math.random() * possibleFish.length)] || FISH_TYPES[0];
                bot.inventory.push(caught);

                // Update NPC Stats
                bot.points += caught.points;
                bot.rarityStats[caught.rarity]++;

                // Notification for NPC catch
                const rarityIcon = caught.rarity === 'BOSS' ? '🐙' : (caught.rarity === 'Legend' ? '🌟' : (caught.rarity === 'Rare' ? '💎' : '🐟'));
                showMessage(`${rarityIcon} ${bot.name} caught: ${caught.name} (${caught.rarity})`, caught.rarity === 'BOSS' ? 'boss' : 'normal');

                if (bot.hasBait) bot.hasBait = false;
                updateLeaderboard();

                bot.state = 'idle';
                bot.timer = 1;
                bot.limbs.rod.visible = false;
                bot.limbs.line.visible = false;
                bot.limbs.bobber.visible = false;
            }

        }
    });

    renderer.render(scene, camera);
}

// let prevTime = performance.now(); // Moved up
animate();
updateUI();

function buyBotUpgrade(bot, type) {
    if (type === 'bait') {
        const bagCapacity = bot.upgrades.bag === 2 ? 20 : (bot.upgrades.bag === 1 ? 10 : 5);
        let boughtCount = 0;
        // Buy multiple packs if bot is wealthy and has room for bait
        while (bot.money >= 50 && bot.baitCount < (bagCapacity * 2)) {
            bot.money -= 50;
            bot.baitCount += 5;
            boughtCount += 5;
            // Stop if they should save money for a major upgrade
            if (bot.money < 200 && (canAffordRod(bot.upgrades.rod) || canAffordBag(bot.upgrades.bag))) break;
        }
        if (boughtCount > 0) {
            showMessage(`🎣 ${bot.name} bought ${boughtCount} Premium Baits!`);
            playSound('sell');
        }
        return;
    }

    const currentLvl = bot.upgrades[type];
    const item = UPGRADE_ITEMS[type][currentLvl];
    if (item && bot.money >= item.price) {
        bot.money -= item.price;
        bot.upgrades[type]++;
        showMessage(`✨ ${bot.name} upgraded their ${type} to ${item.name}!`);
        updateLeaderboard();
    }
}

function triggerBotReaction(event, fish, sourceBot = null) {
    const reactions = {
        player_catch_rare: [
            "Nice catch! But I'll get a bigger one.",
            "Beginner's luck, surely...",
            "Whoa, how did you reel that in?",
            "I need to upgrade my rod if you're catching those!",
            "Save some fish for me too!"
        ],
        bot_catch_rare: [
            "BOOM! My strategy is paying off!",
            "Take a look at this beauty!",
            "Legendary fish for a legendary fisherman.",
            "The leaderboard is mine now!",
            "Hard work beats luck every time."
        ]
    };

    const pool = reactions[event];
    const message = pool[Math.floor(Math.random() * pool.length)];

    // Pick a random bot to comment if player caught it, or the source bot if bot caught it
    const randomBot = state.bots[Math.floor(Math.random() * state.bots.length)];
    const speaker = sourceBot || randomBot;

    setTimeout(() => {
        showMessage(`💬 ${speaker.name}: "${message}"`);
    }, 1500); // Delayed reaction for realism
}

function initAudio() {
    if (state.audio.isPlaying) return;
    state.audio.isPlaying = true;

    // Chill Lofi/Ambient Track: Local File (User Provided)
    const bgmUrl = 'music/back_music.mp3';
    audioLoader.load(bgmUrl, (buffer) => {
        if (sounds.bgm.isPlaying) return; // Prevent double playing
        sounds.bgm.setBuffer(buffer);
        sounds.bgm.setLoop(true);
        sounds.bgm.setVolume(0.5);
        if (!state.audio.muted) sounds.bgm.play();
    });
}

soundToggle.onclick = () => {
    state.audio.muted = !state.audio.muted;
    soundToggle.textContent = state.audio.muted ? '🔇' : '🔊';

    if (state.audio.muted) {
        if (sounds.bgm.isPlaying) sounds.bgm.pause();
    } else {
        if (!state.audio.isPlaying) {
            initAudio();
        } else if (!sounds.bgm.isPlaying) {
            sounds.bgm.play();
        }
    }
};





// --- Game Loop Logic ---
startBtn.onclick = () => {
    state.gameStarted = true;
    startScreen.style.opacity = '0';
    setTimeout(() => startScreen.classList.add('hidden'), 500);
    uiOverlay.classList.remove('hidden');

    // Init Audio (solving autoplay policy)
    initAudio();

    // Initialize UI
    updateInventoryUI();

    // Lock pointer to start
    controls.lock();
};

finishBtn.onclick = () => {
    endGame();
};

function endGame() {
    controls.unlock();
    document.exitPointerLock();

    // Stop Audio
    if (sounds.bgm && sounds.bgm.isPlaying) sounds.bgm.stop();

    // Calculate Stats
    const totalFish = state.inventory.length;
    const totalMoney = state.money;
    const rank = getPlayerRank();

    // Populate Modal
    gameStatsEl.innerHTML = `
        <div class="stat-row"><span>🐟 Ikan Tertangkap:</span> <b>${totalFish}</b></div>
        <div class="stat-row"><span>💰 Total Uang:</span> <b>$${totalMoney}</b></div>
        <div class="stat-row"><span>🏆 Peringkat:</span> <b>Rank #${rank}</b></div>
    `;

    gameOverModal.classList.remove('hidden');
    // Hide other UI
    uiOverlay.classList.add('hidden');
    shopModal.classList.add('hidden');
    invModal.classList.add('hidden');

    // Proactively show pointer for the restart button
    document.body.style.cursor = 'default';
}

function getPlayerRank() {
    // Quick calc of rank based on current leaderboard logic
    const players = [
        { name: 'You', money: state.money },
        ...state.bots.map(b => ({ name: b.name, money: b.money }))
    ];
    players.sort((a, b) => b.money - a.money);
    const myIndex = players.findIndex(p => p.name === 'You');
    return myIndex + 1;
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
