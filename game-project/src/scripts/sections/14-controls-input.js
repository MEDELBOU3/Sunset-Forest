export default String.raw`
        // =========================================================
        // CONTROLS & INPUT
        // =========================================================
        const controls = new PointerLockControls(camera, document.body);
        const blocker = document.getElementById('blocker');
        const hud = document.getElementById('hud');
        const pauseMenu = document.getElementById('pause-menu');
        const scopeOverlay = document.getElementById('scope-overlay');
        const aimOverlay = document.getElementById('aim-overlay');
        const crosshairEl = document.getElementById('crosshair');
        const playBtn = document.getElementById('play-btn');
        const resumeBtn = document.getElementById('resume-btn');
        let isPaused = false;

        function lockControls() {
            controls.lock();
            if (THREE.AudioContext.getContext().state === 'suspended') THREE.AudioContext.getContext().resume();
        }
        window.__sunsetForestLockControls = lockControls;
        window.__sunsetForestRuntime = { controls, camera, scene };
        if (playBtn) playBtn.addEventListener('click', lockControls);
        if (resumeBtn) resumeBtn.addEventListener('click', lockControls);

        controls.addEventListener('lock', () => {
            if (blocker) {
                blocker.style.transition = 'opacity 0.8s ease';
                blocker.style.opacity = '0';
                setTimeout(() => {
                    blocker.classList.add('hidden');
                    blocker.style.display = 'none';
                }, 800);
            }

            if (hud) hud.classList.add('visible');
            isPaused = false;
            if (pauseMenu) pauseMenu.classList.remove('visible');
            if (armoredCar.active) setVehicleHudVisible(true);

            if (menuMusic.isPlaying) {
                const interval = setInterval(() => {
                    const vol = menuMusic.getVolume();
                    if (vol > 0.02) {
                        menuMusic.setVolume(vol - 0.02);
                    } else {
                        menuMusic.pause();
                        menuMusic.setVolume(0.3);
                        clearInterval(interval);
                    }
                }, 50);
            }

            if (natureSound.buffer && !natureSound.isPlaying) natureSound.play();
            if (slowBreathingSound.buffer && !slowBreathingSound.isPlaying) slowBreathingSound.play();
            if (strongBreathingSound.buffer && !strongBreathingSound.isPlaying) strongBreathingSound.play();
        });

        controls.addEventListener('unlock', () => {
            if (!isPaused && !playerDead) {
                isPaused = true;
                if (pauseMenu) pauseMenu.classList.add('visible');
            }
            setVehicleHudVisible(false);

            if (blocker && !menuMusic.isPlaying && !blocker.classList.contains('hidden') && blocker.style.display !== 'none') {
                menuMusic.setVolume(0.3);
                menuMusic.play();
            }
        });

        const moveState = { forward: false, backward: false, left: false, right: false, sprint: false };
        const velocity = new THREE.Vector3();
        const direction = new THREE.Vector3();
        let isSprinting = false;
        let breathMix = 0;

        document.addEventListener('keydown', e => {
            if (armoredCar.active) {
                switch (e.code) {
                    case 'KeyW':
                    case 'KeyA':
                    case 'KeyS':
                    case 'KeyD':
                    case 'ShiftLeft':
                    case 'ShiftRight':
                    case 'KeyE':
                        break;
                    default:
                        return;
                }
            }

            switch (e.code) {
                case 'KeyW': moveState.forward = true; break;
                case 'KeyA': moveState.left = true; break;
                case 'KeyS': moveState.backward = true; break;
                case 'KeyD': moveState.right = true; break;
                case 'Space':
                    if (armoredCar.active) break;
                    if (!playerStats.isJumping && !playerStats.isCrouching) {
                        playerStats.isJumping = true;
                        playerStats.verticalVelocity = 7.5;
                    }
                    break;
                case 'KeyC':
                    if (armoredCar.active) break;
                    playerStats.isCrouching = !playerStats.isCrouching;
                    if (!isADS) camera.fov = playerStats.isCrouching ? 68 : 75;
                    camera.updateProjectionMatrix();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    moveState.sprint = true;
                    break;
                case 'KeyR':
                    if (!armoredCar.active) startReload();
                    break;
                case 'KeyE':
                    tryInteract();
                    break;
                case 'KeyF':
                    if (armoredCar.active) break;
                    if (mushroomCount > 0) {
                        mushroomCount--;
                        updateInventoryPanel();
                        playerStats.health = Math.min(playerStats.maxHealth, playerStats.health + 30);
                        updateHealthHUD();
                        if (slurpSound.buffer) {
                            if (slurpSound.isPlaying) slurpSound.stop();
                            slurpSound.play();
                        }
                        showNotification('+30 HP - Mushroom consumed');
                    } else {
                        showNotification('No mushrooms in inventory');
                    }
                    break;
                case 'KeyT':
                    if (armoredCar.active) break;
                    if (!weapons[currentWeaponKey] || !weapons[currentWeaponKey].acceptsLootedScope) {
                        showNotification('This weapon cannot use the thermal scope');
                        break;
                    }
                    if (!playerHasScope) {
                        showNotification('Loot the thermal scope first');
                        break;
                    }
                    if (!isADS) {
                        showNotification('Aim first (RMB) to use thermal');
                        break;
                    }
                    if (thermalActive) disableThermal();
                    else enableThermal();
                    break;
                case 'KeyQ':
                    if (armoredCar.active) break;
                    if (wwOpen) closeWheel(true);
                    else if (controls.isLocked) openWheel();
                    break;
                case 'ArrowLeft':
                    if (armoredCar.active) break;
                    wwNavigate(-1);
                    break;
                case 'ArrowRight':
                    if (armoredCar.active) break;
                    wwNavigate(1);
                    break;
                case 'Enter':
                    if (armoredCar.active) break;
                    if (wwOpen) closeWheel(true);
                    break;
            }
        });

        document.addEventListener('keyup', e => {
            if (armoredCar.active) {
                switch (e.code) {
                    case 'KeyW':
                    case 'KeyA':
                    case 'KeyS':
                    case 'KeyD':
                    case 'ShiftLeft':
                    case 'ShiftRight':
                        break;
                    default:
                        return;
                }
            }

            switch (e.code) {
                case 'KeyW': moveState.forward = false; break;
                case 'KeyA': moveState.left = false; break;
                case 'KeyS': moveState.backward = false; break;
                case 'KeyD': moveState.right = false; break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    moveState.sprint = false;
                    break;
            }
        });

        let lastFireTime = 0;
        let isLeftMouseDown = false;
        let leftMouseDownAt = 0;
        const AUTO_FIRE_HOLD_DELAY = 0.18;

        document.addEventListener('mousedown', e => {
            if (!controls.isLocked) return;
            if (armoredCar.active) return;

            if (e.button === 0) {
                if (wwOpen) {
                    closeWheel(true);
                    return;
                }
                if (isLeftMouseDown) return;

                isLeftMouseDown = true;
                const now = performance.now() / 1000;
                leftMouseDownAt = now;

                if (now - lastFireTime >= weaponStats.fireRate) {
                    fireWeapon();
                    lastFireTime = now;
                }
            }

            if (e.button === 2) toggleADS(true);
        });

        document.addEventListener('mouseup', e => {
            if (armoredCar.active) return;

            if (e.button === 0) {
                isLeftMouseDown = false;
                leftMouseDownAt = 0;
            }
            if (e.button === 2) toggleADS(false);
        });

        document.addEventListener('contextmenu', e => e.preventDefault());
`;
