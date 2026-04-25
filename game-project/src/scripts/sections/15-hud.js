export default String.raw`
        // =========================================================
        // HUD
        // =========================================================
        const healthBar = document.getElementById('health-bar');
        const healthVal = document.getElementById('health-val');
        const staminaBar = document.getElementById('stamina-bar');
        const staminaVal = document.getElementById('stamina-val');
        const reloadNotice = document.getElementById('reload-notice');
        const reloadBarWrap = document.getElementById('reload-bar-wrap');
        const reloadBarFill = document.getElementById('reload-bar');
        const hitMarker = document.getElementById('hit-marker');
        const compassDir = document.getElementById('compass-dir');
        const notifications = document.getElementById('notifications');
        const vignette = document.getElementById('vignette');
        const sprintLabel = document.getElementById('stamina-sprint-label');
        const interactPrompt = document.getElementById('interact-prompt');
        const interactText = document.getElementById('interact-text');
        const minimapCanvas = document.getElementById('minimap-canvas');
        const minimapCtx = minimapCanvas.getContext('2d');
        const MINIMAP_SCALE = 110 / 200;
        const vehicleHud = document.getElementById('vehicle-hud');
        const vehicleSpeedValue = document.getElementById('vehicle-speed-value');
        const vehicleButtons = [...document.querySelectorAll('#vehicle-controls [data-drive]')];

        function setDriveInput(action, active) {
            if (action === 'exit') {
                if (active && armoredCar.active) exitArmoredCar();
                return;
            }
            if (!(action in moveState)) return;
            moveState[action] = active;
            const btn = vehicleButtons.find(el => el.dataset.drive === action);
            if (btn) btn.classList.toggle('active', active);
        }

        vehicleButtons.forEach(btn => {
            const action = btn.dataset.drive;
            const press = (e) => {
                e.preventDefault();
                setDriveInput(action, true);
            };
            const release = (e) => {
                e.preventDefault();
                setDriveInput(action, false);
            };
            btn.addEventListener('pointerdown', press);
            btn.addEventListener('pointerup', release);
            btn.addEventListener('pointercancel', release);
            btn.addEventListener('pointerleave', release);
        });

        const VILLAGE_WORLD_POS = { x: 0, z: -120 };

        function drawMinimap() {
            minimapCtx.clearRect(0, 0, 110, 110);
            minimapCtx.save();
            minimapCtx.beginPath();
            minimapCtx.arc(55, 55, 54, 0, Math.PI * 2);
            minimapCtx.clip();

            minimapCtx.fillStyle = 'rgba(10,20,10,0.85)';
            minimapCtx.fillRect(0, 0, 110, 110);

            {
                const VILLAGE_MAP_X = 55 + VILLAGE_WORLD_POS.x * MINIMAP_SCALE;
                const VILLAGE_MAP_Z = 55 + VILLAGE_WORLD_POS.z * MINIMAP_SCALE;

                const dx = VILLAGE_MAP_X - 55;
                const dz = VILLAGE_MAP_Z - 55;
                const distFromCenter = Math.sqrt(dx * dx + dz * dz);
                const pulse = 0.7 + 0.3 * Math.sin(performance.now() * 0.003);

                if (distFromCenter <= 50) {
                    minimapCtx.save();
                    minimapCtx.globalAlpha = pulse;
                    minimapCtx.shadowColor = '#ffaa33';
                    minimapCtx.shadowBlur = 10;
                    minimapCtx.fillStyle = '#ffaa33';
                    minimapCtx.fillRect(VILLAGE_MAP_X - 4, VILLAGE_MAP_Z - 2, 8, 6);
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(VILLAGE_MAP_X, VILLAGE_MAP_Z - 7);
                    minimapCtx.lineTo(VILLAGE_MAP_X - 5, VILLAGE_MAP_Z - 2);
                    minimapCtx.lineTo(VILLAGE_MAP_X + 5, VILLAGE_MAP_Z - 2);
                    minimapCtx.closePath();
                    minimapCtx.fillStyle = '#ff8800';
                    minimapCtx.fill();
                    minimapCtx.restore();
                } else {
                    const norm = 50 / distFromCenter;
                    const edgeX = 55 + dx * norm;
                    const edgeZ = 55 + dz * norm;
                    const angle = Math.atan2(dz, dx);

                    minimapCtx.save();
                    minimapCtx.globalAlpha = pulse;
                    minimapCtx.shadowColor = '#ffaa33';
                    minimapCtx.shadowBlur = 8;
                    minimapCtx.translate(edgeX, edgeZ);
                    minimapCtx.rotate(angle);
                    minimapCtx.fillStyle = '#ffaa33';
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(7, 0);
                    minimapCtx.lineTo(-4, -4);
                    minimapCtx.lineTo(-2, 0);
                    minimapCtx.lineTo(-4, 4);
                    minimapCtx.closePath();
                    minimapCtx.fill();
                    minimapCtx.restore();
                }

                const distToVillage = Math.sqrt(
                    Math.pow(camera.position.x - VILLAGE_WORLD_POS.x, 2) +
                    Math.pow(camera.position.z - VILLAGE_WORLD_POS.z, 2)
                );
                const villageDistEl = document.getElementById('minimap-village-dist');
                if (villageDistEl) {
                    villageDistEl.textContent = 'DY' + Math.round(distToVillage) + 'M';
                }
            }

            mushroomWorldPositions.forEach(m => {
                const mx = 55 + m.x * MINIMAP_SCALE;
                const mz = 55 + m.z * MINIMAP_SCALE;
                const pulse = 0.6 + 0.4 * Math.sin(performance.now() * 0.004);
                minimapCtx.save();
                minimapCtx.globalAlpha = pulse;
                minimapCtx.fillStyle = '#44ff99';
                minimapCtx.shadowColor = '#44ff99';
                minimapCtx.shadowBlur = 6;
                minimapCtx.beginPath();
                minimapCtx.arc(mx, mz, 3.5, 0, Math.PI * 2);
                minimapCtx.fill();
                minimapCtx.restore();
            });

            for (const z of zombies) {
                if (z.isDead) continue;
                const zx = 55 + z.mesh.position.x * MINIMAP_SCALE;
                const zz = 55 + z.mesh.position.z * MINIMAP_SCALE;
                minimapCtx.fillStyle = 'rgba(255,50,50,0.85)';
                minimapCtx.beginPath();
                minimapCtx.arc(zx, zz, 2.5, 0, Math.PI * 2);
                minimapCtx.fill();
            }

            const px = 55 + camera.position.x * MINIMAP_SCALE;
            const pz = 55 + camera.position.z * MINIMAP_SCALE;
            minimapCtx.fillStyle = '#ffcc66';
            minimapCtx.beginPath();
            minimapCtx.arc(px, pz, 4, 0, Math.PI * 2);
            minimapCtx.fill();

            minimapCtx.restore();

            if (armoredCar.loaded && armoredCar.root) {
                const cx = 55 + armoredCar.root.position.x * MINIMAP_SCALE;
                const cz = 55 + armoredCar.root.position.z * MINIMAP_SCALE;
                minimapCtx.fillStyle = armoredCar.active ? '#00ccff' : 'rgba(0,180,255,0.5)';
                minimapCtx.beginPath();
                minimapCtx.arc(cx, cz, armoredCar.active ? 5 : 3.5, 0, Math.PI * 2);
                minimapCtx.fill();
                if (armoredCar.active) {
                    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(armoredCar.root.quaternion);
                    minimapCtx.beginPath();
                    minimapCtx.moveTo(cx + fwd.x * 8, cz + fwd.z * 8);
                    minimapCtx.lineTo(cx - fwd.z * 4, cz + fwd.x * 4);
                    minimapCtx.lineTo(cx + fwd.z * 4, cz - fwd.x * 4);
                    minimapCtx.closePath();
                    minimapCtx.fillStyle = '#00ccff';
                    minimapCtx.fill();
                }
            }

            minimapCtx.strokeStyle = 'rgba(255,180,80,0.2)';
            minimapCtx.lineWidth = 1;
            minimapCtx.stroke();
        }

        function updateCompass() {
            const dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            const angle = Math.atan2(dir.x, dir.z) * 180 / Math.PI;
            const normalized = ((angle % 360) + 360) % 360;
            const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
            compassDir.textContent = dirs[Math.round(normalized / 45) % 8];
        }

        function updateHealthHUD() {
            const pct = (playerStats.health / playerStats.maxHealth * 100).toFixed(0);
            healthBar.style.width = pct + '%';
            healthVal.textContent = Math.ceil(playerStats.health);
            healthBar.style.background = playerStats.health < 30
                ? 'linear-gradient(90deg,#dd2222,#ff5555)'
                : 'linear-gradient(90deg,#22dd66,#44ff99)';
        }

        function updateStaminaHUD() {
            const pct = (playerStats.stamina / playerStats.maxStamina * 100).toFixed(0);
            staminaBar.style.width = pct + '%';
            staminaVal.textContent = Math.ceil(playerStats.stamina);
        }

        function updateAmmoHUD() {
            const cur = Math.max(0, weaponStats.currentAmmo || 0);
            const max = Math.max(1, weaponStats.maxAmmo || 1);
            const ratio = cur / max;
            const activeWeapon = weapons[currentWeaponKey];

            const ammoCountEl = document.getElementById('ammo-count');
            const ammoMaxEl = document.getElementById('ammo-max');
            const ammoReserveEl = document.getElementById('ammo-reserve');
            const ammoLabelEl = document.querySelector('#panel-br .ammo-label');
            const weaponNameEl = document.getElementById('weapon-name');
            const pips = document.getElementById('ammo-pips');

            if (ammoCountEl) {
                ammoCountEl.textContent = cur;
                ammoCountEl.classList.toggle('critical', ratio <= 0.15);
                ammoCountEl.classList.toggle('low', ratio > 0.15 && ratio <= 0.35);
            }

            if (ammoMaxEl) ammoMaxEl.textContent = max;
            if (ammoReserveEl) {
                const reserve = activeWeapon && typeof activeWeapon.reserveAmmo !== 'undefined'
                    ? activeWeapon.reserveAmmo
                    : 0;
                ammoReserveEl.textContent = reserve;
            }
            if (ammoLabelEl) {
                ammoLabelEl.textContent = currentWeaponKey === 'grinade' ? 'THROWABLES' : 'RESERVE AMMO';
            }
            if (weaponNameEl && activeWeapon) weaponNameEl.textContent = activeWeapon.name;

            if (!pips) return;

            pips.innerHTML = '';
            const pipDisplay = Math.min(max, 10);
            const filledPips = Math.round(ratio * pipDisplay);

            for (let i = 0; i < pipDisplay; i++) {
                const pip = document.createElement('span');
                pip.className = 'pip' + (i < filledPips ? (ratio <= 0.35 ? ' low' : ' full') : '');
                pips.appendChild(pip);
            }
        }

        function startReloadBar(durationMs) {
            const wrap = document.getElementById('reload-wrap');
            const bar = document.getElementById('reload-bar');
            if (!wrap || !bar) return;
            wrap.style.display = 'flex';
            bar.style.transition = 'none';
            bar.style.width = '0%';
            requestAnimationFrame(() => {
                bar.style.transition = 'width ' + durationMs + 'ms linear';
                bar.style.width = '100%';
            });
            setTimeout(() => {
                wrap.style.display = 'none';
                bar.style.width = '0%';
            }, durationMs);
        }

        function setActiveSlot(key) {
            const container = document.getElementById('wp-slots-container');
            if (!container) return;
            container.innerHTML = '';

            const keys = [...unlockedWeapons];
            const MAX_SLOTS = 5;
            let startIdx = 0;
            const keyIdx = keys.indexOf(key);
            if (keyIdx >= MAX_SLOTS) startIdx = keyIdx - MAX_SLOTS + 1;
            const visibleKeys = keys.slice(startIdx, startIdx + MAX_SLOTS);

            visibleKeys.forEach((wKey) => {
                const w = weapons[wKey];
                const slot = document.createElement('div');
                const isActive = wKey === key;
                slot.className = 'wp-slot' + (isActive ? ' active' : '');
                slot.dataset.key = wKey;

                const globalIdx = keys.indexOf(wKey) + 1;
                slot.innerHTML = ''
                    + '<span class="wp-num">' + globalIdx + '</span>'
                    + '<div class="wp-thumb">'
                        + '<img class="wp-icon-img" src="' + w.icon + '" alt="' + w.name + '" onerror="this.style.display=\'none\'" draggable="false">'
                    + '</div>'
                    + '<div class="wp-meta">'
                        + '<span class="wp-label">' + w.name.toUpperCase() + '</span>'
                        + '<span class="wp-ammo-mini">' + (w.ammo ?? 0) + '/' + w.maxAmmo + '</span>'
                    + '</div>';

                slot.addEventListener('click', () => switchWeapon(wKey));
                container.appendChild(slot);
            });
        }

        function showNotification(msg) {
            const el = document.createElement('div');
            el.className = 'notif';
            el.textContent = msg;
            notifications.appendChild(el);
            setTimeout(() => el.remove(), 3200);
        }

        function showHitMarker(isHeadshot) {
            hitMarker.classList.remove('flash', 'headshot-flash');
            void hitMarker.offsetWidth;
            hitMarker.classList.add(isHeadshot ? 'headshot-flash' : 'flash');
        }

        function triggerDamageVignette() {
            vignette.classList.remove('damaged');
            void vignette.offsetWidth;
            vignette.classList.add('damaged');
        }
`;
