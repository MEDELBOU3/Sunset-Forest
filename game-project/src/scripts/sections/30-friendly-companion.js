export default String.raw`
        // =========================================================
        // FRIENDLY COMPANION
        // =========================================================
        const companionTargetPos = new THREE.Vector3();
        const companionMoveDelta = new THREE.Vector3();
        const companionLookPos = new THREE.Vector3();
        const companionForwardFlat = new THREE.Vector3();
        const companionRightFlat = new THREE.Vector3();
        const companionFollowDir = new THREE.Vector3(0, 0, -1);
        const companionLastPlayerPos = new THREE.Vector3();
        const companionDesiredForward = new THREE.Vector3();
        const companionPlayerToCompanion = new THREE.Vector3();
        const companionSeparation = new THREE.Vector3();
        const companionFireStart = new THREE.Vector3();
        const companionFireEnd = new THREE.Vector3();

        const companionState = {
            root: null,
            mixer: null,
            runAction: null,
            sound: null,
            loaded: false,
            visible: false,
            speed: 5.4,
            catchupSpeed: 7.2,
            attackRange: 26,
            damage: 18,
            attackCooldown: 0.95,
            lastAttackAt: 0,
            lastCalloutAt: 0,
            calloutCooldown: 8,
            followDistance: 5.2,
            sideOffset: 3.1,
            minPlayerSpacing: 3.4,
            groundLift: 0.22,
            tracer: null,
            tracerMaterial: null,
            tracerLife: 0,
            target: null,
            lastYaw: 0,
            modelYawOffset: Math.PI,
            formationSide: -1,
            mode: 'follow',
        };

        function playCompanionRadioTone(kind = 'ack') {
            try {
                const ctx = THREE.AudioContext.getContext();
                if (!ctx) return;
                if (ctx.state === 'suspended') ctx.resume();

                const now = ctx.currentTime;
                const gain = ctx.createGain();
                gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0.0001, now);

                const oscA = ctx.createOscillator();
                const oscB = ctx.createOscillator();
                oscA.type = 'square';
                oscB.type = 'triangle';

                if (kind === 'attack') {
                    oscA.frequency.setValueAtTime(690, now);
                    oscB.frequency.setValueAtTime(920, now + 0.03);
                } else if (kind === 'join') {
                    oscA.frequency.setValueAtTime(420, now);
                    oscB.frequency.setValueAtTime(630, now + 0.05);
                } else {
                    oscA.frequency.setValueAtTime(510, now);
                    oscB.frequency.setValueAtTime(720, now + 0.02);
                }

                gain.gain.linearRampToValueAtTime(0.018, now + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

                oscA.connect(gain);
                oscB.connect(gain);
                oscA.start(now);
                oscB.start(now + 0.025);
                oscA.stop(now + 0.16);
                oscB.stop(now + 0.19);
            } catch (e) {
                // Ignore audio generation failures to avoid breaking gameplay.
            }
        }

        function createCompanionTracer() {
            const points = [new THREE.Vector3(), new THREE.Vector3()];
            const geo = new THREE.BufferGeometry().setFromPoints(points);
            const mat = new THREE.LineBasicMaterial({
                color: 0x7fd6ff,
                transparent: true,
                opacity: 0.95,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const line = new THREE.Line(geo, mat);
            line.visible = false;
            scene.add(line);
            companionState.tracer = line;
            companionState.tracerMaterial = mat;
        }

        function updateCompanionTracer() {
            if (!companionState.tracer || !companionState.tracer.geometry) return;
            const positions = companionState.tracer.geometry.attributes.position.array;
            positions[0] = companionFireStart.x;
            positions[1] = companionFireStart.y;
            positions[2] = companionFireStart.z;
            positions[3] = companionFireEnd.x;
            positions[4] = companionFireEnd.y;
            positions[5] = companionFireEnd.z;
            companionState.tracer.geometry.attributes.position.needsUpdate = true;
            companionState.tracer.visible = true;
            companionState.tracerLife = 0.06;
            companionState.tracerMaterial.opacity = 0.95;
        }

        function companionSay(message, tone = 'ack') {
            const now = performance.now() / 1000;
            if (now - companionState.lastCalloutAt < companionState.calloutCooldown) return;
            companionState.lastCalloutAt = now;
            showNotification('ALLY: ' + message);
            playCompanionRadioTone(tone);
        }

        function spawnFriendlyCompanion() {
            const loader = new FBXLoader();
            loader.load('assets/enemy/freind-char.fbx', (fbx) => {
                const bbox = new THREE.Box3().setFromObject(fbx);
                const size = new THREE.Vector3();
                bbox.getSize(size);
                const targetHeight = 3.0;
                const fitScale = size.y > 0 ? targetHeight / size.y : 0.012;
                fbx.scale.setScalar(fitScale);

                fbx.traverse(node => {
                    if (node.isMesh) {
                        node.castShadow = true;
                        node.receiveShadow = true;
                        node.frustumCulled = false;
                    }
                });

                camera.getWorldDirection(companionFollowDir);
                companionFollowDir.y = 0;
                if (companionFollowDir.lengthSq() < 0.0001) companionFollowDir.set(0, 0, -1);
                companionFollowDir.normalize();
                companionRightFlat.set(companionFollowDir.z, 0, -companionFollowDir.x).normalize();

                fbx.position.copy(camera.position)
                    .addScaledVector(companionFollowDir, -companionState.followDistance)
                    .addScaledVector(companionRightFlat, companionState.formationSide * companionState.sideOffset);
                fbx.position.y = GROUND_Y + companionState.groundLift;
                scene.add(fbx);

                companionState.root = fbx;
                companionState.loaded = true;
                companionState.visible = true;
                companionLastPlayerPos.copy(camera.position);
                companionState.lastYaw = Math.atan2(companionFollowDir.x, companionFollowDir.z);
                companionState.root.rotation.y = companionState.lastYaw + companionState.modelYawOffset;

                if (fbx.animations && fbx.animations.length > 0) {
                    companionState.mixer = new THREE.AnimationMixer(fbx);
                    companionState.runAction = companionState.mixer.clipAction(fbx.animations[0]);
                    companionState.runAction.play();
                    companionState.runAction.timeScale = 0.0;
                }

                audioLoader.load('assets/sound-effects/freesound_community-plors-75447 (1).mp3', (buf) => {
                    if (!companionState.root) return;
                    const companionCry = new THREE.PositionalAudio(listener);
                    companionCry.setBuffer(buf);
                    companionCry.setLoop(true);
                    companionCry.setRefDistance(7);
                    companionCry.setRolloffFactor(2.2);
                    companionCry.setMaxDistance(45);
                    companionCry.setVolume(0.22);
                    companionCry.play();
                    companionState.root.add(companionCry);
                    companionState.sound = companionCry;
                }, undefined, err => console.warn('Companion cry audio not found:', err));

                createCompanionTracer();
                companionSay('Friendly operator in formation', 'join');
            }, undefined, err => {
                console.warn('Friendly companion FBX failed to load:', err);
            });
        }

        function findCompanionTarget() {
            let best = null;
            let bestScore = Infinity;

            for (const z of zombies) {
                if (!z || z.isDead || !z.mesh || !z.mesh.visible) continue;
                const distFriendSq = z.mesh.position.distanceToSquared(companionState.root.position);
                if (distFriendSq > companionState.attackRange * companionState.attackRange) continue;

                const distPlayerSq = z.mesh.position.distanceToSquared(camera.position);
                const score = distFriendSq * 0.65 + distPlayerSq * 0.35;
                if (score < bestScore) {
                    best = z;
                    bestScore = score;
                }
            }
            return best;
        }

        function updateFriendlyCompanion(delta, timeSec) {
            if (!companionState.loaded || !companionState.root) return;

            if (companionState.tracerLife > 0 && companionState.tracer) {
                companionState.tracerLife -= delta;
                companionState.tracerMaterial.opacity = Math.max(0, companionState.tracerLife / 0.06);
                if (companionState.tracerLife <= 0) {
                    companionState.tracer.visible = false;
                }
            }

            if (companionState.mixer) companionState.mixer.update(delta);

            companionMoveDelta.copy(camera.position).sub(companionLastPlayerPos);
            companionMoveDelta.y = 0;
            const playerMoved = companionMoveDelta.lengthSq() > 0.0225;
            const playerMoveSpeed = delta > 0 ? companionMoveDelta.length() / delta : 0;

            if (playerMoved) {
                companionFollowDir.copy(companionMoveDelta).normalize();
            }

            if (!playerMoved && armoredCar.active && armoredCar.root) {
                armoredCar.root.getWorldDirection(companionFollowDir);
                companionFollowDir.y = 0;
                if (companionFollowDir.lengthSq() < 0.0001) companionFollowDir.set(0, 0, -1);
                companionFollowDir.normalize();
            }

            companionRightFlat.set(companionFollowDir.z, 0, -companionFollowDir.x).normalize();
            companionLastPlayerPos.copy(camera.position);

            companionPlayerToCompanion.copy(companionState.root.position).sub(camera.position);
            companionPlayerToCompanion.y = 0;

            const desiredFollowDistance = playerMoveSpeed > 10
                ? companionState.followDistance + 1.1
                : companionState.followDistance;
            const desiredSideOffset = playerMoveSpeed > 10
                ? companionState.sideOffset + 0.5
                : companionState.sideOffset;

            if (companionPlayerToCompanion.lengthSq() < (companionState.minPlayerSpacing * companionState.minPlayerSpacing)) {
                companionState.formationSide *= -1;
            }

            companionTargetPos.copy(camera.position)
                .addScaledVector(companionFollowDir, -desiredFollowDistance)
                .addScaledVector(companionRightFlat, companionState.formationSide * desiredSideOffset);
            companionTargetPos.y = GROUND_Y + companionState.groundLift;

            if (armoredCar.active && armoredCar.root) {
                companionTargetPos.copy(armoredCar.root.position)
                    .addScaledVector(companionFollowDir, -6.2)
                    .addScaledVector(companionRightFlat, companionState.formationSide * 2.8);
                companionTargetPos.y = GROUND_Y + companionState.groundLift;
            }

            const distToTarget = companionState.root.position.distanceTo(companionTargetPos);
            if (distToTarget > 24) {
                companionState.root.position.copy(companionTargetPos);
                companionState.mode = 'warp';
            } else if (distToTarget > 0.18) {
                companionMoveDelta.copy(companionTargetPos).sub(companionState.root.position);
                companionMoveDelta.y = 0;
                const moveSpeed = distToTarget > 8 ? companionState.catchupSpeed : companionState.speed;
                const moveDist = Math.min(distToTarget, moveSpeed * delta);
                companionMoveDelta.normalize().multiplyScalar(moveDist);
                companionState.root.position.add(companionMoveDelta);
                const companionProbe = { x: companionState.root.position.x, z: companionState.root.position.z };
                CollisionSystem.resolvePoint(companionProbe, CollisionSystem.ZOMBIE_R);
                companionState.root.position.x = companionProbe.x;
                companionState.root.position.z = companionProbe.z;
                companionState.mode = distToTarget > 8 ? 'catchup' : 'follow';
            } else {
                companionState.mode = 'hold';
            }

            companionSeparation.copy(companionState.root.position).sub(camera.position);
            companionSeparation.y = 0;
            const separationDist = companionSeparation.length();
            if (separationDist > 0.001 && separationDist < companionState.minPlayerSpacing) {
                const push = (companionState.minPlayerSpacing - separationDist) * Math.min(1, delta * 4.5);
                companionSeparation.normalize().multiplyScalar(push);
                companionState.root.position.add(companionSeparation);
            }

            companionState.root.position.y = GROUND_Y + companionState.groundLift;

            companionState.target = findCompanionTarget();
            const now = performance.now() / 1000;

            if (companionState.target && !companionState.target.isDead) {
                companionState.mode = 'combat';
                companionLookPos.copy(companionState.target.mesh.position);
                companionLookPos.y = companionState.root.position.y;
                companionDesiredForward.copy(companionLookPos).sub(companionState.root.position);
                companionDesiredForward.y = 0;
                if (companionDesiredForward.lengthSq() > 0.0001) {
                    const targetYaw = Math.atan2(companionDesiredForward.x, companionDesiredForward.z);
                    companionState.lastYaw = THREE.MathUtils.lerp(companionState.lastYaw, targetYaw, Math.min(1, delta * 8));
                    companionState.root.rotation.y = companionState.lastYaw + companionState.modelYawOffset;
                }

                if (now - companionState.lastAttackAt >= companionState.attackCooldown) {
                    companionState.lastAttackAt = now;
                    damageZombie(companionState.target, companionState.damage);

                    companionFireStart.copy(companionState.root.position);
                    companionFireStart.y += 1.6;
                    companionFireEnd.copy(companionState.target.mesh.position);
                    companionFireEnd.y += 1.1;
                    updateCompanionTracer();

                    if (Math.random() < 0.35) {
                        companionSay('Contact, engaging target', 'attack');
                    } else {
                        playCompanionRadioTone('attack');
                    }
                }
            } else if (distToTarget > 0.15) {
                companionDesiredForward.copy(companionTargetPos).sub(companionState.root.position);
                companionDesiredForward.y = 0;
                if (companionDesiredForward.lengthSq() > 0.0001) {
                    const targetYaw = Math.atan2(companionDesiredForward.x, companionDesiredForward.z);
                    companionState.lastYaw = THREE.MathUtils.lerp(companionState.lastYaw, targetYaw, Math.min(1, delta * 6));
                    companionState.root.rotation.y = companionState.lastYaw + companionState.modelYawOffset;
                }
            }

            if (!companionState.target && now - companionState.lastCalloutAt > 14) {
                companionSay('Holding on your six', 'ack');
            }

            if (companionState.runAction) {
                if (companionState.mode === 'follow' || companionState.mode === 'catchup' || companionState.mode === 'combat') {
                    companionState.runAction.timeScale = 1.0;
                    companionState.runAction.paused = false;
                } else {
                    companionState.runAction.timeScale = 0.0;
                }
            }
        }

        spawnFriendlyCompanion();
`;
