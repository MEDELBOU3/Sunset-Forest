import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import sections from './sections/index.js';

const GUEST_STORAGE_KEY = 'sunset-forest-guest-profile';

let firebaseApiPromise = null;
let multiplayerApiPromise = null;
let multiplayerClient = null;
let multiplayerBootstrapped = false;
let multiplayerTicking = false;
const remotePlayers = new Map();

function loadFirebaseApi() {
    firebaseApiPromise ??= import('./net/firebase-client.js');
    return firebaseApiPromise;
}

function loadMultiplayerApi() {
    multiplayerApiPromise ??= import('./net/multiplayer-client.js');
    return multiplayerApiPromise;
}

function randomIdPart(length = 10) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let out = '';
    for (let i = 0; i < length; i += 1) {
        out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
}

function createGuestProfile() {
    const callsigns = ['RANGER', 'SHADOW', 'FALCON', 'EMBER', 'HUNTER', 'VIPER', 'NOVA', 'GHOST'];
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    return {
        uid: `guest_${randomIdPart(12)}`,
        displayName: `${callsigns[Math.floor(Math.random() * callsigns.length)]}-${suffix}`,
        isGuest: true
    };
}

function readGuestProfile() {
    try {
        const raw = localStorage.getItem(GUEST_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.uid || !parsed.displayName) return null;
        return parsed;
    } catch {
        return null;
    }
}

function storeGuestProfile(profile) {
    try {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(profile));
    } catch {
        // Ignore storage failures and keep the in-memory guest profile.
    }
    window.__sunsetForestGuestProfile = profile;
    return profile;
}

function ensureGuestProfile() {
    return window.__sunsetForestGuestProfile || storeGuestProfile(readGuestProfile() || createGuestProfile());
}

