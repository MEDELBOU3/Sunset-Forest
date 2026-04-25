export default String.raw`
        // =========================================================
        // AUDIO
        // =========================================================
        const listener = new THREE.AudioListener();
        camera.add(listener);

        const natureSound = new THREE.Audio(listener);
        const motionFilter = THREE.AudioContext.getContext().createBiquadFilter();
        motionFilter.type = 'lowpass';
        motionFilter.frequency.value = 1000;
        natureSound.setFilter(motionFilter);

        const audioLoader = new THREE.AudioLoader();
        audioLoader.load('assets/sound-effects/freesound_community-night-ambience-17064.mp3', (buf) => {
            natureSound.setBuffer(buf);
            natureSound.setLoop(true);
            natureSound.setVolume(0.55);
            if (controls.isLocked && !natureSound.isPlaying) natureSound.play();
        }, undefined, err => console.warn('Ambient audio not found:', err));

        class AudioPool {
            constructor(path, size = 8, volume = 0.5) {
                this.pool = [];
                this.index = 0;
                audioLoader.load(path, (buf) => {
                    for (let i = 0; i < size; i++) {
                        const s = new THREE.PositionalAudio(listener);
                        s.setBuffer(buf);
                        s.setVolume(volume);
                        this.pool.push(s);
                    }
                });
            }
            play(parent, vol = null) {
                if (this.pool.length === 0) return;
                const s = this.pool[this.index];
                if (s.isPlaying) s.stop();
                if (vol !== null) s.setVolume(vol);
                if (parent) parent.add(s);
                s.play();
                this.index = (this.index + 1) % this.pool.length;
            }
        }

        const killScreamPool = new AudioPool('assets/sound-effects/kill-scream.mp3', 8, 0.85);
        const bulletHitPool = new AudioPool('assets/sound-effects/bullet-hit-flesh.mp3', 6, 0.75);

        const gunshotPool = [];
        for (let i = 0; i < 5; i++) {
            const sound = new THREE.Audio(listener);
            gunshotPool.push(sound);
        }
        let gunshotIndex = 0;
        function setGunshotPoolBuffer(buf, volume = 1.0) {
            gunshotPool.forEach(sound => {
                sound.setBuffer(buf);
                sound.setLoop(false);
                sound.setVolume(volume);
            });
        }
        audioLoader.load('assets/sound-effects/freesound_community-perdition-1911-pistol-82365.mp3', (buf) => {
            setGunshotPoolBuffer(buf, 1.0);
        }, undefined, err => console.warn('Gunshot audio not found:', err));

        const reloadSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/freesound_community-1911-reload-6248.mp3', (buf) => {
            reloadSound.setBuffer(buf);
            reloadSound.setLoop(false);
            reloadSound.setVolume(0.95);
        }, undefined, err => console.warn('Reload audio not found:', err));

        const slurpSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/mrstokes302-loud-drink-slurping-sfx-428801.mp3', (buf) => {
            slurpSound.setBuffer(buf);
            slurpSound.setLoop(false);
            slurpSound.setVolume(1.0);
        }, undefined, err => console.warn('Slurp audio not found:', err));

        const lootPickupSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/take-ammunition.mp3', (buf) => {
            lootPickupSound.setBuffer(buf);
            lootPickupSound.setLoop(false);
            lootPickupSound.setVolume(1.0);
        }, undefined, err => console.warn('Loot pickup audio not found:', err));

        const armoredCarStartSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/military-jeep-car-engine-starting-vehicle-sound-turning-on.mp3', (buf) => {
            armoredCarStartSound.setBuffer(buf);
            armoredCarStartSound.setLoop(false);
            armoredCarStartSound.setVolume(1.0);
        }, undefined, err => console.warn('Armored car start audio not found:', err));

        const armoredCarIdleSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/military-jeep-car-engine-idling-loopable.mp3', (buf) => {
            armoredCarIdleSound.setBuffer(buf);
            armoredCarIdleSound.setLoop(true);
            armoredCarIdleSound.setVolume(0.55);
        }, undefined, err => console.warn('Armored car idle audio not found:', err));

        const footstepSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/joentnt-walk-on-grass-3-291986.mp3', (buf) => {
            footstepSound.setBuffer(buf);
            footstepSound.setLoop(true);
            footstepSound.setVolume(0.55);
            footstepSound.setPlaybackRate(1.6);
        }, undefined, err => console.warn('Footstep audio not found:', err));

        const slowBreathingSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/slow-breathing.mp3', (buf) => {
            slowBreathingSound.setBuffer(buf);
            slowBreathingSound.setLoop(true);
            slowBreathingSound.setVolume(0);
        }, undefined, err => console.warn('Slow breathing sound not found:', err));

        const strongBreathingSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/mixkit-strong-breathing-of-a-person-2232.wav', (buf) => {
            strongBreathingSound.setBuffer(buf);
            strongBreathingSound.setLoop(true);
            strongBreathingSound.setVolume(0);
        }, undefined, err => console.warn('Strong breathing sound not found:', err));

        const menuMusic = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/menu-background-music.mp3', (buf) => {
            menuMusic.setBuffer(buf);
            menuMusic.setLoop(true);
            menuMusic.setVolume(0.3);

            const startMenuMusic = () => {
                if (THREE.AudioContext.getContext().state === 'suspended') {
                    THREE.AudioContext.getContext().resume();
                }
                const isBlockerVisible = !blocker.classList.contains('hidden') && blocker.style.display !== 'none';
                const isLoadingDone = loadingScreen.classList.contains('done');

                if (isBlockerVisible && isLoadingDone) {
                    if (!menuMusic.isPlaying) menuMusic.play();
                    document.removeEventListener('click', startMenuMusic);
                }
            };
            document.addEventListener('click', startMenuMusic);

            const checkMusicOnLoad = () => {
                if (loadingScreen.classList.contains('done') && !blocker.classList.contains('hidden')) {
                    if (THREE.AudioContext.getContext().state !== 'suspended') {
                        if (!menuMusic.isPlaying) menuMusic.play();
                        document.removeEventListener('click', startMenuMusic);
                    }
                }
            };
            const loaderObserver = new MutationObserver(() => checkMusicOnLoad());
            loaderObserver.observe(loadingScreen, { attributes: true, attributeFilter: ['class'] });
        }, undefined, err => console.warn('Menu music load failed:', err));

        const deathScreamSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/u_r7cny11q7r-man-death-scream-186763.mp3', (buf) => {
            deathScreamSound.setBuffer(buf);
            deathScreamSound.setLoop(false);
            deathScreamSound.setVolume(1.0);
        }, undefined, err => console.warn('Death scream audio not found:', err));

        let zombieGroanBuffer = null;
        audioLoader.load('assets/sound-effects/freesound_community-monster-zombie-scream-105972.mp3', (buf) => {
            zombieGroanBuffer = buf;
            console.log('Zombie groan audio loaded.');
        }, undefined, err => console.warn('Zombie groan audio not found:', err));

        let canJump = false;
        const jumpVelocity = 15;
        const gravity = 45;
        let pinPullBuffer = null;
        let throwBuffer = null;
        let explosionBuffer = null;
        let weaponSwitchBuffer = null;

        audioLoader.load('assets/sound-effects/Grenade-safety-pin-pull.mp3', (buf) => {
            pinPullBuffer = buf;
        });

        audioLoader.load('assets/sound-effects/Lightbulb-break-shatter-explosion.mp3', (buf) => {
            throwBuffer = buf;
        });

        audioLoader.load('assets/sound-effects/Flashbang-explosion-silent-ring.mp3', (buf) => {
            explosionBuffer = buf;
        });

        audioLoader.load('assets/sound-effects/170273__knova__change-weapon-sound.wav', (buf) => {
            weaponSwitchBuffer = buf;
        }, undefined, err => console.warn('Weapon switch audio not found:', err));

        const emptyGunSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/empty-weapon.mp3', (buf) => {
            emptyGunSound.setBuffer(buf);
            emptyGunSound.setLoop(false);
            emptyGunSound.setVolume(1.0);
        }, undefined, err => console.warn('Empty gun audio not found:', err));

        const headshotSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/headshot.mp3', (buf) => {
            headshotSound.setBuffer(buf);
            headshotSound.setLoop(false);
            headshotSound.setVolume(1.0);
        }, undefined, err => console.warn('Headshot audio not found:', err));

        const vehicleCollideSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/vehicle-collides.mp3', (buf) => {
            vehicleCollideSound.setBuffer(buf);
            vehicleCollideSound.setLoop(false);
            vehicleCollideSound.setVolume(1.0);
        }, undefined, err => console.warn('Vehicle collide audio not found:', err));

        const zombieScreamSound = new THREE.Audio(listener);
        audioLoader.load('assets/sound-effects/female-zombie-scream.mp3', (buf) => {
            zombieScreamSound.setBuffer(buf);
            zombieScreamSound.setLoop(false);
            zombieScreamSound.setVolume(1.0);
        }, undefined, err => console.warn('Zombie scream audio not found:', err));
`;
