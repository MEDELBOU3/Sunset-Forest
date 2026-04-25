export default String.raw`
        // =========================================================
        // RUNTIME PERFORMANCE TWEAKS
        // =========================================================
        const compassDirectionVec = new THREE.Vector3();
        const zombieHudWorldPos = new THREE.Vector3();
        const zombieHudProjected = new THREE.Vector3();
        const armoredCarInteractBox = new THREE.Box3();
        let runtimeStaticScenePassDone = false;
        let runtimeStaticScenePassQuality = '';

        function isFirstPersonNode(node) {
            let current = node;
            while (current) {
                if (current === camera || current === weaponGroup) return true;
                current = current.parent;
            }
            return false;
        }

        updateCompass = function () {
            camera.getWorldDirection(compassDirectionVec);
            const angle = Math.atan2(compassDirectionVec.x, compassDirectionVec.z) * 180 / Math.PI;
            const normalized = ((angle % 360) + 360) % 360;
            const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
            compassDir.textContent = dirs[Math.round(normalized / 45) % 8];
        };

        updateLootAnimations = function (timeSec) {
            const maxDistSq = performanceState.quality === 'low'
                ? 18 * 18
                : performanceState.quality === 'medium'
                    ? 22 * 22
                    : 25 * 25;

            const spinStep = performanceState.quality === 'low' ? 0.004 : 0.008;

            for (const entry of worldLoot) {
                if (!entry.mesh) continue;

                const dx = camera.position.x - entry.mesh.position.x;
                const dz = camera.position.z - entry.mesh.position.z;
                if ((dx * dx) + (dz * dz) > maxDistSq) continue;

                const bobY = Math.sin(timeSec * 1.8 + entry.bobPhase) * 0.10;
                const baseY = entry.baseY !== undefined
                    ? entry.baseY
                    : (entry.type === 'weapon' ? -4.6 : -4.4);

                entry.mesh.position.y = baseY + bobY;
                entry.mesh.rotation.y += spinStep;
            }
        };

        updateZombieHUD = function (z, distToPlayer) {
            zombieHudWorldPos.copy(z.mesh.position);
            zombieHudWorldPos.y = GROUND_Y + ZOMBIE_VISUAL_HEIGHT + 0.5;
            zombieHudProjected.copy(zombieHudWorldPos).project(camera);

            if (zombieHudProjected.z < 1 && Math.abs(zombieHudProjected.x) < 1.1 && Math.abs(zombieHudProjected.y) < 1.1) {
                const sx = (zombieHudProjected.x * 0.5 + 0.5) * window.innerWidth;
                const sy = (-zombieHudProjected.y * 0.5 + 0.5) * window.innerHeight;
                z.hbWrap.style.display = 'block';
                z.hbWrap.style.left = sx + 'px';
                z.hbWrap.style.top = sy + 'px';
                const scaleFactor = Math.max(0.4, Math.min(1.2, 12 / distToPlayer));
                z.hbWrap.style.transform = 'translate(-50%, -100%) scale(' + scaleFactor + ')';
                z.hbFill.style.width = (z.hp / z.maxHp * 100) + '%';
            } else {
                z.hbWrap.style.display = 'none';
            }
        };

        function showSimpleInteractPrompt(text, key = 'E') {
            interactPrompt.innerHTML =
                '<span class="interact-key">' + key + '</span>' +
                '<span class="interact-text">' + text + '</span>';
            interactPrompt.classList.add('visible');
        }

        getNearbyArmoredCar = function () {
            if (!armoredCar.loaded || !armoredCar.root || armoredCar.active) return null;

            armoredCar.root.updateMatrixWorld(true);
            armoredCarInteractBox.setFromObject(armoredCar.root);

            if (armoredCarInteractBox.isEmpty()) {
                const dx = camera.position.x - armoredCar.root.position.x;
                const dz = camera.position.z - armoredCar.root.position.z;
                return ((dx * dx) + (dz * dz) <= 8.5 * 8.5) ? armoredCar : null;
            }

            const margin = 1.35;
            const px = camera.position.x;
            const pz = camera.position.z;
            const minX = armoredCarInteractBox.min.x - margin;
            const maxX = armoredCarInteractBox.max.x + margin;
            const minZ = armoredCarInteractBox.min.z - margin;
            const maxZ = armoredCarInteractBox.max.z + margin;

            if (px >= minX && px <= maxX && pz >= minZ && pz <= maxZ) {
                return armoredCar;
            }

            const clampedX = Math.max(minX, Math.min(px, maxX));
            const clampedZ = Math.max(minZ, Math.min(pz, maxZ));
            const dx = px - clampedX;
            const dz = pz - clampedZ;

            return ((dx * dx) + (dz * dz) <= 1.2 * 1.2) ? armoredCar : null;
        };

        performanceRuntimePass = function () {
            const fullShadows = renderer.shadowMap.enabled && performanceState.quality === 'high';
            const dynamicShadows = renderer.shadowMap.enabled && performanceState.quality !== 'low';

            if (!runtimeStaticScenePassDone || runtimeStaticScenePassQuality !== performanceState.quality) {
                scene.traverse(node => {
                    if (!node.isMesh) return;
                    if (isFirstPersonNode(node)) return;
                    if (!node.isSkinnedMesh) {
                        node.frustumCulled = true;
                    }
                });
                runtimeStaticScenePassDone = true;
                runtimeStaticScenePassQuality = performanceState.quality;
            }

            if (armoredCar.root) {
                armoredCar.root.traverse(node => {
                    if (!node.isMesh) return;
                    node.frustumCulled = true;
                    node.receiveShadow = fullShadows;
                    node.castShadow = dynamicShadows;
                });
            }

            for (const entry of worldLoot) {
                if (!entry.mesh) continue;
                entry.mesh.traverse(node => {
                    if (!node.isMesh) return;
                    node.frustumCulled = true;
                    node.receiveShadow = fullShadows;
                    if (entry.type === 'weapon' || entry.type === 'scope') {
                        node.castShadow = dynamicShadows;
                    }
                });
            }

            for (const z of zombies) {
                if (!z.mesh) continue;
                z.mesh.traverse(node => {
                    if (!node.isMesh) return;
                    node.receiveShadow = fullShadows;
                    node.castShadow = dynamicShadows;
                });
            }

            if (typeof ground !== 'undefined') {
                ground.receiveShadow = renderer.shadowMap.enabled;
            }
        };

        performanceRuntimePass();
`;
