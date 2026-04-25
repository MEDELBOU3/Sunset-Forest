export default String.raw`
        // =========================================================
        // WORLD LOOT SPAWNS  (edit positions freely)
        // =========================================================
        // WEAPON SPAWNS (all weapons, spread around the map)
        spawnWeaponLoot('shotgun', 18, -12);
        spawnWeaponLoot('shotgun', -30, 22);
        spawnWeaponLoot('grinade', 5, 20);
        spawnWeaponLoot('grinade', -20, -30);
        spawnWeaponLoot('AK-47', -12, 18);
        spawnWeaponLoot('AK-47', 35, -5);
        spawnWeaponLoot('mp5', 15, -20);
        spawnWeaponLoot('mp5', -40, 30);
        spawnWeaponLoot('mp_40', 25, 40);
        spawnWeaponLoot('mp_40', -25, -35);
        spawnWeaponLoot('scar', 8, 15);
        spawnWeaponLoot('scar', -15, -10);
        spawnWeaponLoot('awm', 40, 20);
        spawnWeaponLoot('awm', -35, 45);
        spawnScopeLoot(12, -25);
        spawnScopeLoot(-28, 18);
        spawnScopeLoot(50, -10);

        // AMMO SPAWNS
        spawnAmmoLoot('pistol', 5, 10);
        spawnAmmoLoot('pistol', -8, -15);
        spawnAmmoLoot('shotgun', 30, -8);
        spawnAmmoLoot('shotgun', -18, 20);
        spawnAmmoLoot('rifle', 12, 30);
        spawnAmmoLoot('rifle', -22, -18);
        spawnAmmoLoot('smg', -5, 25);
        spawnAmmoLoot('smg', 20, -10);

        let currentWeaponKey = '1911';
        // Only weapons the player has picked up are available in the wheel
        // The starting pistol is always unlocked
        const unlockedWeapons = new Set(['1911']);

        function isWeaponUnlocked(key) { return unlockedWeapons.has(key); }
        function unlockWeapon(key) {
            unlockedWeapons.add(key);
            rebuildWWKeys();
            setActiveSlot(currentWeaponKey);
        }

        // WW_KEYS is now dynamic - rebuilt when a weapon is looted
        let WW_KEYS = ['1911'];
        function rebuildWWKeys() {
            WW_KEYS = Object.keys(weapons).filter(k => unlockedWeapons.has(k));
        }

        const gltfLoader = new GLTFLoader();

        function loadWeaponMesh(key, callback) {
            const w = weapons[key];

            getCachedModel(key, w.path, (mesh) => {
                const bbox = new THREE.Box3().setFromObject(mesh);
                const bboxSize = new THREE.Vector3();
                bbox.getSize(bboxSize);
                const longestDim = Math.max(bboxSize.x, bboxSize.y, bboxSize.z);
                const fitScale = longestDim > 0 ? w.targetSize / longestDim : 0.3;
                mesh.scale.setScalar(fitScale);

                mesh.position.copy(isADS ? w.adsPos : w.viewPos);
                mesh.rotation.y = w.rotationY;
                mesh.rotation.z = w.rotationZ;
                mesh.frustumCulled = false;
                mesh.traverse(n => {
                    if (n.isMesh) {
                        n.castShadow = true;
                        n.receiveShadow = true;
                        n.frustumCulled = false;
                        if (n.material) {
                            n.material.side = THREE.DoubleSide;
                            n.material.transparent = false;
                            n.material.opacity = 1.0;
                            n.material.depthWrite = true;
                            n.material.visible = true;
                            n.material.colorWrite = true;
                            n.material.needsUpdate = true;
                        }
                    }
                });

                const flash = new THREE.PointLight(0xffaa00, 12, 5);
                flash.position.copy(w.muzzleOffset);
                flash.visible = false;
                mesh.add(flash);

                callback(mesh, flash, fitScale);
            });
        }

        const audioCache = new Map();
        let activeWeaponLoadToken = 0;

        function preloadWeaponAudio() {
            Object.entries(weapons).forEach(([key, w]) => {
                if (!w || !w.sound || key === 'grinade' || audioCache.has(w.sound)) return;
                audioLoader.load(w.sound, (buf) => {
                    audioCache.set(w.sound, buf);
                    if (currentWeaponKey === key && typeof setGunshotPoolBuffer === 'function') {
                        setGunshotPoolBuffer(buf, 1.0);
                    }
                }, undefined, err => console.warn('Weapon audio not found:', w.sound, err));
            });
        }

        function applyWeaponStatsToRuntime(key, preserveAmmo = false) {
            const w = weapons[key];
            if (!w) return;

            const nextAmmo = preserveAmmo
                ? Math.min(w.maxAmmo, w.ammo ?? weaponStats.currentAmmo ?? w.maxAmmo)
                : w.maxAmmo;

            weaponStats.currentAmmo = nextAmmo;
            weaponStats.maxAmmo = w.maxAmmo;
            weaponStats.reloadTime = w.reloadTime;
            weaponStats.fireRate = w.fireRate;
            weaponStats.damage = w.damage;
            weaponStats.isReloading = false;
            w.ammo = nextAmmo;
        }

        function syncEquippedWeaponAmmo() {
            const equippedWeapon = weapons[currentWeaponKey];
            if (equippedWeapon) {
                equippedWeapon.ammo = Math.min(equippedWeapon.maxAmmo, weaponStats.currentAmmo);
            }
        }

        function configureWeaponAudio(key) {
            const w = weapons[key];
            if (!w || key === 'grinade') return;

            if (audioCache.has(w.sound)) {
                const buf = audioCache.get(w.sound);
                if (typeof setGunshotPoolBuffer === 'function') setGunshotPoolBuffer(buf, 1.0);
                else gunshotPool.forEach(sound => {
                    sound.setBuffer(buf);
                    sound.setLoop(false);
                    sound.setVolume(1.0);
                });
                return;
            }

            audioLoader.load(w.sound, (buf) => {
                audioCache.set(w.sound, buf);
                if (currentWeaponKey !== key) return;

                if (typeof setGunshotPoolBuffer === 'function') setGunshotPoolBuffer(buf, 1.0);
                else gunshotPool.forEach(sound => {
                    sound.setBuffer(buf);
                    sound.setLoop(false);
                    sound.setVolume(1.0);
                });
            }, undefined, err => console.warn('Weapon audio not found:', w.sound, err));
        }

        preloadWeaponAudio();

        function switchWeapon(key) {
            const w = weapons[key];
            if (!w) return;

             if (thermalActive && !w.acceptsLootedScope) {
                disableThermal();
            }

            if (key === currentWeaponKey && weaponMesh !== null) {
                applyWeaponStatsToRuntime(key, true);
                configureWeaponAudio(key);
                updateAmmoHUD();
                return;
            }

            syncEquippedWeaponAmmo();
            currentWeaponKey = key;
            const loadToken = ++activeWeaponLoadToken;

            if (weaponMesh) {
                weaponGroup.remove(weaponMesh);
                weaponMesh = null;
                muzzleFlash = null;
            }

            applyWeaponStatsToRuntime(key, true);
            configureWeaponAudio(key);

            loadWeaponMesh(key, (mesh, flash) => {
                if (loadToken !== activeWeaponLoadToken || currentWeaponKey !== key) return;

                weaponMesh = mesh;
                muzzleFlash = flash;
                weaponGroup.add(weaponMesh);
                applyWeaponStatsToRuntime(key, true);

                const weaponNameEl = document.getElementById('weapon-name');
                const ammoMaxEl = document.getElementById('ammo-max');
                if (weaponNameEl) weaponNameEl.textContent = w.name;
                if (ammoMaxEl) ammoMaxEl.textContent = w.maxAmmo;
                updateAmmoHUD();
                setActiveSlot(key);

                if (key === 'grinade') {
                    if (pinPullBuffer) {
                        const pinSound = new THREE.Audio(listener);
                        pinSound.setBuffer(pinPullBuffer);
                        pinSound.setVolume(1.5);
                        pinSound.play();
                    }
                } else {
                    if (weaponSwitchBuffer) {
                        const switchSound = new THREE.Audio(listener);
                        switchSound.setBuffer(weaponSwitchBuffer);
                        switchSound.setVolume(1.0);
                        switchSound.play();
                    }
                    configureWeaponAudio(key);
                }

                showNotification('Equipped: ' + w.name);
            });
        }
        window.switchWeapon = switchWeapon;

        loadWeaponMesh('1911', (mesh, flash) => {
            weaponMesh = mesh;
            muzzleFlash = flash;
            weaponGroup.add(weaponMesh);
            applyWeaponStatsToRuntime('1911', true);
            configureWeaponAudio('1911');
            updateAmmoHUD();
            setActiveSlot('1911');
        });
`;
