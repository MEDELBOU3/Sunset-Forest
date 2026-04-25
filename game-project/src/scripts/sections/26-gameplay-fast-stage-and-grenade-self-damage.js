export default String.raw`
        // =========================================================
        // GAMEPLAY: FAST STAGE TRANSITION + GRENADE SELF-DAMAGE
        // =========================================================
        const _grenadePlayerDamagePos = new THREE.Vector3();

        if (typeof explodeGrenade === 'function') {
            const _origExplodeGrenade = explodeGrenade;
            explodeGrenade = function (g) {
                try {
                    if (g && g.mesh && g.mesh.position) {
                        _grenadePlayerDamagePos.copy(g.mesh.position);
                    } else {
                        _grenadePlayerDamagePos.set(0, 0, 0);
                    }
                } catch (e) {
                    _grenadePlayerDamagePos.set(0, 0, 0);
                }

                const result = _origExplodeGrenade(g);

                try {
                    if (typeof playerDead !== 'undefined' && playerDead) return result;
                    if (!camera || !camera.position) return result;

                    // Use horizontal distance for more consistent feel (player camera Y varies with crouch/jump).
                    const dx = camera.position.x - _grenadePlayerDamagePos.x;
                    const dz = camera.position.z - _grenadePlayerDamagePos.z;
                    const distSq = (dx * dx) + (dz * dz);

                    // Keep radius aligned with zombie blast logic (15), but player damage is lower.
                    const blastRadius = 15.0;
                    const blastRadiusSq = blastRadius * blastRadius;
                    if (distSq > blastRadiusSq) return result;

                    const dist = Math.sqrt(distSq);
                    const t = 1 - (dist / blastRadius);
                    const maxPlayerDamage = 95;
                    const dmg = Math.max(5, Math.round(maxPlayerDamage * t * t));

                    if (typeof damagePlayer === 'function') {
                        damagePlayer(dmg);
                    } else if (typeof playerStats !== 'undefined') {
                        playerStats.health = Math.max(0, playerStats.health - dmg);
                        if (typeof updateHealthHUD === 'function') updateHealthHUD();
                    }
                } catch (e) {
                    // Never break grenade explosions
                }

                return result;
            };
        }

        // Disable glow-path creation (keeps stage transitions light on low-end devices).
        if (typeof activateGlowPath === 'function') {
            activateGlowPath = function () {
                glowPathActive = false;
            };
        }

        // Faster stage transition (no "follow the path" step).
        if (typeof enterNextStage === 'function') {
            enterNextStage = function () {
                exitArmoredCar(true);
                stageTransitioning = true;
                currentStage++;
                gateSpawned = false;

                // Light flash, fast timings
                const flash = document.createElement('div');
                flash.style.cssText =
                    'position:fixed;inset:0;background:#fff;z-index:99999;opacity:0;' +
                    'transition:opacity 0.18s ease;pointer-events:none;';
                document.body.appendChild(flash);
                requestAnimationFrame(() => { flash.style.opacity = '1'; });

                setTimeout(() => {
                    camera.position.set(-5, -2.03, -5);

                    if (gateMesh) { scene.remove(gateMesh); gateMesh = null; }
                    if (typeof removeGlowPath === 'function') removeGlowPath();

                    if (currentStage === 2) applyStage2Atmosphere();
                    else applyStageNAtmosphere(currentStage);

                    flash.style.opacity = '0';
                    setTimeout(() => {
                        flash.remove();
                        stageTransitioning = false;

                        waveAnnTitle.textContent = 'STAGE ' + currentStage;
                        waveAnnSub.textContent = currentStage === 2
                            ? 'Welcome to HELL — They are faster now...'
                            : 'Stage ' + currentStage + ' — Survive if you can...';
                        waveAnnounce.classList.remove('show');
                        void waveAnnounce.offsetWidth;
                        waveAnnounce.classList.add('show');

                        // Start the next wave quickly
                        setTimeout(() => startNextWave(), 900);
                    }, 220);
                }, 220);
            };
        }

        // When the last zombie dies, go to next stage immediately (skip portal + path).
        if (typeof checkWaveClear === 'function') {
            checkWaveClear = function () {
                if (!waveActive) return;
                if (waveZombiesSpawned < waveSpawnTotal) return;
                if (waveZombiesKilled < waveSpawnTotal) return;

                waveActive = false;

                // Make sure no gate/path is created even if some async loader was pending.
                try {
                    gateSpawned = true;
                    glowPathActive = false;
                    if (typeof removeGlowPath === 'function') removeGlowPath();
                    if (gateMesh) { scene.remove(gateMesh); gateMesh = null; }
                } catch (e) { }

                if (!stageTransitioning) {
                    showNotification('✅ All zombies eliminated!');
                    // Fast + smooth: start stage transition almost immediately.
                    setTimeout(() => {
                        if (!stageTransitioning) enterNextStage();
                    }, 250);
                }
            };
        }
`;

