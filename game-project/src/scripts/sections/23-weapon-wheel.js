export default String.raw`
        // =========================================================
        // WEAPON WHEEL
        // =========================================================
        const WW_CODES = {
            '1911': 'M1911',
            'shotgun': 'MP133',
            'grinade': 'MK2',
            'AK-47': 'AK47',
            'mp5': 'MP5',
            'mp_40': 'MP40',
            'scar': 'SCAR',
            'awm': 'AWM',
        };
        const WW_OUTER = 190;
        const WW_INNER = 68;
        const WW_GAP = 3.5;
        const WW_MAX_R = 152;
        const SVG_NS = 'http://www.w3.org/2000/svg';

        let wwOpen = false;
        let wwHovered = -1;
        let wwVX = 0;
        let wwVY = 0;
        let wwSegments = [];

        const wwEl = document.getElementById('weapon-wheel');
        const wwSvgEl = document.getElementById('ww-svg');
        const wwNameEl = document.getElementById('ww-name');
        const wwSubEl = document.getElementById('ww-sub');

        function wwPolar(deg, r) {
            const rad = (deg - 90) * Math.PI / 180;
            return { x: r * Math.cos(rad), y: r * Math.sin(rad) };
        }

        function wwArc(r1, r2, a1, a2) {
            const p1 = wwPolar(a1, r2), p2 = wwPolar(a2, r2);
            const p3 = wwPolar(a2, r1), p4 = wwPolar(a1, r1);
            const f = v => v.toFixed(2);
            const lg = (a2 - a1) > 180 ? 1 : 0;
            return 'M' + f(p1.x) + ',' + f(p1.y)
                + ' A' + r2 + ',' + r2 + ' 0 ' + lg + ' 1 ' + f(p2.x) + ',' + f(p2.y)
                + ' L' + f(p3.x) + ',' + f(p3.y)
                + ' A' + r1 + ',' + r1 + ' 0 ' + lg + ' 0 ' + f(p4.x) + ',' + f(p4.y) + ' Z';
        }

        function wwMakeEl(tag, attrs) {
            const el = document.createElementNS(SVG_NS, tag);
            for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
            return el;
        }

        function wwBuild() {
            wwSvgEl.innerHTML = '';
            wwSegments = [];
            const N = WW_KEYS.length;
            const segSize = 360 / N;

            wwSvgEl.appendChild(wwMakeEl('circle', { r: WW_OUTER + 10, fill: 'rgba(4,10,18,0.7)' }));

            WW_KEYS.forEach((key, i) => {
                const a1 = i * segSize + WW_GAP;
                const a2 = (i + 1) * segSize - WW_GAP;
                const aMid = (a1 + a2) / 2;
                const equipped = key === currentWeaponKey;
                const weapon = weapons[key];

                const seg = wwMakeEl('path', {
                    d: wwArc(WW_INNER + 5, WW_OUTER, a1, a2),
                    fill: equipped ? 'rgba(255,204,102,0.10)' : 'rgba(10,24,40,0.88)',
                    stroke: equipped ? 'rgba(255,204,102,0.38)' : 'rgba(100,150,200,0.11)',
                    'stroke-width': '1.5'
                });
                wwSvgEl.appendChild(seg);

                const lp = wwPolar(aMid, (WW_INNER + WW_OUTER) / 2 + 10);
                const f = v => v.toFixed(2);

                const iconSize = 42;
                const iconBg = wwMakeEl('rect', {
                    x: f(lp.x - iconSize / 2),
                    y: f(lp.y - 44),
                    width: iconSize,
                    height: iconSize * 0.72,
                    rx: '4',
                    fill: equipped ? 'rgba(255,204,102,0.10)' : 'rgba(255,255,255,0.04)',
                    stroke: equipped ? 'rgba(255,204,102,0.28)' : 'rgba(255,255,255,0.06)',
                    'stroke-width': '1',
                    'pointer-events': 'none',
                    id: 'ww-icon-bg-' + i
                });
                wwSvgEl.appendChild(iconBg);

                const icon = wwMakeEl('image', {
                    href: weapon && weapon.icon ? weapon.icon : '',
                    x: f(lp.x - iconSize / 2 + 3),
                    y: f(lp.y - 41),
                    width: iconSize - 6,
                    height: iconSize * 0.72 - 6,
                    preserveAspectRatio: 'xMidYMid meet',
                    opacity: equipped ? '1' : '0.88',
                    'pointer-events': 'none',
                    id: 'ww-icon-' + i
                });
                wwSvgEl.appendChild(icon);

                const code = wwMakeEl('text', {
                    x: f(lp.x), y: f(lp.y + 4),
                    'text-anchor': 'middle', 'dominant-baseline': 'middle',
                    fill: equipped ? 'rgba(255,220,100,0.95)' : 'rgba(215,228,245,0.85)',
                    'font-family': 'Cinzel, serif', 'font-size': '16',
                    'font-weight': '600', 'letter-spacing': '2',
                    'pointer-events': 'none', id: 'ww-code-' + i
                });
                code.textContent = WW_CODES[key] || key.toUpperCase();
                wwSvgEl.appendChild(code);

                const nm = wwMakeEl('text', {
                    x: f(lp.x), y: f(lp.y + 22),
                    'text-anchor': 'middle', 'dominant-baseline': 'middle',
                    fill: 'rgba(180,200,225,0.50)',
                    'font-family': 'Cinzel, serif', 'font-size': '8',
                    'letter-spacing': '1.2', 'pointer-events': 'none'
                });
                nm.textContent = weapon.name.toUpperCase();
                wwSvgEl.appendChild(nm);

                const ammo = wwMakeEl('text', {
                    x: f(lp.x), y: f(lp.y + 35),
                    'text-anchor': 'middle', 'dominant-baseline': 'middle',
                    fill: 'rgba(160,185,210,0.30)',
                    'font-family': 'Cinzel, serif', 'font-size': '7',
                    'letter-spacing': '1', 'pointer-events': 'none'
                });
                ammo.textContent = weapon.maxAmmo + ' RDS';
                wwSvgEl.appendChild(ammo);

                wwSegments.push({ seg, key, a1, a2, iconIndex: i });

                if (equipped) {
                    const dp = wwPolar(aMid, WW_INNER + 16);
                    wwSvgEl.appendChild(wwMakeEl('circle', {
                        cx: f(dp.x), cy: f(dp.y), r: '3',
                        fill: 'rgba(255,204,102,0.85)'
                    }));
                }
            });

            wwSvgEl.appendChild(wwMakeEl('circle', {
                r: WW_INNER, fill: 'rgba(4,10,18,0.96)',
                stroke: 'rgba(255,204,102,0.10)', 'stroke-width': '1'
            }));

            wwSvgEl.appendChild(wwMakeEl('circle', {
                r: WW_OUTER + 1, fill: 'none',
                stroke: 'rgba(100,145,185,0.16)', 'stroke-width': '1.5'
            }));

            const dot = wwMakeEl('circle', {
                id: 'ww-dot', r: '5',
                fill: 'rgba(255,204,102,0.95)',
                stroke: 'rgba(255,255,255,0.55)', 'stroke-width': '1.2',
                cx: '0', cy: '0', 'pointer-events': 'none'
            });
            wwSvgEl.appendChild(dot);
        }

        function wwHighlight() {
            wwSegments.forEach(({ seg, key, iconIndex }, i) => {
                const equipped = key === currentWeaponKey;
                const hov = i === wwHovered;
                const codeEl = document.getElementById('ww-code-' + i);
                const iconEl = document.getElementById('ww-icon-' + iconIndex);
                const iconBgEl = document.getElementById('ww-icon-bg-' + iconIndex);

                if (hov) {
                    seg.setAttribute('fill', 'rgba(28,78,148,0.88)');
                    seg.setAttribute('stroke', 'rgba(255,204,102,0.72)');
                    seg.setAttribute('stroke-width', '2');
                } else if (equipped) {
                    seg.setAttribute('fill', 'rgba(255,204,102,0.10)');
                    seg.setAttribute('stroke', 'rgba(255,204,102,0.38)');
                    seg.setAttribute('stroke-width', '1.5');
                } else {
                    seg.setAttribute('fill', 'rgba(10,24,40,0.88)');
                    seg.setAttribute('stroke', 'rgba(100,150,200,0.11)');
                    seg.setAttribute('stroke-width', '1.5');
                }

                if (codeEl) {
                    codeEl.setAttribute('fill',
                        hov ? 'rgba(255,255,255,1)'
                            : equipped ? 'rgba(255,220,100,0.95)'
                                : 'rgba(215,228,245,0.85)'
                    );
                }

                if (iconEl) {
                    iconEl.setAttribute('opacity', hov || equipped ? '1' : '0.82');
                }

                if (iconBgEl) {
                    iconBgEl.setAttribute('fill',
                        hov ? 'rgba(255,255,255,0.08)'
                            : equipped ? 'rgba(255,204,102,0.10)'
                                : 'rgba(255,255,255,0.04)'
                    );
                    iconBgEl.setAttribute('stroke',
                        hov ? 'rgba(255,204,102,0.55)'
                            : equipped ? 'rgba(255,204,102,0.28)'
                                : 'rgba(255,255,255,0.06)'
                    );
                }
            });
        }

        function wwCenter() {
            if (wwHovered >= 0 && wwHovered < WW_KEYS.length) {
                const w = weapons[WW_KEYS[wwHovered]];
                wwNameEl.textContent = w.name.toUpperCase();
                wwNameEl.style.color = 'rgba(255,220,100,0.95)';
                wwSubEl.textContent = 'DMG ' + w.damage + '  ·  ' + w.maxAmmo + ' ROUNDS';
            } else {
                const w = weapons[currentWeaponKey];
                wwNameEl.textContent = w ? w.name.toUpperCase() : 'SELECT';
                wwNameEl.style.color = 'rgba(245,230,200,0.50)';
                wwSubEl.textContent = '← → SELECT  ·  Q CLOSE';
            }
        }

        function openWheel() {
            if (wwOpen) return;
            rebuildWWKeys();
            wwOpen = true;
            wwVX = 0;
            wwVY = 0;
            wwHovered = -1;
            wwBuild();
            wwEl.classList.add('open');
            wwCenter();
        }

        function closeWheel(apply) {
            if (!wwOpen) return;
            wwOpen = false;
            wwEl.classList.remove('open');
            if (apply && wwHovered >= 0) switchWeapon(WW_KEYS[wwHovered]);
        }

        function wwNavigate(dir) {
            if (!wwOpen) return;
            wwHovered = ((wwHovered + dir + WW_KEYS.length) % WW_KEYS.length);
            wwHighlight();
            wwCenter();
        }

        document.addEventListener('mousemove', e => {
            if (!wwOpen) return;
            wwVX += e.movementX;
            wwVY += e.movementY;
            const dist = Math.sqrt(wwVX * wwVX + wwVY * wwVY);
            if (dist > WW_MAX_R) {
                wwVX = wwVX / dist * WW_MAX_R;
                wwVY = wwVY / dist * WW_MAX_R;
            }
            const dot = document.getElementById('ww-dot');
            if (dot) {
                dot.setAttribute('cx', wwVX.toFixed(1));
                dot.setAttribute('cy', wwVY.toFixed(1));
            }

            if (dist > 32) {
                const myAngle = ((Math.atan2(wwVY, wwVX) * 180 / Math.PI + 90) + 360) % 360;
                let found = -1;
                for (let i = 0; i < wwSegments.length; i++) {
                    const { a1, a2 } = wwSegments[i];
                    if (myAngle >= a1 && myAngle <= a2) {
                        found = i;
                        break;
                    }
                }
                if (found !== wwHovered) {
                    wwHovered = found;
                    wwHighlight();
                    wwCenter();
                }
            } else if (wwHovered !== -1) {
                wwHovered = -1;
                wwHighlight();
                wwCenter();
            }
        });

        function enableThermal() {
            thermalActive = true;
            document.getElementById('thermal-tint').style.opacity = '1';
            document.getElementById('thermal-canvas').style.opacity = '1';
            document.getElementById('scope-overlay').classList.add('thermal');

            for (const z of zombies) {
                if (z.isDead) continue;
                markZombieThermalLayer(z.mesh);
                z.mesh.traverse(n => {
                    if (n.isMesh && n.material && !thermalOriginalMaterials.has(n)) {
                        thermalOriginalMaterials.set(n, n.material);
                        n.material = thermalZombieMat;
                    }
                });
            }
            showNotification('🟢 Thermal ON — enemies visible through cover');
        }

        function disableThermal() {
            thermalActive = false;
            document.getElementById('thermal-tint').style.opacity = '0';
            document.getElementById('thermal-canvas').style.opacity = '0';
            document.getElementById('scope-overlay').classList.remove('thermal');

            thermalOriginalMaterials.forEach((mat, node) => { node.material = mat; });
            thermalOriginalMaterials.clear();
            showNotification('⬛ Thermal OFF');
        }

        function renderThermalOverlay() {
            const previousAutoClear = renderer.autoClear;
            const previousBackground = scene.background;
            const previousFog = scene.fog;
            const previousMask = camera.layers.mask;

            renderer.autoClear = false;
            scene.background = null;
            scene.fog = null;
            camera.layers.set(THERMAL_LAYER);
            renderer.clearDepth();
            renderer.render(scene, camera);
            camera.layers.mask = previousMask;
            scene.background = previousBackground;
            scene.fog = previousFog;
            renderer.autoClear = previousAutoClear;
        }
`;