function ensureRuntimeUiScaffold() {
    const aliasId = (selector, id) => {
        if (document.getElementById(id)) return;
        const node = document.querySelector(selector);
        if (node) node.id = id;
    };

    aliasId('.vignette', 'vignette');
    aliasId('#weapon-display', 'weapon-name');
    aliasId('#ammo-clip', 'ammo-count');
    if (!document.getElementById('ammo-max')) aliasId('#ammo-reserve', 'ammo-max');
    aliasId('#loot-sub', 'interact-text');

    if (!document.getElementById('ammo-pips')) {
        const ammoCountWrap = document.querySelector('#panel-br .ammo-count');
        if (ammoCountWrap) {
            ammoCountWrap.insertAdjacentHTML('afterend', '<div id="ammo-pips" class="ammo-pips"></div>');
        }
    }

    if (!document.getElementById('ammo-reserve')) {
        const ammoLabelEl = document.querySelector('#panel-br .ammo-label');
        if (ammoLabelEl) {
            ammoLabelEl.insertAdjacentHTML('afterend', '<div class="ammo-reserve-wrap"><span id="ammo-reserve">0</span></div>');
        }
    }

    if (!document.getElementById('wp-slots-container')) {
        const inventoryPanel = document.getElementById('inventory-panel');
        const mushroomSlot = document.getElementById('slot-mushroom');
        if (inventoryPanel && mushroomSlot) {
            mushroomSlot.insertAdjacentHTML('afterend', '<div id="wp-slots-container" class="cod-loadout"></div>');
        } else {
            const weaponPanel = document.getElementById('panel-br');
            if (weaponPanel) {
                weaponPanel.insertAdjacentHTML('beforeend', '<div id="wp-slots-container" class="cod-loadout"></div>');
            }
        }
    } else {
        const slots = document.getElementById('wp-slots-container');
        const inventoryPanel = document.getElementById('inventory-panel');
        const mushroomSlot = document.getElementById('slot-mushroom');
        if (slots && inventoryPanel && mushroomSlot && slots.parentElement !== inventoryPanel) {
            mushroomSlot.insertAdjacentElement('afterend', slots);
        }
    }

    if (!document.getElementById('reload-wrap')) {
        const reloadBarWrap = document.getElementById('reload-bar-wrap');
        if (reloadBarWrap) {
            reloadBarWrap.insertAdjacentHTML('beforebegin', '<div id="reload-wrap"></div>');
            document.getElementById('reload-wrap')?.appendChild(reloadBarWrap);
        }
    }

    const missingIds = [
        'cursor',
        'thermal-tint',
        'thermal-canvas',
        'scope-overlay',
        'aim-overlay',
        'compass-dir',
        'notifications',
        'minimap-canvas',
        'minimap-village-dist',
        'stamina-sprint-label',
        'vehicle-hud',
        'vehicle-speed-value',
        'blood-flash',
        'score-val',
        'wave-num',
        'zombie-count',
        'wave-announce',
        'wave-announce-title',
        'wave-announce-sub',
        'zombie-hbars',
        'death-screen',
        'respawn-btn',
        'slot-mushroom',
        'mushroom-qty',
        'weapon-wheel',
        'ww-svg',
        'ww-name',
        'ww-sub',
        'hud-speed',
        'hud-rpm',
        'hud-temp',
        'hud-gear',
        'speed-arc-fill',
        'rpm-fill',
        'temp-fill',
        'gear-stick'
    ];

    if (missingIds.every((id) => document.getElementById(id))) return;

    document.body.insertAdjacentHTML(
        'beforeend',
        `
        <div id="cursor" aria-hidden="true"></div>
        <div id="notifications" aria-live="polite"></div>
        <div id="compass" aria-hidden="true"><div id="compass-dir">N</div></div>
        <div id="minimap-wrap" aria-hidden="true">
            <canvas id="minimap-canvas" width="110" height="110"></canvas>
            <div class="minimap-label">Sector Map</div>
            <div id="minimap-village-dist" class="minimap-village-dist"></div>
        </div>
        <div id="stamina-sprint-label" aria-hidden="true">Sprint</div>
        <div id="aim-overlay" aria-hidden="true">
            <div class="aim-ring"></div>
            <div class="aim-hline"></div>
            <div class="aim-vline"></div>
            <div class="aim-label">AIM</div>
        </div>
        <div id="thermal-tint" aria-hidden="true"></div>
        <canvas id="thermal-canvas" aria-hidden="true"></canvas>
        <div id="scope-overlay" aria-hidden="true">
            <div class="scope-reticle-h"></div>
            <div class="scope-reticle-v"></div>
            <div class="scope-frame"></div>
        </div>
        <div id="blood-flash" aria-hidden="true"></div>
        <div id="zombie-hbars" aria-hidden="true"></div>
        <div id="wave-hud" aria-hidden="true">
            <div id="wave-label">Wave <span id="wave-num">1</span></div>
            <div id="wave-zombies"><span id="zombie-count">0</span> hostiles</div>
        </div>
        <div id="score-hud" aria-hidden="true">
            <div id="score-label">Score</div>
            <div id="score-val">0</div>
        </div>
        <div id="wave-announce" aria-hidden="true">
            <div id="wave-announce-title" class="wave-announce-title">Wave 1</div>
            <div id="wave-announce-sub" class="wave-announce-sub">Hold the line</div>
        </div>
        <div id="vehicle-hud" aria-hidden="true">
            <div id="dash-warnings">
                <div class="warning-title">ARMORED VEHICLE</div>
                <div class="warning-text">WASD DRIVE · SHIFT BOOST · E EXIT</div>
            </div>
            <div id="dash-left">
                <div class="dash-gauge">
                    <svg viewBox="0 0 100 56" aria-hidden="true">
                        <path class="gauge-bg" d="M10,50 A40,40 0 0 1 90,50"></path>
                        <path id="rpm-fill" class="gauge-fill" d="M10,50 A40,40 0 0 1 90,50"></path>
                    </svg>
                    <div id="hud-rpm" class="gauge-value">0.00<small> RPM</small></div>
                </div>
                <div class="dash-gauge">
                    <svg viewBox="0 0 100 56" aria-hidden="true">
                        <path class="gauge-bg" d="M10,50 A40,40 0 0 1 90,50"></path>
                        <path id="temp-fill" class="gauge-fill" d="M10,50 A40,40 0 0 1 90,50"></path>
                    </svg>
                    <div id="hud-temp" class="gauge-value">65°<small>TEMP</small></div>
                </div>
            </div>
            <div id="dash-right">
                <div class="gearbox">
                    <div class="gear-map">
                        <div class="g-row"><span>1</span><span>3</span><span>5</span></div>
                        <div class="g-line"></div>
                        <div class="g-row"><span>2</span><span>4</span><span>R</span></div>
                        <div id="gear-stick"></div>
                    </div>
                    <div id="hud-gear">N</div>
                </div>
                <div class="speed-cluster">
                    <svg class="speed-svg" viewBox="0 0 140 140" aria-hidden="true">
                        <circle class="arc-bg" cx="70" cy="70" r="48"></circle>
                        <circle id="speed-arc-fill" class="arc-fill" cx="70" cy="70" r="48"></circle>
                    </svg>
                    <div class="speed-value">
                        <span id="hud-speed">0</span>
                        <small>KM/H</small>
                    </div>
                </div>
            </div>
        </div>
        <div id="inventory-panel" aria-hidden="true">
            <div class="inv-title">Inventory</div>
            <div id="slot-mushroom" class="inv-slot empty">
                <span id="mushroom-icon">M</span>
                <span>Mushroom</span>
                <span id="mushroom-qty">0</span>
            </div>
        </div>
        <div id="weapon-wheel" aria-hidden="true">
            <div class="weapon-wheel-inner">
                <svg id="ww-svg" viewBox="-220 -220 440 440"></svg>
                <div id="ww-name">Select</div>
                <div id="ww-sub">Q close</div>
            </div>
        </div>
        <div id="death-screen" aria-hidden="true">
            <div class="death-title">You Died</div>
            <div class="death-sub">The forest is not done with you yet.</div>
            <button id="respawn-btn" class="death-btn" type="button">Respawn</button>
        </div>
        `
    );
}

