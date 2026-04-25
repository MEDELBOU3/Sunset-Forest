export default String.raw`
        // =========================================================
        // LOOT INTERACTION OPTIMIZATION
        // =========================================================
        const interactPromptRenderState = {
            signature: '',
        };

        const lootQueryState = {
            entry: null,
            expiresAt: 0,
            maxDistance: 0,
            nearbyEntries: [],
            nearbyHitboxes: [],
        };

        const lootQueryDirection = new THREE.Vector3();
        const lootQueryToTarget = new THREE.Vector3();
        const lootQueryTargetPos = new THREE.Vector3();

        function renderCachedInteractPrompt(signature, html) {
            if (interactPromptRenderState.signature !== signature) {
                interactPrompt.innerHTML = html;
                interactPromptRenderState.signature = signature;
            }
            interactPrompt.classList.add('visible');
        }

        function clearLootInteractionCache() {
            lootQueryState.entry = null;
            lootQueryState.expiresAt = 0;
            lootQueryState.maxDistance = 0;
        }

        function isLootEntryInteractive(entry) {
            return !!(entry && entry.mesh && entry.hitBox && !entry._removed && !entry._pendingRemoval);
        }

        function setLootTargetCache(entry, maxDistance, ttlMs) {
            lootQueryState.entry = entry || null;
            lootQueryState.maxDistance = maxDistance;
            lootQueryState.expiresAt = performance.now() + ttlMs;
        }

        function getLootPromptSignature(entry) {
            if (!entry) return '';
            if (entry.type === 'weapon') return 'loot:weapon:' + entry.data.weaponKey;
            if (entry.type === 'ammo') {
                return 'loot:ammo:' + entry.data.weaponKey + ':' + entry.data.amount;
            }
            if (entry.type === 'scope') return 'loot:scope';
            return 'loot:' + entry.type;
        }

        function buildLootPromptHtml(entry) {
            if (entry.type === 'weapon') {
                const w = weapons[entry.data.weaponKey];
                const iconHtml = w && w.icon
                    ? '<img class="loot-prompt-icon" src="' + w.icon + '" onerror="this.style.opacity=0">'
                    : '';

                return '' +
                    '<div class="loot-prompt-inner">' +
                        '<div class="loot-header-row">' +
                            '<div class="loot-prompt-key">E</div>' +
                            iconHtml +
                        '</div>' +
                        '<div class="loot-prompt-name">' + entry.data.name.toUpperCase() + '</div>' +
                        '<div class="loot-prompt-stats">' +
                            '<span style="color:white">DMG</span> ' + (w ? w.damage : 24) +
                            '<span style="margin: 0 8px; opacity: 0.3">|</span>' +
                            '<span style="color:white">CAP</span> ' + (w ? w.maxAmmo : 30) +
                        '</div>' +
                    '</div>';
            }

            if (entry.type === 'ammo') {
                let ammoIconSrc = '';
                const ammoKey = entry.data.weaponKey;
                if (ammoKey === 'shotgun') ammoIconSrc = 'assets/weapon/weapon-images/shotgun-shell.png';
                else if (ammoKey === '1911' || ammoKey === 'mp5') ammoIconSrc = 'assets/weapon/weapon-images/9mm-Ammo.png';

                const ammoIconHtml = ammoIconSrc
                    ? '<img class="loot-prompt-icon loot-prompt-icon--small" src="' + ammoIconSrc + '" onerror="this.style.opacity=0">'
                    : '<div class="loot-prompt-ammo-box"></div>';

                return '' +
                    '<div class="loot-prompt-inner">' +
                        '<div class="loot-header-row">' +
                            '<div class="loot-prompt-key">E</div>' +
                            ammoIconHtml +
                        '</div>' +
                        '<div class="loot-prompt-name">' + entry.data.label.toUpperCase() + '</div>' +
                        '<div class="loot-prompt-stats">REPLENISH +' + entry.data.amount + ' ROUNDS</div>' +
                    '</div>';
            }

            const scopeIconHtml =
                '<img class="loot-prompt-icon loot-prompt-icon--small" src="assets/weapon/weapon-images/scope.png" onerror="this.style.opacity=0">';

            return '' +
                '<div class="loot-prompt-inner">' +
                    '<div class="loot-header-row">' +
                        '<div class="loot-prompt-key">E</div>' +
                        scopeIconHtml +
                    '</div>' +
                    '<div class="loot-prompt-name">THERMAL SCOPE</div>' +
                    '<div class="loot-prompt-stats">TOGGLE [T] WHILE AIMING</div>' +
                '</div>';
        }

        showSimpleInteractPrompt = function (text, key = 'E', iconSrc = '') {
            const iconHtml = iconSrc
                ? '<img class="interact-icon" src="' + iconSrc + '" onerror="this.style.display=\'none\'">'
                : '';
            renderCachedInteractPrompt(
                'simple:' + key + ':' + text + ':' + iconSrc,
                '<span class="interact-key">' + key + '</span>' +
                '<span class="interact-text">' + text + '</span>' +
                iconHtml
            );
        };

        getTargetedLoot = function (maxDistance = 4.5) {
            const cachedEntry = lootQueryState.entry;
            if (
                cachedEntry &&
                lootQueryState.maxDistance === maxDistance &&
                performance.now() <= lootQueryState.expiresAt &&
                isLootEntryInteractive(cachedEntry)
            ) {
                const dx = camera.position.x - cachedEntry.mesh.position.x;
                const dy = camera.position.y - cachedEntry.mesh.position.y;
                const dz = camera.position.z - cachedEntry.mesh.position.z;
                if ((dx * dx) + (dy * dy) + (dz * dz) <= maxDistance * maxDistance) {
                    return cachedEntry;
                }
            }

            const nearbyEntries = lootQueryState.nearbyEntries;
            const nearbyHitboxes = lootQueryState.nearbyHitboxes;
            nearbyEntries.length = 0;
            nearbyHitboxes.length = 0;

            const px = camera.position.x;
            const py = camera.position.y;
            const pz = camera.position.z;
            const maxDistanceSq = maxDistance * maxDistance;

            for (const entry of worldLoot) {
                if (!isLootEntryInteractive(entry)) continue;

                const dx = px - entry.mesh.position.x;
                const dy = py - entry.mesh.position.y;
                const dz = pz - entry.mesh.position.z;
                if ((dx * dx) + (dy * dy) + (dz * dz) > maxDistanceSq) continue;

                nearbyEntries.push(entry);
                nearbyHitboxes.push(entry.hitBox);
            }

            if (nearbyHitboxes.length === 0) {
                clearLootInteractionCache();
                return null;
            }

            raycaster.setFromCamera(mouseCenter, camera);
            const hits = raycaster.intersectObjects(nearbyHitboxes, false);
            for (const hit of hits) {
                if (hit.distance > maxDistance) continue;
                const entry = resolveLootEntryFromObject(hit.object);
                if (!isLootEntryInteractive(entry)) continue;
                setLootTargetCache(entry, maxDistance, 60);
                return entry;
            }

            camera.getWorldDirection(lootQueryDirection);
            let bestEntry = null;
            let bestScore = 0.92;

            for (const entry of nearbyEntries) {
                entry.hitBox.getWorldPosition(lootQueryTargetPos);
                lootQueryToTarget.copy(lootQueryTargetPos).sub(camera.position);
                const distSq = lootQueryToTarget.lengthSq();
                if (distSq <= 0.001) continue;

                const dist = Math.sqrt(distSq);
                lootQueryToTarget.divideScalar(dist);
                const score = lootQueryToTarget.dot(lootQueryDirection) - dist * 0.015;
                if (score > bestScore) {
                    bestScore = score;
                    bestEntry = entry;
                }
            }

            setLootTargetCache(bestEntry, maxDistance, bestEntry ? 60 : 30);
            return bestEntry;
        };

        function getClosestLoot(maxDistance) {
            const maxDistanceSq = maxDistance * maxDistance;
            let closest = null;
            let closestDistSq = maxDistanceSq;

            for (const entry of worldLoot) {
                if (!isLootEntryInteractive(entry)) continue;

                const dx = camera.position.x - entry.mesh.position.x;
                const dy = camera.position.y - entry.mesh.position.y;
                const dz = camera.position.z - entry.mesh.position.z;
                const distSq = (dx * dx) + (dy * dy) + (dz * dz);
                if (distSq >= closestDistSq) continue;

                closestDistSq = distSq;
                closest = entry;
            }

            return closest;
        }

        function detachLootImmediately(entry) {
            if (!isLootEntryInteractive(entry)) return;

            entry._pendingRemoval = true;
            entry._removed = true;

            if (entry.hitBox) {
                entry.hitBox._lootEntry = null;
                entry.hitBox.visible = false;
                if (entry.hitBox.parent) {
                    entry.hitBox.parent.remove(entry.hitBox);
                }
            }

            if (entry.mesh) {
                entry.mesh.visible = false;
                entry.mesh.traverse(node => {
                    if (node.isLight) {
                        node.visible = false;
                        node.intensity = 0;
                    }
                    if (node.isMesh) {
                        node.visible = false;
                        node.castShadow = false;
                        node.receiveShadow = false;
                    }
                });
            }

            const worldIndex = worldLoot.indexOf(entry);
            if (worldIndex > -1) worldLoot.splice(worldIndex, 1);

            const itemIndex = items.indexOf(entry.hitBox);
            if (itemIndex > -1) items.splice(itemIndex, 1);

            const hitboxIndex = lootHitboxes.indexOf(entry.hitBox);
            if (hitboxIndex > -1) lootHitboxes.splice(hitboxIndex, 1);

            clearLootInteractionCache();
            interactPrompt.classList.remove('visible');
            interactPromptRenderState.signature = '';

            requestAnimationFrame(() => {
                if (entry.mesh) {
                    scene.remove(entry.mesh);
                }
            });
        }

        removeLoot = function (entry) {
            detachLootImmediately(entry);
        };

        function finishLootPickup(entry, onAfterDetach) {
            detachLootImmediately(entry);
            requestAnimationFrame(() => {
                onAfterDetach();
            });
        }

        tryPickupLoot = function () {
            const maxDistance = 4.5;
            const entry = getTargetedLoot(maxDistance) || getClosestLoot(maxDistance);
            if (!entry) return false;

            if (entry.type === 'weapon') {
                const key = entry.data.weaponKey;
                const weapon = weapons[key];
                if (!weapon) return false;

                weapon.ammo = weapon.maxAmmo;
                if (typeof weapon.maxReserve !== 'undefined') {
                    weapon.reserveAmmo = Math.max(weapon.reserveAmmo || 0, weapon.maxReserve);
                }
                finishLootPickup(entry, () => {
                    unlockWeapon(key);

                    if (currentWeaponKey === key && weaponStats) {
                        if (typeof applyWeaponStatsToRuntime === 'function') {
                            applyWeaponStatsToRuntime(key, true);
                        } else {
                            weaponStats.currentAmmo = weapon.maxAmmo;
                            weaponStats.maxAmmo = weapon.maxAmmo;
                        }
                        if (typeof configureWeaponAudio === 'function') {
                            configureWeaponAudio(key);
                        }
                        updateAmmoHUD();
                    } else {
                        switchWeapon(key);
                    }

                    showNotification('Picked up: ' + entry.data.name);
                    playLootPickupSound();
                });
                return true;
            }

            if (entry.type === 'scope') {
                playerHasScope = true;
                finishLootPickup(entry, () => {
                    showNotification('Thermal Scope equipped - Press T to toggle');
                    playLootPickupSound();
                });
                return true;
            }

            if (entry.type === 'ammo') {
                const key = entry.data.weaponKey;
                if (weapons[key]) {
                    weapons[key].ammo = Math.min(
                        weapons[key].maxAmmo,
                        weapons[key].ammo + entry.data.amount
                    );

                    if (currentWeaponKey === key) {
                        weaponStats.currentAmmo = Math.min(
                            weaponStats.maxAmmo,
                            weaponStats.currentAmmo + entry.data.amount
                        );
                        weapons[key].ammo = weaponStats.currentAmmo;
                        updateAmmoHUD();
                    }
                }

                finishLootPickup(entry, () => {
                    showNotification('+' + entry.data.amount + ' ' + entry.data.label);
                    playLootPickupSound();
                });
                return true;
            }

            return false;
        };

        updateLootPrompt = function () {
            const entry = getTargetedLoot(4.5);
            if (!entry) {
                interactPrompt.classList.remove('visible');
                if (interactPromptRenderState.signature.startsWith('loot:')) {
                    interactPromptRenderState.signature = '';
                }
                return;
            }

            const signature = getLootPromptSignature(entry);
            renderCachedInteractPrompt(signature, buildLootPromptHtml(entry));
        };

        const previousPerformanceRuntimePass = performanceRuntimePass;
        performanceRuntimePass = function () {
            previousPerformanceRuntimePass();

            let glowBudget = performanceState.quality === 'low'
                ? 3
                : performanceState.quality === 'medium'
                    ? 5
                    : 8;

            const glowDistanceSq = performanceState.quality === 'low'
                ? 13 * 13
                : performanceState.quality === 'medium'
                    ? 18 * 18
                    : 24 * 24;

            for (const entry of worldLoot) {
                if (!entry.mesh || entry._removed) continue;

                if (!entry._glowLights) {
                    entry._glowLights = [];
                    entry.mesh.traverse(node => {
                        if (node.isPointLight) {
                            node.userData.baseIntensity = node.userData.baseIntensity || node.intensity;
                            entry._glowLights.push(node);
                        }
                    });
                }

                if (!entry._glowLights.length) continue;

                const dx = camera.position.x - entry.mesh.position.x;
                const dz = camera.position.z - entry.mesh.position.z;
                const distSq = (dx * dx) + (dz * dz);
                const allowGlow = glowBudget > 0 && distSq <= glowDistanceSq;

                for (const light of entry._glowLights) {
                    light.visible = allowGlow;
                    light.intensity = allowGlow ? light.userData.baseIntensity : 0;
                }

                if (allowGlow) glowBudget--;
            }
        };
`;
