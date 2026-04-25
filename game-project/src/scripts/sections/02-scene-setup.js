export default String.raw`
        // =========================================================
        // SCENE SETUP
        // =========================================================
        const scene = new THREE.Scene();
        //scene.background = new THREE.Color(0xf7cfe0);
        //scene.fog = new THREE.FogExp2(0xe8b8d0, 0.007);

        scene.background = new THREE.Color(0xc8a0c0);

        // Fog extended far enough to see the village landmark
        scene.fog = new THREE.Fog(0xd0b0c8, 15, 500);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 600);
        camera.position.set(0, 2.0, 0);
        scene.add(camera);

        const hardwareThreads = navigator.hardwareConcurrency ?? 4;
        const deviceMemory = navigator.deviceMemory ?? 4;
        const prefersCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
        const initialLowEndHint = prefersCoarsePointer || hardwareThreads <= 4 || deviceMemory <= 4;

        const performanceState = {
            autoQuality: true,
            lowEndDetected: initialLowEndHint,
            quality: initialLowEndHint ? 'medium' : 'high',
            targetPixelRatio: 1,
            fpsSampleTime: 0,
            fpsSampleFrames: 0,
            fpsCooldown: 0,
            particleInterval: initialLowEndHint ? (1 / 30) : (1 / 60),
            minimapInterval: initialLowEndHint ? 0.18 : 0.10,
            grenadeInterval: initialLowEndHint ? 0.06 : 0.03,
            thermalFrameSkip: initialLowEndHint ? 2 : 1,
            runtimePassInterval: initialLowEndHint ? 2.0 : 3.0,
        };

        const renderer = new THREE.WebGLRenderer({
            antialias: !initialLowEndHint,
            powerPreference: 'high-performance'
        });
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, initialLowEndHint ? 1.1 : 1.35));
        renderer.setSize(window.innerWidth, window.innerHeight, false);
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.inset = '0';
        renderer.domElement.style.width = '100vw';
        renderer.domElement.style.height = '100vh';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.zIndex = '0';
        document.body.appendChild(renderer.domElement);

        let performanceRuntimePass = null;

        function resizeRendererForQuality() {
            renderer.setPixelRatio(performanceState.targetPixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight, false);

            const thermalCanvasEl = document.getElementById('thermal-canvas');
            if (thermalCanvasEl) {
                thermalCanvasEl.width = Math.max(1, Math.floor(window.innerWidth / performanceState.thermalFrameSkip));
                thermalCanvasEl.height = Math.max(1, Math.floor(window.innerHeight / performanceState.thermalFrameSkip));
            }

            try {
                const thermalScale = performanceState.quality === 'low' ? 0.5 : (performanceState.quality === 'medium' ? 0.67 : 1);
                thermalRenderer.setSize(
                    Math.max(1, Math.floor(window.innerWidth * thermalScale)),
                    Math.max(1, Math.floor(window.innerHeight * thermalScale))
                );
            } catch (err) {
                // Thermal renderer is created later in the boot sequence.
            }
        }

        function applyQualityPreset(level, announce = false) {
            performanceState.quality = level;

            if (level === 'low') {
                performanceState.targetPixelRatio = Math.min(window.devicePixelRatio || 1, 0.9);
                performanceState.particleInterval = 1 / 24;
                performanceState.minimapInterval = 0.22;
                performanceState.grenadeInterval = 0.08;
                performanceState.thermalFrameSkip = 3;
                performanceState.runtimePassInterval = 1.8;
                renderer.shadowMap.enabled = false;
                renderer.toneMappingExposure = 1.08;
            } else if (level === 'medium') {
                performanceState.targetPixelRatio = Math.min(window.devicePixelRatio || 1, 1.1);
                performanceState.particleInterval = 1 / 30;
                performanceState.minimapInterval = 0.16;
                performanceState.grenadeInterval = 0.05;
                performanceState.thermalFrameSkip = 2;
                performanceState.runtimePassInterval = 2.4;
                renderer.shadowMap.enabled = true;
                renderer.toneMappingExposure = 1.12;
            } else {
                performanceState.targetPixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
                performanceState.particleInterval = 1 / 60;
                performanceState.minimapInterval = 0.10;
                performanceState.grenadeInterval = 0.03;
                performanceState.thermalFrameSkip = 1;
                performanceState.runtimePassInterval = 3.0;
                renderer.shadowMap.enabled = true;
                renderer.toneMappingExposure = 1.15;
            }

            if (typeof sunLight !== 'undefined') {
                if (level === 'low') {
                    sunLight.castShadow = false;
                    sunLight.shadow.mapSize.set(512, 512);
                } else if (level === 'medium') {
                    sunLight.castShadow = true;
                    sunLight.shadow.mapSize.set(1024, 1024);
                } else {
                    sunLight.castShadow = true;
                    sunLight.shadow.mapSize.set(1536, 1536);
                }

                if (sunLight.shadow.map) {
                    sunLight.shadow.map.dispose();
                    sunLight.shadow.map = null;
                }
            }

            if (typeof ground !== 'undefined') {
                ground.receiveShadow = renderer.shadowMap.enabled;
            }

            resizeRendererForQuality();

            if (typeof performanceRuntimePass === 'function') {
                performanceRuntimePass();
            }

            if (announce && typeof showNotification === 'function') {
                showNotification('Graphics quality: ' + level.toUpperCase());
            }
        }

        function monitorPerformance(delta) {
            if (!performanceState.autoQuality) return;

            performanceState.fpsSampleTime += delta;
            performanceState.fpsSampleFrames++;

            if (performanceState.fpsSampleTime < 1.5) return;

            const fps = performanceState.fpsSampleFrames / performanceState.fpsSampleTime;
            performanceState.fpsSampleTime = 0;
            performanceState.fpsSampleFrames = 0;

            if (performanceState.fpsCooldown > 0) {
                performanceState.fpsCooldown--;
                return;
            }

            if (fps < 24 && performanceState.quality !== 'low') {
                applyQualityPreset('low', true);
                performanceState.fpsCooldown = 4;
                return;
            }

            if (fps < 32 && performanceState.quality === 'high') {
                applyQualityPreset('medium', true);
                performanceState.fpsCooldown = 3;
                return;
            }

            if (!performanceState.lowEndDetected && fps > 58 && performanceState.quality === 'medium') {
                applyQualityPreset('high', true);
                performanceState.fpsCooldown = 5;
            }
        }

        resizeRendererForQuality();

        // Tier 6 — Quality preset detection
        setTimeout(() => {
            const debugInfo = renderer.getContext().getExtension('WEBGL_debug_renderer_info');
            const rendererName = debugInfo ? renderer.getContext().getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "";
            const rendererNameLower = rendererName.toLowerCase();
            const isLowEnd = rendererNameLower.includes('intel') ||
                             rendererNameLower.includes('mobile') ||
                             rendererNameLower.includes('graphics') ||
                             rendererNameLower.includes('iris');

            if (isLowEnd) {
                performanceState.lowEndDetected = true;
                applyQualityPreset('medium', true);
            } else {
                applyQualityPreset(performanceState.quality);
            }
        }, 500);
`;