function normalizeUser(user) {
    if (!user) return null;
    return {
        uid: user.uid,
        displayName: user.displayName || user.email || `PLAYER-${String(user.uid).slice(0, 6).toUpperCase()}`,
        email: user.email || '',
        isGuest: false
    };
}

function getRuntimeContext() {
    return window.__sunsetForestRuntime || null;
}

function getActiveProfile() {
    return window.__sunsetForestAuthedUser || window.__sunsetForestGuestProfile || null;
}

function makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
    ctx.fillRect(0, 18, canvas.width, 50);
    ctx.strokeStyle = 'rgba(210, 160, 72, 0.9)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 20, canvas.width - 4, 46);
    ctx.font = '700 30px "Barlow Condensed", sans-serif';
    ctx.fillStyle = '#f3e2b0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text || 'SURVIVOR').slice(0, 20), canvas.width / 2, 44);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2.8, 0.7, 1);
    return sprite;
}

function ensureRemotePlayer(id, profile = {}) {
    const runtime = getRuntimeContext();
    if (!runtime || !runtime.scene) return null;
    const existing = remotePlayers.get(id);
    if (existing) {
        if (profile.name && existing.name !== profile.name) {
            existing.name = profile.name;
            existing.group.remove(existing.label);
            existing.label.material.map.dispose();
            existing.label.material.dispose();
            existing.label = makeTextSprite(profile.name);
            existing.label.position.set(0, 1.65, 0);
            existing.group.add(existing.label);
        }
        return existing;
    }

    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.28, 1.0, 4, 8),
        new THREE.MeshStandardMaterial({
            color: 0xc69333,
            roughness: 0.4,
            metalness: 0.2,
            emissive: 0x2a1705
        })
    );
    body.castShadow = true;

    const group = new THREE.Group();
    group.add(body);

    const label = makeTextSprite(profile.name || String(id).slice(0, 8).toUpperCase());
    label.position.set(0, 1.65, 0);
    group.add(label);
    runtime.scene.add(group);

    const remote = {
        id,
        name: profile.name || '',
        group,
        label,
        targetPos: new THREE.Vector3(),
        targetRotY: 0
    };
    remotePlayers.set(id, remote);
    return remote;
}

