export default String.raw`
        // =========================================================
        // AUTH (Firebase) + MULTIPLAYER (WS)
        // =========================================================
        let _mp = null;
        const _remotePlayers = new Map(); // id -> { mesh, targetPos, targetRotY }
        let _mpLastSend = 0;
        const _mpTmpTarget = new THREE.Vector3();
        let _mpOfflineMode = false;

        // ── All DOM queries are safe here since this script (via main.js) 
        // ── runs as a module, which executes after DOM is fully parsed.
        const _authModal        = document.getElementById('auth-modal-overlay');
        const _modalClose       = document.getElementById('modal-close');
        const _authTrigger      = document.getElementById('corner-auth-trigger');
        const _userCorner       = document.getElementById('user-corner');
        const _cornerProfile    = document.getElementById('corner-profile-card');
        const _miniName         = document.getElementById('mini-name');
        const _guestLink        = document.getElementById('guest-access-link');
        const _authLoggedOut    = document.getElementById('auth-logged-out');
        const _authLoggedIn     = document.getElementById('auth-logged-in');
        const _authStatusMsg    = document.getElementById('auth-status-msg');
        const _authNameInput    = document.getElementById('player-name-input');
        const _authEmailInput   = document.getElementById('email-input');
        const _authPassInput    = document.getElementById('password-input');
        const _authSubmitBtn    = document.getElementById('auth-submit-btn');
        const _authGoogleBtn    = document.getElementById('google-auth-btn');
        const _authLogoutBtn    = document.getElementById('logout-btn');
        const _displayPlayerName = document.getElementById('display-player-name');
        const _displayPlayerId   = document.getElementById('display-player-id');

        function _setAuthStatus(msg, isError = false) {
            if (!_authStatusMsg) return;
            _authStatusMsg.textContent = msg.toUpperCase();
            _authStatusMsg.style.color = isError ? '#ff5555' : 'rgba(255, 255, 255, 0.3)';
        }

        function _openAuthModal(statusMessage = '') {
            if (!_authModal) return;
            _authModal.classList.remove('auth-hidden');
            _authModal.style.display = 'flex';
            _authModal.setAttribute('aria-hidden', 'false');
            if (statusMessage) _setAuthStatus(statusMessage, true);
        }

        function _closeAuthModal() {
            if (!_authModal) return;
            _authModal.classList.add('auth-hidden');
            _authModal.style.display = 'none';
            _authModal.setAttribute('aria-hidden', 'true');
        }

        function _updateIntegratedUi(user) {
            if (!_authTrigger) return;
            if (user) {
                _authLoggedOut.classList.add('auth-hidden');
                _authLoggedIn.classList.remove('auth-hidden');
                _displayPlayerName.textContent = user.displayName || 'SURVIVOR';
                _displayPlayerId.textContent = 'ID: ' + user.uid.slice(0, 8).toUpperCase();
                _authTrigger.classList.add('auth-hidden');
                _cornerProfile.classList.remove('auth-hidden');
                _miniName.textContent = (user.displayName || 'SURVIVOR').split(' ')[0].toUpperCase();
            } else {
                _authLoggedOut.classList.remove('auth-hidden');
                _authLoggedIn.classList.add('auth-hidden');
                _authTrigger.classList.remove('auth-hidden');
                _cornerProfile.classList.add('auth-hidden');
            }
        }

        async function _handleAuthSubmit() {
            const email = _authEmailInput.value.trim();
            const pass = _authPassInput.value;
            const name = _authNameInput.value.trim();
            if (!email || !pass) { _setAuthStatus('Email and password required', true); return; }
            _setAuthStatus('Connecting to Firebase...');
            try {
                const fb = await import('./src/scripts/net/firebase-client.js');
                try {
                    await fb.loginEmail(email, pass);
                    if (name) await fb.updateDisplayName(name);
                    _closeAuthModal();
                } catch (err) {
                    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                        _setAuthStatus('Creating new account...');
                        await fb.registerEmail(email, pass, name);
                        _closeAuthModal();
                    } else throw err;
                }
            } catch (err) { _setAuthStatus(err.message || 'Auth failed', true); }
        }

        // Modal open/close
        if (_authModal) {
            _authModal.style.display = _authModal.classList.contains('auth-hidden') ? 'none' : 'flex';
            _authModal.setAttribute('aria-hidden', _authModal.classList.contains('auth-hidden') ? 'true' : 'false');
        }

        if (_authTrigger) _authTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            _openAuthModal('READY FOR CONNECTION');
        });
        if (_modalClose) _modalClose.addEventListener('click', _closeAuthModal);
        if (_authModal) _authModal.addEventListener('click', (e) => { if (e.target === _authModal) _closeAuthModal(); });
        if (_guestLink) _guestLink.addEventListener('click', () => {
            _mpOfflineMode = true;
            _closeAuthModal();
            showNotification('ENTERING OFFLINE MODE');
            if (typeof lockControls === 'function') lockControls();
        });

        // Auth form buttons
        if (_authSubmitBtn) _authSubmitBtn.addEventListener('click', _handleAuthSubmit);
        if (_authGoogleBtn) _authGoogleBtn.addEventListener('click', async () => {
            const fb = await import('./src/scripts/net/firebase-client.js');
            fb.loginGoogle().then(() => { _closeAuthModal(); }).catch(e => _setAuthStatus(e.message, true));
        });
        if (_authLogoutBtn) _authLogoutBtn.addEventListener('click', async () => {
            const fb = await import('./src/scripts/net/firebase-client.js');
            fb.logout();
        });

        // Gate Play/Resume until logged-in
        (function _gateStart() {
            const playBtn   = document.getElementById('play-btn');
            const resumeBtn = document.getElementById('resume-btn');
            let authed = false;
            let authReady = false;

            function blockIfNotAuthed(e) {
                if (authed || _mpOfflineMode || !authReady) return;
                e.preventDefault();
                e.stopImmediatePropagation();
                _openAuthModal('AUTHENTICATION REQUIRED');
            }

            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    if (!authReady) {
                        _mpOfflineMode = true;
                    }
                }, true);
                playBtn.addEventListener('click', blockIfNotAuthed, true);
            }

            if (resumeBtn) {
                resumeBtn.addEventListener('click', (e) => {
                    if (!authReady) {
                        _mpOfflineMode = true;
                    }
                }, true);
                resumeBtn.addEventListener('click', blockIfNotAuthed, true);
            }

            import('./src/scripts/net/firebase-client.js').then(mod => {
                authReady = true;
                mod.watchAuth(user => {
                    authed = !!user;
                    _updateIntegratedUi(user);
                });
            }).catch(e => {
                authReady = false;
                _mpOfflineMode = true;
                console.warn('Firebase auth disabled, continuing in offline mode:', e);
            });
        })();

        // Multiplayer connect + remote player rendering
        (async () => {
            try {
                const mpMod = await import('./src/scripts/net/multiplayer-client.js');
                _mp = mpMod.createMultiplayerClient({ room: 'lobby' });
                _mp.on((evt) => {
                    if (evt.t === 'snapshot' && evt.players) {
                        for (const p of evt.players) {
                            if (!p || !p.id) continue;
                            if (_mp.playerId && p.id === _mp.playerId) continue;
                            const rp = _ensureRemoteMesh(p.id);
                            rp.targetPos.set(p.pos.x, p.pos.y || (GROUND_Y + 0.85), p.pos.z);
                            rp.targetRotY = p.rotY || 0;
                        }
                    }
                    if (evt.t === 'player_leave') {
                        const rp = _remotePlayers.get(evt.playerId);
                        if (rp) { scene.remove(rp.mesh); _remotePlayers.delete(evt.playerId); }
                    }
                });
                _mp.connect();
            } catch (e) {
                console.warn('Multiplayer disabled:', e);
            }
        })();

        // Frame loop: interpolate remotes + send our pose at ~20Hz
        (function _mpTick() {
            requestAnimationFrame(_mpTick);
            for (const rp of _remotePlayers.values()) {
                rp.mesh.position.lerp(rp.targetPos, 0.18);
                rp.mesh.rotation.y = THREE.MathUtils.lerp(rp.mesh.rotation.y, rp.targetRotY, 0.18);
            }
            if (!_mp || !_mp.sendState || !controls || !controls.isLocked) return;
            const now = performance.now();
            if (now - _mpLastSend < 50) return;
            _mpLastSend = now;
            _mpTmpTarget.copy(camera.position);
            _mp.sendState({
                pos: { x: _mpTmpTarget.x, y: _mpTmpTarget.y, z: _mpTmpTarget.z },
                rotY: camera.rotation.y
            });
        })();
`
