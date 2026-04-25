import { auth, watchAuth, loginEmail, registerEmail, loginGoogle, logout } from './firebase-client.js';

export function mountLoginUI() {
  const existing = document.getElementById('auth-panel');
  if (existing) return existing;

  const root = document.createElement('div');
  root.id = 'auth-panel';
  root.innerHTML = `
    <div class="auth-card">
      <div class="auth-title">MULTIPLAYER LOGIN</div>
      <div class="auth-sub">Sign in to play online</div>
      <div class="auth-row">
        <input id="auth-email" class="auth-input" type="email" placeholder="Email" autocomplete="email" />
      </div>
      <div class="auth-row">
        <input id="auth-pass" class="auth-input" type="password" placeholder="Password" autocomplete="current-password" />
      </div>
      <div class="auth-actions">
        <button id="auth-login" class="auth-btn">Login</button>
        <button id="auth-register" class="auth-btn auth-btn--ghost">Register</button>
      </div>
      <div class="auth-divider"><span>OR</span></div>
      <button id="auth-google" class="auth-btn auth-btn--google">Continue with Google</button>
      <div class="auth-status" id="auth-status"></div>
      <button id="auth-logout" class="auth-btn auth-btn--ghost" style="display:none">Logout</button>
    </div>
  `;

  document.body.appendChild(root);

  const emailEl = root.querySelector('#auth-email');
  const passEl = root.querySelector('#auth-pass');
  const statusEl = root.querySelector('#auth-status');
  const logoutBtn = root.querySelector('#auth-logout');

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  root.querySelector('#auth-login').addEventListener('click', async () => {
    setStatus('Logging in...');
    try {
      await loginEmail(emailEl.value.trim(), passEl.value);
      setStatus('');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Login failed');
    }
  });

  root.querySelector('#auth-register').addEventListener('click', async () => {
    setStatus('Creating account...');
    try {
      await registerEmail(emailEl.value.trim(), passEl.value);
      setStatus('');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Register failed');
    }
  });

  root.querySelector('#auth-google').addEventListener('click', async () => {
    setStatus('Opening Google...');
    try {
      await loginGoogle();
      setStatus('');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Google login failed');
    }
  });

  logoutBtn.addEventListener('click', async () => {
    setStatus('Signing out...');
    try {
      await logout();
      setStatus('');
    } catch (e) {
      setStatus(e && e.message ? e.message : 'Logout failed');
    }
  });

  watchAuth((user) => {
    if (user) {
      setStatus('Signed in as ' + (user.email || user.uid));
      logoutBtn.style.display = 'block';
    } else {
      setStatus('Not signed in');
      logoutBtn.style.display = 'none';
    }
  });

  function syncVisibility() {
    // Hide during gameplay (pointer lock) so it doesn't cover the viewport.
    root.style.display = document.pointerLockElement ? 'none' : 'flex';
  }
  document.addEventListener('pointerlockchange', syncVisibility);
  syncVisibility();

  return root;
}