function removeRemotePlayer(id) {
    const runtime = getRuntimeContext();
    const remote = remotePlayers.get(id);
    if (!remote || !runtime || !runtime.scene) return;
    runtime.scene.remove(remote.group);
    remote.label.material.map.dispose();
    remote.label.material.dispose();
    remote.group.traverse((node) => {
        if (node.isMesh) {
            node.geometry?.dispose?.();
            node.material?.dispose?.();
        }
    });
    remotePlayers.delete(id);
}

async function getAuthPayload() {
    try {
        const fb = await loadFirebaseApi();
        const token = await fb.getIdToken();
        if (token) return { token };
    } catch {
        // Firebase is optional here; we fall back to a generated guest identity.
    }

    const guest = ensureGuestProfile();
    return {
        guest: {
            id: guest.uid,
            name: guest.displayName
        }
    };
}

function startMultiplayerTicker() {
    if (multiplayerTicking) return;
    multiplayerTicking = true;

    const tick = () => {
        requestAnimationFrame(tick);

        const runtime = getRuntimeContext();
        if (!runtime) return;

        for (const remote of remotePlayers.values()) {
            remote.group.position.lerp(remote.targetPos, 0.18);
            remote.group.rotation.y = THREE.MathUtils.lerp(remote.group.rotation.y, remote.targetRotY, 0.18);
        }

        if (!multiplayerClient || !runtime.controls || !runtime.controls.isLocked || !runtime.camera) return;
        multiplayerClient.sendState({
            pos: {
                x: runtime.camera.position.x,
                y: runtime.camera.position.y,
                z: runtime.camera.position.z
            },
            rotY: runtime.camera.rotation.y
        });
    };

    requestAnimationFrame(tick);
}

async function ensureMultiplayerConnected() {
    const runtime = getRuntimeContext();
    if (!runtime || !runtime.scene || !runtime.camera || !runtime.controls) return;

    if (!multiplayerClient) {
        const mp = await loadMultiplayerApi();
        multiplayerClient = mp.createMultiplayerClient({
            room: 'lobby',
            getAuthPayload
        });

        multiplayerClient.on((evt) => {
            const selfId = multiplayerClient?.playerId;
            if (evt.t === 'snapshot' && Array.isArray(evt.players)) {
                for (const player of evt.players) {
                    if (!player || !player.id || player.id === selfId) continue;
                    const remote = ensureRemotePlayer(player.id, player.profile || {});
                    if (!remote) continue;
                    remote.targetPos.set(
                        player.pos?.x ?? 0,
                        player.pos?.y ?? 0,
                        player.pos?.z ?? 0
                    );
                    remote.targetRotY = player.rotY || 0;
                }

                for (const remoteId of [...remotePlayers.keys()]) {
                    if (!evt.players.some((player) => player?.id === remoteId)) {
                        removeRemotePlayer(remoteId);
                    }
                }
            }

            if (evt.t === 'player_leave') {
                removeRemotePlayer(evt.playerId);
            }
        });
    }

    if (!multiplayerBootstrapped) {
        multiplayerBootstrapped = true;
        startMultiplayerTicker();
    }

    await multiplayerClient.connect();
}

