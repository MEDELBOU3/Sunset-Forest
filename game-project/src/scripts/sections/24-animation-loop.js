export default String.raw`
        // =========================================================
        // ANIMATION LOOP
        // =========================================================
        let prevTime = performance.now();
        let interactionTimer = 0;
        const INTERACTION_INTERVAL = 0.1; // 100ms throttle (Tier 5)
        let particleUpdateAccumulator = 0;
        let minimapAccumulator = 0;
        let grenadeTrajectoryAccumulator = 0;
        let runtimePassAccumulator = 0;
        let thermalFrameTick = 0;

        const fogColorNear = new THREE.Color(0x2a1830);
        const fogColorFar = new THREE.Color(0xd8b4c8);
        const fogBackgroundTint = new THREE.Color(0x8090b8);
        const playerProbe = { x: 0, z: 0 };
        const grenadeForward = new THREE.Vector3();
        const grenadeRight = new THREE.Vector3();
        const grenadeDown = new THREE.Vector3();
        const grenadeSimPos = new THREE.Vector3();
        const grenadeSimVel = new THREE.Vector3();
        const grenadeArcPoints = [];
        let grenadeUiSetupDone = false;
        const MOVE_STEP = 1 / 120; // sub-step player movement to avoid jitter on FPS drops
        const MAX_MOVE_STEPS = 8;

        function animate() {
            requestAnimationFrame(animate);

            // OPTIMIZATION: Stop rendering and updates while the menu or pause is active
            // This fixes the "slow cursor" by freeing up CPU/GPU
            if (!blocker.classList.contains('hidden') || pauseMenu.classList.contains('visible')) {
                // If in menu, still update prevTime to avoid huge jumps when resuming
                prevTime = performance.now();
                return;
            }

            const time = performance.now();
            const delta = Math.min((time - prevTime) / 1000, 0.1);
            const timeSec = time / 1000;
            prevTime = time;

            monitorPerformance(delta);

            particleUpdateAccumulator += delta;
            minimapAccumulator += delta;
            grenadeTrajectoryAccumulator += delta;
            runtimePassAccumulator += delta;

            if (runtimePassAccumulator >= performanceState.runtimePassInterval) {
                runtimePassAccumulator = 0;
                if (typeof performanceRuntimePass === 'function') {
                    performanceRuntimePass();
                }
            }

            // Particles
            if (particleUpdateAccumulator >= performanceState.particleInterval) {
                const particleDelta = particleUpdateAccumulator;
                particleUpdateAccumulator = 0;

                particleSystems.forEach(sys => {
                    const pos = sys.points.geometry.attributes.position.array;
                    for (let i = 0; i < sys.count; i++) {
                        const v = sys.velocities[i], i3 = i * 3;
                        pos[i3 + 1] += v.speedY * particleDelta;
                        pos[i3] += Math.sin(timeSec * v.swaySpeed + v.phase) * v.swayAmount * particleDelta;
                        pos[i3 + 2] += Math.cos(timeSec * v.swaySpeed + v.phase) * v.swayAmount * particleDelta;

                        // Fire columns reset near their base instead of anywhere on the map
                        const topY = sys.isFireColumn ? (sys.topY ?? 3) : 20;
                        if (pos[i3 + 1] > topY) {
                            pos[i3 + 1] = -5;
                            if (sys.isFireColumn) {
                                const r = Math.random() * 1.2, a = Math.random() * Math.PI * 2;
                                pos[i3] = sys.baseX + Math.cos(a) * r;
                                pos[i3 + 2] = sys.baseZ + Math.sin(a) * r;
                            } else {
                                pos[i3] = (Math.random() - 0.5) * 200;
                                pos[i3 + 2] = (Math.random() - 0.5) * 200;
                            }
                        }
                    }
                    sys.points.geometry.attributes.position.needsUpdate = true;
                });
            }

            // Zombies zone
            // Smooth fog that breathes and responds to player position depth
            const distToCenter = Math.hypot(camera.position.x, camera.position.y, camera.position.z);
            const fogNear = THREE.MathUtils.clamp(14 + Math.sin(timeSec * 0.08) * 3, 10, 20);
            const fogFar = THREE.MathUtils.clamp(
                THREE.MathUtils.lerp(55, 95, (distToCenter - 20) / 80),
                40, 95
            );
            scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, fogNear, delta * 1.2);
            scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, fogFar, delta * 1.2);

            // Color shifts from dense dark purple (near buildings) to soft rose (open forest)
            const fogMix = THREE.MathUtils.smoothstep(distToCenter, 15, 70);
            scene.fog.color.lerpColors(fogColorNear, fogColorFar, fogMix);
            scene.background.copy(scene.fog.color).lerp(fogBackgroundTint, 0.25);

            // Player
            if (controls.isLocked) {
                if (isLeftMouseDown && !armoredCar.active && !wwOpen) {
                    const currentWeapon = weapons[currentWeaponKey];
                    const heldFor = leftMouseDownAt > 0 ? (timeSec - leftMouseDownAt) : 0;
                    const canAutoFire = currentWeapon
                        && currentWeapon.isAuto
                        && heldFor >= AUTO_FIRE_HOLD_DELAY;

                    if (canAutoFire && timeSec - lastFireTime >= weaponStats.fireRate) {
                        fireWeapon();
                        lastFireTime = timeSec;
                    }
                }

                interactionTimer += delta;
                const interactionInterval = performanceState.quality === 'low' ? 0.14 : INTERACTION_INTERVAL;
                if (interactionTimer >= interactionInterval) {
                    interactionTimer = 0;

                    // Reset prompt first — each check below can re-show it
                    interactPrompt.classList.remove('visible');

                    if (!armoredCar.active && getNearbyArmoredCar()) {
                        showSimpleInteractPrompt('Press E to drive armored car', 'E', 'assets/weapon/weapon-images/armored_police_vehicle.png');
                    }
                    // Check loot (weapons + ammo)
                    else if (worldLoot.length > 0) {
                        updateLootPrompt(); // may re-add 'visible'
                    }

                    // Check mushrooms (only if loot didn't claim the prompt)
                    if (!interactPrompt.classList.contains('visible') && items.length > 0) {
                        raycaster.setFromCamera(mouseCenter, camera);
                        const intersects = raycaster.intersectObjects(items, true);
                        if (intersects.length > 0 && intersects[0].distance < 5
                            && intersects[0].object.name === 'heal-item') {
                            showSimpleInteractPrompt('Press E to Pick Up Mushroom', 'E', 'assets/weapon/weapon-images/health-mashrum.png');
                        }
                    }
                }
                if (armoredCar.active) {
                    isSprinting = false;
                    sprintLabel.classList.remove('visible');
                    weaponGroup.position.set(0, 0, 0);
                    weaponGroup.rotation.x = 0;
                    recoil = THREE.MathUtils.lerp(recoil, 0, delta * 14);
                    velocity.set(0, 0, 0);
                    playerStats.stamina = Math.min(playerStats.maxStamina, playerStats.stamina + playerStats.staminaRegen * delta * 0.8);
                    updateStaminaHUD();
                    checkVehicleCollisions(delta);
                    updateArmoredCar(delta);
                    updateCompass();
                    if (footstepSound.buffer && footstepSound.isPlaying) footstepSound.stop();
                    if (natureSound.isPlaying) {
                        const speed = Math.abs(armoredCar.speed);
                        const f = Math.min(speed / 10.0, 1.0);
                        natureSound.setVolume(0.3 + f * 0.34);
                        natureSound.setPlaybackRate(1.0 + f * 0.08);
                        motionFilter.frequency.setTargetAtTime(1200 + f * 3200, THREE.AudioContext.getContext().currentTime, 0.1);
                    }
                } else {
                    const canSprint = moveState.sprint && playerStats.stamina > 0 && (moveState.forward || moveState.backward || moveState.left || moveState.right);
                    isSprinting = canSprint;
                    if (isSprinting) playerStats.stamina = Math.max(0, playerStats.stamina - playerStats.staminaDrain * delta);
                    else playerStats.stamina = Math.min(playerStats.maxStamina, playerStats.stamina + playerStats.staminaRegen * delta);
                    updateStaminaHUD();
                    sprintLabel.classList.toggle('visible', isSprinting);

                    direction.z = Number(moveState.forward) - Number(moveState.backward);
                    direction.x = Number(moveState.right) - Number(moveState.left);
                    direction.normalize();

                    const baseSpeed = isADS ? 20.0 : (isSprinting ? 65.0 : 40.0);
                    const steps = Math.min(MAX_MOVE_STEPS, Math.max(1, Math.ceil(delta / MOVE_STEP)));
                    const stepDelta = delta / steps;

                    for (let step = 0; step < steps; step++) {
                        velocity.x -= velocity.x * 10.0 * stepDelta;
                        velocity.z -= velocity.z * 10.0 * stepDelta;

                        if (moveState.forward || moveState.backward) velocity.z -= direction.z * baseSpeed * stepDelta;
                        if (moveState.left || moveState.right) velocity.x -= direction.x * baseSpeed * stepDelta;

                        controls.moveRight(-velocity.x * stepDelta);
                        controls.moveForward(-velocity.z * stepDelta);

                        playerProbe.x = camera.position.x;
                        playerProbe.z = camera.position.z;
                        CollisionSystem.resolvePoint(playerProbe, CollisionSystem.PLAYER_R);
                        camera.position.x = playerProbe.x;
                        camera.position.z = playerProbe.z;
                    }

                    recoil = THREE.MathUtils.lerp(recoil, 0, delta * 14);

                    // ===================== WEAPON POSITIONING & ANIMATION =====================
                    if (weaponMesh && weapons[currentWeaponKey]) {
                        const w = weapons[currentWeaponKey];

                        // 1. Smoothly transition between Hip Fire and Aim Down Sights
                        const targetPos = isADS ? w.adsPos : w.viewPos;

                        // We lerp the MESH position so it doesn't break the camera bobbing below
                        weaponMesh.position.lerp(targetPos, delta * 15);

                        // 2. Weapon Sway & Bobbing (Applied to the Group, so it stacks with ADS)
                        const speed = velocity.length();
                        if (speed > 0.5) {
                            // Walking/Sprinting bob
                            weaponGroup.position.y = Math.sin(timeSec * 12) * (isSprinting ? 0.015 : 0.008);
                            weaponGroup.position.x = Math.sin(timeSec * 6) * (isSprinting ? 0.015 : 0.008);
                        } else {
                            // Idle breathing
                            weaponGroup.position.y = Math.sin(timeSec * 2) * 0.002;
                            weaponGroup.position.x = THREE.MathUtils.lerp(weaponGroup.position.x, 0, delta * 5);
                        }

                        // 3. Recoil kickback
                        weaponGroup.position.z = recoil;
                        weaponGroup.rotation.x = -recoil * 0.5;
                    }

                    updateCompass();

                    if (natureSound.isPlaying) {
                        const speed = velocity.length();
                        const f = Math.min(speed / 8.0, 1.0);
                        natureSound.setVolume(0.3 + f * 0.3);
                        natureSound.setPlaybackRate(1.0 + f * 0.05);
                        motionFilter.frequency.setTargetAtTime(1000 + f * 3000, THREE.AudioContext.getContext().currentTime, 0.1);
                    }

                    const isMoving = moveState.forward || moveState.backward || moveState.left || moveState.right;

                    // --- Professional Breathing Sound Blending (Ease-In-Out) ---
                    const targetMix = (isSprinting && isMoving) ? 1.0 : 0.0;
                    breathMix = THREE.MathUtils.lerp(breathMix, targetMix, delta * 1.8);

                    // Ease-In-Out Curve (Smoothstep)
                    const eased = breathMix * breathMix * (3 - 2 * breathMix);

                    const maxSlowVol = 0.65;
                    const maxStrongVol = 0.35; // Lowered as requested

                    if (slowBreathingSound.buffer) {
                        // Slow breath volume: fades from maxSlowVol down to 0.15 when sprinting
                        const slowV = THREE.MathUtils.lerp(maxSlowVol, 0.15, eased);
                        slowBreathingSound.setVolume(slowV);
                    }

                    if (strongBreathingSound.buffer) {
                        // Strong breath volume: fades from 0 up to maxStrongVol
                        const strongV = eased * maxStrongVol;
                        strongBreathingSound.setVolume(strongV);
                        strongBreathingSound.setPlaybackRate(1.0 + (eased * 0.1));
                    }

                    if (footstepSound.buffer) {
                        if (isMoving && controls.isLocked) {
                            footstepSound.setPlaybackRate(isSprinting ? 2.6 : 1.6);
                            if (!footstepSound.isPlaying) footstepSound.play();
                        } else {
                            if (footstepSound.isPlaying) footstepSound.stop();
                        }
                    }
                    // Jump physics
                    if (playerStats.isJumping) {
                        playerStats.verticalVelocity -= 20 * delta; // gravity
                        camera.position.y += playerStats.verticalVelocity * delta;
                        if (camera.position.y <= playerStats.GROUND_CAMERA_Y) {
                            camera.position.y = playerStats.GROUND_CAMERA_Y;
                            playerStats.isJumping = false;
                            playerStats.verticalVelocity = 0;
                        }
                    } else if (playerStats.isCrouching) {
                        camera.position.y = THREE.MathUtils.lerp(
                            camera.position.y, playerStats.CROUCH_CAMERA_Y, delta * 12
                        );
                    } else {
                        camera.position.y = THREE.MathUtils.lerp(
                            camera.position.y, playerStats.GROUND_CAMERA_Y, delta * 12
                        );
                    }
                }
            }

            // --- 1. UPDATE THROWN GRENADES PHYSICS ---
            for (let i = activeGrenades.length - 1; i >= 0; i--) {
                const g = activeGrenades[i];
                if (!g.active) continue;

                // Apply Gravity & Movement
                g.velocity.y -= 25 * delta;
                g.mesh.position.addScaledVector(g.velocity, delta);

                g.mesh.rotation.x += 8 * delta;
                g.mesh.rotation.z += 4 * delta;

                // THE MILLISECOND IT TOUCHES THE FLOOR -> DETONATE!
                if (g.mesh.position.y <= GROUND_Y + 0.2) {
                    g.mesh.position.y = GROUND_Y + 0.2;
                    explodeGrenade(g);         // Triggers Audio 3, Particles, and Damage
                    activeGrenades.splice(i, 1); // Remove from physics loop
                }
            }
            // --- 2. UPDATE THICK GLOWING TRAJECTORY ARC ---
            if (!armoredCar.active && currentWeaponKey === 'grinade' && weaponMesh && weaponMesh.visible && controls.isLocked) {
                trajectoryMesh.visible = true;
                impactMarker.visible = true;

                if (!grenadeUiSetupDone) {
                    grenadeUiSetupDone = true;
                    // Render the trajectory behind the first-person weapon to avoid visual overlap.
                    trajectoryMesh.renderOrder = -5;
                    impactMarker.renderOrder = -5;
                    if (trajectoryMesh.material) trajectoryMesh.material.depthTest = true;
                    if (impactMarker.material) impactMarker.material.depthTest = true;
                }

                if (grenadeTrajectoryAccumulator >= performanceState.grenadeInterval || !trajectoryMesh.geometry) {
                    grenadeTrajectoryAccumulator = 0;
                    grenadeArcPoints.length = 0;

                    // Start from the exact same "hand" position as the throw math
                    grenadeForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
                    grenadeRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
                    grenadeDown.set(0, -1, 0).applyQuaternion(camera.quaternion);

                    // Visual-only: start closer to crosshair and a bit farther forward
                    // so the tube doesn't intersect the grenade model in first-person.
                    grenadeSimPos.copy(camera.position)
                        .addScaledVector(grenadeDown, 0.12)
                        .addScaledVector(grenadeForward, 1.15);

                    // Simulate the arc into the future
                    grenadeSimVel.copy(grenadeForward).multiplyScalar(22);
                    grenadeSimVel.y += 6;

                    // This automatically perfectly matches the line to whatever fuse time you set above!
                    const step = GRENADE_FUSE_TIME / 60;

                    grenadeArcPoints.push(grenadeSimPos.clone());

                    // Simulate the arc into the future
                    for (let i = 0; i < 70; i++) {
                        grenadeSimVel.y -= 25 * step; // Gravity
                        grenadeSimPos.addScaledVector(grenadeSimVel, step);

                        // Stop the line perfectly when it hits the ground
                        if (grenadeSimPos.y <= GROUND_Y + 0.1) {
                            grenadeSimPos.y = GROUND_Y + 0.1;
                            grenadeArcPoints.push(grenadeSimPos.clone());
                            break;
                        }
                        grenadeArcPoints.push(grenadeSimPos.clone());
                    }

                    // Generate the smooth 3D Tube
                    if (grenadeArcPoints.length > 1) {
                        // Free the old memory
                        if (trajectoryMesh.geometry) trajectoryMesh.geometry.dispose();

                        // Create a smooth curve through our points
                        const curve = new THREE.CatmullRomCurve3(grenadeArcPoints);

                        // Build a tube around the curve (0.02 is the thickness of the laser)
                        trajectoryMesh.geometry = new THREE.TubeGeometry(curve, grenadeArcPoints.length * 2, 0.025, 6, false);
                    }

                    // Place the target ring at the exact end of the line
                    const lastPoint = grenadeArcPoints[grenadeArcPoints.length - 1];
                    impactMarker.position.set(lastPoint.x, GROUND_Y + 0.05, lastPoint.z);
                }

            } else {
                trajectoryMesh.visible = false;
                impactMarker.visible = false;
            }

            if (minimapAccumulator >= performanceState.minimapInterval) {
                minimapAccumulator = 0;
                drawMinimap();
            }
            if (typeof updateFriendlyCompanion === 'function') {
                updateFriendlyCompanion(delta, timeSec);
            }
            updateZombies(delta, timeSec);
            updateStageSystem(timeSec, delta);
            updateLootAnimations(timeSec);
            renderer.render(scene, camera);
            if (thermalActive && isADS) {
                thermalFrameTick = (thermalFrameTick + 1) % Math.max(1, performanceState.thermalFrameSkip);
                if (thermalFrameTick === 0) {
                    renderThermalOverlay();
                }
            }
        }

        animate();

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            resizeRendererForQuality();
        });
`;
