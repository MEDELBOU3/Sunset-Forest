export default String.raw`
        // =========================================================
        // WEAPON FUNCTIONS
        // =========================================================
        function toggleADS(active) {
            if (armoredCar.active) return;
            isADS = active;

            if (!active && thermalActive) disableThermal();

            const w = weapons[currentWeaponKey];
            const hasBuiltinScope = !!(w && w.builtinScope);
            const hasLootedScope = !!(w && w.acceptsLootedScope && playerHasScope);
            const useScope = active && (hasBuiltinScope || hasLootedScope);
            const targetFov = !active
                ? (playerStats.isCrouching ? 68 : 75)
                : useScope
                    ? (w.scopeFov || 15)
                    : (w && w.adsFov ? w.adsFov : 45);

            scopeOverlay.classList.toggle('active', useScope);
            crosshairEl.style.display = active ? 'none' : 'block';
            aimOverlay.style.opacity = (active && !useScope) ? '1' : '0';
            document.getElementById('panel-br').style.opacity = active ? '0' : '1';
            document.getElementById('panel-tl').style.opacity = active ? '0.4' : '1';

            camera.fov = targetFov;
            camera.updateProjectionMatrix();
        }

        function isHeadshotHit(hitPointY, zombieMesh, zombie) {
            try {
                const zombieBaseY = zombieMesh.position.y;
                const height = (zombie && zombie.visualHeight && zombie.visualHeight > 0.5)
                    ? zombie.visualHeight
                    : ZOMBIE_VISUAL_HEIGHT;

                const headBottom = zombieBaseY + height * 0.84;
                const headTop = zombieBaseY + height * 0.98;

                return hitPointY >= headBottom && hitPointY <= headTop;
            } catch (e) {
                return false;
            }
        }

        function spawnHeadshotEffect(pos) {
            const count = 30;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const velocitiesArr = [];

            for (let i = 0; i < count; i++) {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
                const angle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 6;
                velocitiesArr.push({
                    vx: Math.cos(angle) * speed,
                    vy: 2 + Math.random() * 4,
                    vz: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 1.8 + Math.random()
                });
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                size: 0.25,
                color: 0xff0000,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const pts = new THREE.Points(geo, mat);
            scene.add(pts);

            let elapsed = 0;
            const tickFn = (dt) => {
                elapsed += dt;
                const arr = pts.geometry.attributes.position.array;
                let alive = false;
                for (let i = 0; i < count; i++) {
                    const v = velocitiesArr[i];
                    v.life -= v.decay * dt;
                    if (v.life <= 0) continue;
                    alive = true;
                    arr[i * 3] += v.vx * dt;
                    arr[i * 3 + 1] += v.vy * dt;
                    arr[i * 3 + 2] += v.vz * dt;
                    v.vy -= 9.8 * dt;
                }
                pts.geometry.attributes.position.needsUpdate = true;
                mat.opacity = Math.max(0, 1 - elapsed * 2);
                if (!alive || elapsed > 0.8) {
                    scene.remove(pts);
                    geo.dispose();
                    mat.dispose();
                    deathEffects.splice(deathEffects.indexOf(tickFn), 1);
                }
            };
            deathEffects.push(tickFn);
        }

        function fireWeapon() {
            if (wwOpen || !controls.isLocked) return;
            if (weaponStats.isReloading) {
                showNotification('Reloading...');
                return;
            }

            const activeWeapon = weapons[currentWeaponKey];
            if (!activeWeapon) return;

            if (weaponStats.currentAmmo <= 0) {
                if (emptyGunSound.buffer) {
                    if (emptyGunSound.isPlaying) emptyGunSound.stop();
                    emptyGunSound.play();
                }
                showNotification('Empty - press R to reload');
                return;
            }

            if (currentWeaponKey === 'grinade') {
                throwGrenade();
                return;
            }

            weaponStats.currentAmmo--;
            activeWeapon.ammo = weaponStats.currentAmmo;
            updateAmmoHUD();
            recoil = isADS ? 0.05 : 0.15;

            if ((!gunshotPool[gunshotIndex] || !gunshotPool[gunshotIndex].buffer) && typeof configureWeaponAudio === 'function') {
                configureWeaponAudio(currentWeaponKey);
            }

            const sound = gunshotPool[gunshotIndex];
            if (sound && sound.buffer) {
                if (sound.isPlaying) sound.stop();
                sound.play();
            }
            gunshotIndex = (gunshotIndex + 1) % gunshotPool.length;

            if (muzzleFlash) {
                muzzleFlash.visible = true;
                setTimeout(() => {
                    if (muzzleFlash) muzzleFlash.visible = false;
                }, 30);
            }

            raycaster.setFromCamera({ x: 0, y: 0 }, camera);
            const testObjects = zombies
                .filter(z => !z.isDead && z.mesh.visible)
                .map(z => z.mesh);
            const hits = raycaster.intersectObjects(testObjects, true);

            if (hits.length > 0) {
                for (const hit of hits) {
                    let node = hit.object;
                    let hitZombie = null;
                    while (node) {
                        if (zombieMeshMap.has(node)) {
                            hitZombie = zombieMeshMap.get(node);
                            break;
                        }
                        node = node.parent;
                    }

                    if (hitZombie && !hitZombie.isDead) {
                        const headshot = isHeadshotHit(hit.point.y, hitZombie.mesh, hitZombie);
                        const damage = headshot ? weaponStats.damage * 2.5 : weaponStats.damage;
                        showHitMarker(headshot);
                        const numPos = hit.point.clone();
                        numPos.y += headshot ? 0.6 : 0.2;
                        showDamageNumber(numPos, damage, headshot);

                        if (headshot) {
                            spawnHeadshotEffect(hit.point.clone());
                            showNotification('HEADSHOT!');
                            if (headshotSound.buffer) {
                                if (headshotSound.isPlaying) headshotSound.stop();
                                headshotSound.play();
                            }
                        }

                        damageZombie(hitZombie, damage);
                        break;
                    }

                    if (!hitZombie) {
                        showHitMarker(false);
                        break;
                    }
                }
            }

            if (weaponStats.currentAmmo === 0) {
                setTimeout(() => startReload(), 300);
            }
        }

        const GRENADE_FUSE_TIME = 4.8;

        function throwGrenade() {
            weaponStats.currentAmmo--;
            if (weapons[currentWeaponKey]) weapons[currentWeaponKey].ammo = weaponStats.currentAmmo;
            updateAmmoHUD();

            weaponMesh.visible = false;

            if (throwBuffer) {
                const throwSound = new THREE.Audio(listener);
                throwSound.setBuffer(throwBuffer);
                throwSound.setVolume(1.5);
                throwSound.play();
            }

            const thrownMesh = weaponMesh.clone();
            thrownMesh.visible = true;
            thrownMesh.children.forEach(c => { if (c.isPointLight) c.visible = false; });
            scene.add(thrownMesh);

            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const down = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);

            thrownMesh.position.copy(camera.position)
                .addScaledVector(right, 0.3)
                .addScaledVector(down, 0.3)
                .addScaledVector(forward, 0.5);

            const velocity = forward.clone().multiplyScalar(22).add(new THREE.Vector3(0, 6, 0));

            activeGrenades.push({
                mesh: thrownMesh,
                velocity: velocity,
                active: true
            });

            if (weaponStats.currentAmmo > 0) {
                setTimeout(() => {
                    if (currentWeaponKey === 'grinade' && weaponMesh && !weaponStats.isReloading) {
                        weaponMesh.visible = true;
                        if (pinPullBuffer) {
                            const nextPinSound = new THREE.Audio(listener);
                            nextPinSound.setBuffer(pinPullBuffer);
                            nextPinSound.play();
                        }
                    }
                }, 1200);
            } else {
                setTimeout(() => startReload(), 300);
            }
        }

        function explodeGrenade(g) {
            scene.remove(g.mesh);
            const pos = g.mesh.position.clone();

            if (explosionBuffer) {
                const expSound = new THREE.Audio(listener);
                expSound.setBuffer(explosionBuffer);
                expSound.setVolume(2.0);
                expSound.play();
            }

            spawnExplosionEffect(pos);

            const blastRadius = 15.0;
            const maxDamage = 250;

            zombies.forEach(z => {
                if (z.isDead) return;
                const dist = z.mesh.position.distanceTo(pos);
                if (dist <= blastRadius) {
                    const damage = maxDamage * (1 - (dist / blastRadius));
                    damageZombie(z, damage);
                }
            });

            const distToPlayer = camera.position.distanceTo(pos);
            if (distToPlayer < 30) {
                const shake = (1 - distToPlayer / 30) * 0.6;
                recoil += shake;
            }
        }

        function startReload() {
            if (weaponStats.isReloading || weaponStats.currentAmmo === weaponStats.maxAmmo) return;
            const w = weapons[currentWeaponKey];
            if (!w) return;

            const hasReserveSystem = typeof w.reserveAmmo !== 'undefined';

            if (hasReserveSystem && w.reserveAmmo <= 0) {
                showNotification('No reserve ammo - find some!');
                return;
            }

            weaponStats.isReloading = true;
            reloadNotice.classList.add('visible');
            reloadBarWrap.classList.add('visible');
            reloadBarFill.style.transition = 'width ' + weaponStats.reloadTime + 's linear';
            reloadBarFill.style.width = '100%';
            if (reloadSound.buffer) {
                if (reloadSound.isPlaying) reloadSound.stop();
                reloadSound.play();
            }

            setTimeout(() => {
                const needed = weaponStats.maxAmmo - weaponStats.currentAmmo;

                if (hasReserveSystem) {
                    const take = Math.min(needed, w.reserveAmmo);
                    w.reserveAmmo -= take;
                    weaponStats.currentAmmo += take;
                } else {
                    weaponStats.currentAmmo = weaponStats.maxAmmo;
                }

                w.ammo = weaponStats.currentAmmo;
                weaponStats.isReloading = false;
                reloadNotice.classList.remove('visible');
                reloadBarWrap.classList.remove('visible');
                reloadBarFill.style.transition = 'none';
                reloadBarFill.style.width = '0%';
                updateAmmoHUD();
                if (weaponMesh) weaponMesh.visible = true;
                showNotification('Reloaded' + (hasReserveSystem ? ' - ' + w.reserveAmmo + ' in reserve' : ''));
            }, weaponStats.reloadTime * 1000);
        }

        function spawnExplosionEffect(pos) {
            const count = 120;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            const velocitiesArr = [];
            for (let i = 0; i < count; i++) {
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y + 0.5;
                positions[i * 3 + 2] = pos.z;

                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const speed = Math.random() * 20 + 8;
                velocitiesArr.push({
                    vx: Math.sin(phi) * Math.cos(theta) * speed,
                    vy: Math.sin(phi) * Math.sin(theta) * speed,
                    vz: Math.cos(phi) * speed,
                    life: 1.0,
                    decay: 1.2 + Math.random() * 1.5
                });
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({
                size: 3.5,
                color: 0xff4400,
                transparent: true,
                opacity: 1.0,
                map: createGlowTexture(false),
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const pts = new THREE.Points(geo, mat);
            scene.add(pts);

            let elapsed = 0;
            const tickFn = (dt) => {
                elapsed += dt;
                const arr = pts.geometry.attributes.position.array;
                let alive = false;
                for (let i = 0; i < count; i++) {
                    const v = velocitiesArr[i];
                    v.life -= v.decay * dt;
                    if (v.life <= 0) continue;
                    alive = true;
                    arr[i * 3] += v.vx * dt;
                    arr[i * 3 + 1] += v.vy * dt;
                    arr[i * 3 + 2] += v.vz * dt;
                    v.vx *= 0.88;
                    v.vy *= 0.88;
                    v.vz *= 0.88;
                }
                pts.geometry.attributes.position.needsUpdate = true;
                mat.opacity = Math.max(0, 1.0 - elapsed * 1.5);
                if (!alive || elapsed > 1.2) {
                    scene.remove(pts);
                    geo.dispose();
                    mat.dispose();
                    deathEffects.splice(deathEffects.indexOf(tickFn), 1);
                }
            };
            deathEffects.push(tickFn);
        }

        function spawnHealthMushroom(x, z) {
            const loader = new GLTFLoader();
            loader.load('assets/healthMashrum/low_poly_glowing_mushroom.glb', (gltf) => {
                const mesh = gltf.scene;
                mesh.position.set(x, -5, z);
                mesh.scale.set(0.8, 0.8, 0.8);

                const light = new THREE.PointLight(0x00ff44, 15, 6);
                light.position.set(0, 1.5, 0);
                mesh.add(light);

                const pGeo = new THREE.BufferGeometry();
                pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 1, 0]), 3));
                const pMat = new THREE.PointsMaterial({
                    color: 0x00ff44,
                    size: 0.5,
                    transparent: true,
                    opacity: 0.8,
                    map: createGlowTexture(false),
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                });
                mesh.add(new THREE.Points(pGeo, pMat));

                const hitBox = new THREE.Mesh(
                    new THREE.SphereGeometry(2.5, 8, 8),
                    new THREE.MeshBasicMaterial({ visible: false })
                );
                hitBox.name = 'heal-item';
                hitBox._mushroomRoot = mesh;
                hitBox.position.set(0, 3, 0);
                mesh.add(hitBox);

                items.push(hitBox);
                mushroomWorldPositions.push({ x, z, hitBox });

                scene.add(mesh);
            });
        }
`;