function installMenuFallbacks() {
    const authModal = document.getElementById('auth-modal-overlay');
    const authTrigger = document.getElementById('corner-auth-trigger');
    const modalClose = document.getElementById('modal-close');
    const playBtn = document.getElementById('play-btn');
    const guestLink = document.getElementById('guest-access-link');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const googleAuthBtn = document.getElementById('google-auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const authStatusMsg = document.getElementById('auth-status-msg');
    const authNameInput = document.getElementById('player-name-input');
    const authEmailInput = document.getElementById('email-input');
    const authPassInput = document.getElementById('password-input');
    const authLoggedOut = document.getElementById('auth-logged-out');
    const authLoggedIn = document.getElementById('auth-logged-in');
    const displayPlayerName = document.getElementById('display-player-name');
    const displayPlayerId = document.getElementById('display-player-id');
    const cornerProfileCard = document.getElementById('corner-profile-card');
    const miniName = document.getElementById('mini-name');

    const setStatus = (message, isError = false) => {
        if (!authStatusMsg) return;
        authStatusMsg.textContent = String(message || '').toUpperCase();
        authStatusMsg.style.color = isError ? '#ff6666' : 'rgba(255, 255, 255, 0.34)';
    };

    const openAuthModal = (statusMessage = 'READY FOR CONNECTION') => {
        if (!authModal) return;
        authModal.classList.remove('auth-hidden');
        authModal.style.display = 'flex';
        authModal.setAttribute('aria-hidden', 'false');
        setStatus(statusMessage, false);
    };

    const closeAuthModal = () => {
        if (!authModal) return;
        authModal.classList.add('auth-hidden');
        authModal.style.display = 'none';
        authModal.setAttribute('aria-hidden', 'true');
    };

    const updateIdentityUi = (profile) => {
        if (!authTrigger || !authLoggedOut || !authLoggedIn || !cornerProfileCard) return;
        if (!profile) {
            authTrigger.classList.remove('auth-hidden');
            authLoggedOut.classList.remove('auth-hidden');
            authLoggedIn.classList.add('auth-hidden');
            cornerProfileCard.classList.add('auth-hidden');
            return;
        }

        authTrigger.classList.add('auth-hidden');
        authLoggedOut.classList.add('auth-hidden');
        authLoggedIn.classList.remove('auth-hidden');
        cornerProfileCard.classList.remove('auth-hidden');

        if (displayPlayerName) displayPlayerName.textContent = profile.displayName;
        if (displayPlayerId) displayPlayerId.textContent = `ID: ${String(profile.uid).slice(0, 8).toUpperCase()}`;
        if (miniName) miniName.textContent = String(profile.displayName).split(' ')[0].toUpperCase();
    };

    const enterGame = (forceGuest = false) => {
        let profile = getActiveProfile();

        if (!profile || forceGuest) {
            profile = ensureGuestProfile();
            updateIdentityUi(profile);
        }

        setStatus(`CONNECTED AS ${profile.displayName}`);
        closeAuthModal();

        if (typeof window.__sunsetForestLockControls === 'function') {
            try {
                window.__sunsetForestLockControls();
            } catch (error) {
                console.error('Game engine lock failed:', error);
            }
        } else if (document.body.requestPointerLock) {
            document.body.requestPointerLock();
            const blocker = document.getElementById('blocker');
            const hud = document.getElementById('hud');
            if (blocker) {
                blocker.classList.add('hidden');
                blocker.style.display = 'none';
            }
            if (hud) hud.classList.add('visible');
        }

        ensureMultiplayerConnected().catch((error) => {
            console.warn('Multiplayer connection failed:', error);
        });
    };

    const handleAuthSubmit = async () => {
        const email = authEmailInput?.value.trim() || '';
        const password = authPassInput?.value || '';
        const requestedName = authNameInput?.value.trim() || '';

        if (!email || !password) {
            setStatus('EMAIL AND PASSWORD REQUIRED', true);
            return;
        }

        setStatus('CONNECTING TO FIREBASE...');

        try {
            const fb = await loadFirebaseApi();

            try {
                await fb.loginEmail(email, password);
                if (requestedName) await fb.updateDisplayName(requestedName);
            } catch (error) {
                if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
                    setStatus('CREATING NEW ACCOUNT...');
                    await fb.registerEmail(email, password, requestedName);
                } else {
                    throw error;
                }
            }

            const profile = normalizeUser(fb.auth.currentUser);
            if (profile) {
                window.__sunsetForestAuthedUser = profile;
                updateIdentityUi(profile);
                setStatus(`SIGNED IN AS ${profile.displayName}`);
                closeAuthModal();
                await ensureMultiplayerConnected();
            }
        } catch (error) {
            console.error('Auth submit failed:', error);
            setStatus(error?.message || 'AUTH FAILED', true);
        }
    };

    const handleGoogleLogin = async () => {
        setStatus('OPENING GOOGLE...');

        try {
            const fb = await loadFirebaseApi();
            await fb.loginGoogle();
            const profile = normalizeUser(fb.auth.currentUser);
            if (profile) {
                window.__sunsetForestAuthedUser = profile;
                updateIdentityUi(profile);
                setStatus(`SIGNED IN AS ${profile.displayName}`);
                closeAuthModal();
                await ensureMultiplayerConnected();
            }
        } catch (error) {
            console.error('Google login failed:', error);
            setStatus(error?.message || 'GOOGLE LOGIN FAILED', true);
        }
    };

    const handleLogout = async () => {
        try {
            const fb = await loadFirebaseApi();
            await fb.logout();
        } catch (error) {
            console.error('Logout failed:', error);
            setStatus(error?.message || 'LOGOUT FAILED', true);
        }
    };

    if (authModal) {
        authModal.style.display = authModal.classList.contains('auth-hidden') ? 'none' : 'flex';
        authModal.setAttribute('aria-hidden', authModal.classList.contains('auth-hidden') ? 'true' : 'false');
    }

    if (authTrigger && !authTrigger.dataset.fallbackBound) {
        authTrigger.dataset.fallbackBound = 'true';
        authTrigger.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openAuthModal();
        });
    }

    if (modalClose && !modalClose.dataset.fallbackBound) {
        modalClose.dataset.fallbackBound = 'true';
        modalClose.addEventListener('click', closeAuthModal);
    }

    if (authModal && !authModal.dataset.fallbackBound) {
        authModal.dataset.fallbackBound = 'true';
        authModal.addEventListener('click', (event) => {
            if (event.target === authModal) closeAuthModal();
        });
    }

    if (guestLink && !guestLink.dataset.fallbackBound) {
        guestLink.dataset.fallbackBound = 'true';
        guestLink.addEventListener('click', () => {
            enterGame(true);
        });
    }

    if (playBtn && !playBtn.dataset.fallbackBound) {
        playBtn.dataset.fallbackBound = 'true';
        playBtn.addEventListener('click', () => {
            enterGame(false);
        });
    }

    if (authSubmitBtn && !authSubmitBtn.dataset.fallbackBound) {
        authSubmitBtn.dataset.fallbackBound = 'true';
        authSubmitBtn.addEventListener('click', handleAuthSubmit);
    }

    if (googleAuthBtn && !googleAuthBtn.dataset.fallbackBound) {
        googleAuthBtn.dataset.fallbackBound = 'true';
        googleAuthBtn.addEventListener('click', handleGoogleLogin);
    }

    if (logoutBtn && !logoutBtn.dataset.fallbackBound) {
        logoutBtn.dataset.fallbackBound = 'true';
        logoutBtn.addEventListener('click', handleLogout);
    }

    for (const inputEl of [authNameInput, authEmailInput, authPassInput]) {
        if (!inputEl || inputEl.dataset.enterBound) continue;
        inputEl.dataset.enterBound = 'true';
        inputEl.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') handleAuthSubmit();
        });
    }

    updateIdentityUi(getActiveProfile());

    loadFirebaseApi().then((fb) => {
        fb.watchAuth((user) => {
            const profile = normalizeUser(user);
            window.__sunsetForestAuthedUser = profile;
            updateIdentityUi(profile || window.__sunsetForestGuestProfile || null);
            if (profile) {
                setStatus(`SIGNED IN AS ${profile.displayName}`);
                ensureMultiplayerConnected().catch((error) => {
                    console.warn('Unable to connect multiplayer after auth:', error);
                });
            }
        });
    }).catch((error) => {
        console.warn('Firebase unavailable, guest mode remains active:', error);
    });
}

