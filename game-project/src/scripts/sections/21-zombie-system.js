export default `
// =========================================================
// ZOMBIE SYSTEM
// =========================================================

const ZOMBIE_PATH = 'assets/enemy/animated_zombie_cop_running_loop.glb';

// Fixed scale — the GLB is in mm units; 0.012 produces human-sized (~1.8 world-unit) zombies.
// Fixed scale — 0.032 matches player eye-level perfectly at 3.0 units tall
const ZOMBIE_SCALE = 0.032;

// Approximate visual height in world units (used for health-bar projection only)
const ZOMBIE_VISUAL_HEIGHT = 3.2;

const ZOMBIE_SPEED_BASE = 1.8;
const ZOMBIE_ATTACK_RANGE = 3.2;
const ZOMBIE_ATTACK_DAMAGE = 8;
const ZOMBIE_ATTACK_RATE = 1.2;
const ZOMBIE_MAX_HP = 100;
const ZOMBIE_SPAWN_RADIUS = 40;
const MAX_ZOMBIES = 35;

const SPAWN_ARCS = [
    0, 45, 90, 135,
    180, 225, 270, 315
];

// =========================================================
// STATE VARIABLES
// =========================================================

let zombieTemplate = null;
const zombies = [];
const zombieMeshMap = new Map();

let killCount = 0;
let currentWave = 0;

let waveActive = false;
let waveZombiesLeft = 0;
let waveZombiesSpawned = 0;
let waveSpawnTotal = 0;

let waveSpawnTimer = 0;
let waveSpawnInterval = 1.8;

let betweenWaveTimer = 0;
const BETWEEN_WAVE_DELAY = 6;

// =========================================================
// UI ELEMENTS
// =========================================================

const waveNumEl = document.getElementById('wave-num');
const zombieCountEl = document.getElementById('zombie-count');
const scoreValEl = document.getElementById('score-val');

const bloodFlash = document.getElementById('blood-flash');
const deathScreen = document.getElementById('death-screen');

const waveAnnounce = document.getElementById('wave-announce');
const waveAnnTitle = document.getElementById('wave-announce-title');
const waveAnnSub = document.getElementById('wave-announce-sub');

const zombieHbarsContainer = document.getElementById('zombie-hbars');

// =========================================================
// PLAYER STATE
// =========================================================

let playerDead = false;
`;