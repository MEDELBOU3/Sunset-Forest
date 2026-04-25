export default String.raw`
        // =========================================================
        // WEAPON SYSTEM
        // =========================================================
        const weaponGroup = new THREE.Group();
        camera.add(weaponGroup);

        let weaponMesh = null;
        let muzzleFlash = null;
        const raycaster = new THREE.Raycaster();
        const mouseCenter = new THREE.Vector2(0, 0);
        let recoil = 0;
        let isADS = false;

        // ===================== ARMA-STYLE LASER TRAJECTORY UI =====================
        const activeGrenades = [];

        const trajMat = new THREE.MeshBasicMaterial({
            color: 0xff1100,
            transparent: true,
            opacity: 0.65,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        });

        const trajectoryMesh = new THREE.Mesh(new THREE.BufferGeometry(), trajMat);
        trajectoryMesh.frustumCulled = false;
        scene.add(trajectoryMesh);
        trajectoryMesh.visible = false;

        const impactMarker = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 0.8, 24),
            new THREE.MeshBasicMaterial({
                color: 0xff1100,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8,
                blending: THREE.AdditiveBlending
            })
        );
        impactMarker.rotation.x = -Math.PI / 2;
        scene.add(impactMarker);
        impactMarker.visible = false;

        const weaponStats = {
            maxAmmo: 7,
            currentAmmo: 7,
            reloadTime: 1.8,
            isReloading: false,
            fireRate: 0.15,
            lastFired: 0,
            damage: 35,
        };

        const playerStats = {
            health: 100,
            maxHealth: 100,
            stamina: 100,
            maxStamina: 100,
            staminaDrain: 30,
            staminaRegen: 15,
            isJumping: false,
            isCrouching: false,
            verticalVelocity: 0,
            GROUND_CAMERA_Y: -2.03,
            CROUCH_CAMERA_Y: -3.2,
        };

        const weapons = {
            '1911': {
                icon: 'assets/weapon/weapon-images/1911.png',
                name: 'Kimber 1911',
                path: 'assets/weapon/kimber_1911.glb',
                sound: 'assets/sound-effects/freesound_community-perdition-1911-pistol-82365.mp3',
                ammo: 7, maxAmmo: 7, reloadTime: 1.8,
                fireRate: 0.15,
                damage: 35, targetSize: 0.55,
                viewPos: new THREE.Vector3(0.35, -0.26, -0.3),
                adsPos: new THREE.Vector3(0.0, -0.195, -0.075),
                muzzleOffset: new THREE.Vector3(0, 0.05, -0.25),
                rotationY: Math.PI, rotationZ: 0, isAuto: false,
                builtinScope: false,
                acceptsLootedScope: false,
                adsFov: 48,
                reserveAmmo: 0, maxReserve: 21
            },
            'shotgun': {
                icon: 'assets/weapon/weapon-images/shotgun.png',
                name: 'MP-133 Shotgun',
                path: 'assets/weapon/mp-133_shotgun.glb',
                sound: 'assets/sound-effects/freesound_community-doom-shotgun-2017-80549.mp3',
                ammo: 5, maxAmmo: 5, reloadTime: 2.4,
                fireRate: 0.75,
                damage: 90, targetSize: 1.0,
                viewPos: new THREE.Vector3(0.3, -0.4, -0.1),
                adsPos: new THREE.Vector3(0.0, -0.38, -0.19),
                muzzleOffset: new THREE.Vector3(0, 0.04, -0.45),
                rotationY: Math.PI / 2 - 1.5, rotationZ: 0, isAuto: false,
                builtinScope: false,
                acceptsLootedScope: false,
                adsFov: 52,
                reserveAmmo: 0, maxReserve: 15
            },
            'grinade': {
                icon: 'assets/weapon/weapon-images/grenade.png',
                name: 'Grinade',
                path: 'assets/weapon/mk2_grenade.glb',
                sound: 'assets/sound-effects/8d82b5_Halo_3_Plasma_Grenade_Explode_Sound_Effect.mp3',
                ammo: 7, maxAmmo: 7, reloadTime: 1.8,
                fireRate: 0.15, damage: 35, targetSize: 0.55,
                viewPos: new THREE.Vector3(0.35, -0.30, -0.55),
                adsPos: new THREE.Vector3(0.0, -0.38, -0.19),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI + 0.1, rotationZ: 0, isAuto: false,
                builtinScope: false,
                acceptsLootedScope: false,
                adsFov: 58,
                reserveAmmo: 0, maxReserve: 7
            },
            'AK-47': {
                icon: 'assets/weapon/weapon-images/Ak-47.png',
                name: 'AK-47',
                path: 'assets/weapon/ak-47.glb',
                sound: 'assets/sound-effects/8d82b5_Call_Of_Duty_AK-47_Firing_Sound_Effect.mp3',
                ammo: 30, maxAmmo: 30, reloadTime: 1.8,
                fireRate: 0.09,
                damage: 38, targetSize: 1.0,
                viewPos: new THREE.Vector3(0.35, -0.29, -0.3),
                adsPos: new THREE.Vector3(0.0, -0.29, -0.18),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI - 1.54, rotationZ: 0, isAuto: true,
                builtinScope: false,
                acceptsLootedScope: true,
                adsFov: 43,
                scopeFov: 26,
                reserveAmmo: 0, maxReserve: 90
            },
            'mp5': {
                icon: 'assets/weapon/weapon-images/mp-5.png',
                name: 'MP5',
                path: 'assets/weapon/mp5.glb',
                sound: 'assets/sound-effects/mp5-sound.mp3',
                ammo: 30, maxAmmo: 30, reloadTime: 1.5,
                fireRate: 0.065,
                damage: 22, targetSize: 1.5,
                viewPos: new THREE.Vector3(0.35, -0.34, -0.4),
                adsPos: new THREE.Vector3(0.0, -0.18, -0.25),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI, rotationZ: 0, isAuto: true,
                builtinScope: false,
                acceptsLootedScope: false,
                adsFov: 47,
                reserveAmmo: 0, maxReserve: 90
            },
            'mp_40': {
                icon: 'assets/weapon/weapon-images/Mp40.png',
                name: 'MP-40',
                path: 'assets/weapon/mp_40.glb',
                sound: 'assets/sound-effects/mp-40-shot.mp3',
                ammo: 32, maxAmmo: 32, reloadTime: 1.6,
                fireRate: 0.08,
                damage: 26, targetSize: 1.0,
                viewPos: new THREE.Vector3(0.35, -0.34, -0.4),
                adsPos: new THREE.Vector3(0.0, -0.18, -0.18),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI + 1.54, rotationZ: 0, isAuto: true,
                builtinScope: false,
                acceptsLootedScope: false,
                adsFov: 48,
                reserveAmmo: 0, maxReserve: 96
            },
            'scar': {
                icon: 'assets/weapon/weapon-images/scar.png',
                name: 'Scar',
                path: 'assets/weapon/scar_17.glb',
                sound: 'assets/sound-effects/scar.mp3',
                ammo: 30, maxAmmo: 30, reloadTime: 1.6,
                fireRate: 0.085,
                damage: 26, targetSize: 1.0,
                viewPos: new THREE.Vector3(0.35, -0.6, -0.4),
                adsPos: new THREE.Vector3(-0.28, -0.45, -0.2),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI - 1.54, rotationZ: 0, isAuto: true,
                builtinScope: false,
                acceptsLootedScope: true,
                adsFov: 42,
                scopeFov: 22,
                reserveAmmo: 0, maxReserve: 90
            },
            'awm': {
                icon: 'assets/weapon/weapon-images/AWM.png',
                name: 'AWM',
                path: 'assets/weapon/awm.glb',
                sound: 'assets/sound-effects/awm-gun-shooting-sound-effect.mp3',
                ammo: 7, maxAmmo: 7, reloadTime: 1.8,
                fireRate: 1.2,
                damage: 526, targetSize: 1.0, lootTargetSize: 1.0,
                viewPos: new THREE.Vector3(0.28, -0.38, -0.55),
                adsPos: new THREE.Vector3(-0.02, -0.32, -0.22),
                muzzleOffset: new THREE.Vector3(0, 0.06, -0.28),
                rotationY: Math.PI - 1.54, rotationZ: 0, isAuto: false,
                builtinScope: true,
                acceptsLootedScope: true,
                adsFov: 34,
                scopeFov: 12,
                reserveAmmo: 0, maxReserve: 14
            },
        };

        function preloadAllWeaponModels() {
            if (typeof lootModelCache === 'undefined') {
                console.warn('preloadAllWeaponModels: lootModelCache not ready');
                return;
            }

            Object.entries(weapons).forEach(([key, w]) => {
                if (w.path && !lootModelCache.has(key)) {
                    new GLTFLoader().load(
                        w.path,
                        (gltf) => {
                            lootModelCache.set(key, gltf.scene);
                            console.log('Preloaded: ' + w.name);
                        },
                        undefined,
                        err => console.warn('Preload failed: ' + key, err)
                    );
                }
            });
        }
`;