ensureRuntimeUiScaffold();

const source = ['"use strict";', ...sections].join('\n')
    .replace(
        "scene.add(root);\n                CollisionSystem.registerMesh(root, 'car');\n                armoredCar.root = root;\n                armoredCar.loaded = true;",
        "scene.add(root);\n                armoredCar.root = root;\n                armoredCar.loaded = true;"
    )
   .replace(
        "const throttle = Number(moveState.forward) - Number(moveState.backward);\n            const steer = Number(moveState.left) - Number(moveState.right);",
        "const throttle = Number(moveState.backward) - Number(moveState.forward);\n            const steer = Number(moveState.right) - Number(moveState.left);"
    )
    .replace(
        "getNearbyArmoredCar = function () {\n            if (!armoredCar.loaded || !armoredCar.root || armoredCar.active) return null;\n\n            armoredCar.root.updateMatrixWorld(true);\n            armoredCarInteractBox.setFromObject(armoredCar.root);\n\n            if (armoredCarInteractBox.isEmpty()) {\n                const dx = camera.position.x - armoredCar.root.position.x;\n                const dz = camera.position.z - armoredCar.root.position.z;\n                return ((dx * dx) + (dz * dz) <= 8.5 * 8.5) ? armoredCar : null;\n            }\n\n            const margin = 1.35;\n            const px = camera.position.x;\n            const pz = camera.position.z;\n            const minX = armoredCarInteractBox.min.x - margin;\n            const maxX = armoredCarInteractBox.max.x + margin;\n            const minZ = armoredCarInteractBox.min.z - margin;\n            const maxZ = armoredCarInteractBox.max.z + margin;\n\n            if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {\n                return armoredCar;\n            }\n\n            const clampedX = Math.max(minX, Math.min(px, maxX));\n            const clampedZ = Math.max(minZ, Math.min(pz, maxZ));\n            const dx = px - clampedX;\n            const dz = pz - clampedZ;\n\n            return ((dx * dx) + (dz * dz) <= 1.2 * 1.2) ? armoredCar : null;\n        };",
        "getNearbyArmoredCar = function () {\n            if (!armoredCar.loaded || !armoredCar.root || armoredCar.active) return null;\n            const dx = camera.position.x - armoredCar.root.position.x;\n            const dz = camera.position.z - armoredCar.root.position.z;\n            return ((dx * dx) + (dz * dz) <= 8.5 * 8.5) ? armoredCar : null;\n        };"
    )
    .replace(
        "function tryInteract() {\n            if (!controls.isLocked) return;\n            if (tryVehicleInteract()) return;\n            if (!performInteraction()) {\n                showNotification('Nothing to pick up');\n            }\n        }",
        "function tryInteract() {\n            if (!controls.isLocked) return;\n            if (getNearbyArmoredCar() || armoredCar.active) {\n                tryVehicleInteract();\n                return;\n            }\n            if (!performInteraction()) {\n                showNotification('Nothing to pick up');\n            }\n        }"
    )
    .replace(
        "            if (!isPaused && !playerDead) { \n                isPaused = true; \n                if (pauseMenu) pauseMenu.classList.add('visible'); \n            }\n            setVehicleHudVisible(false);",
        "            if (!isPaused && !playerDead) { \n                isPaused = true; \n                if (pauseMenu) pauseMenu.classList.add('visible'); \n            }\n            if (!armoredCar.active) setVehicleHudVisible(false);"
    );
const runGame = new Function('THREE', 'GLTFLoader', 'FBXLoader', 'PointerLockControls', source);

try {
    runGame(THREE, GLTFLoader, FBXLoader, PointerLockControls);
} catch (error) {
    console.error('Game runtime initialization failed; enabling menu fallbacks.', error);
}

installMenuFallbacks();
