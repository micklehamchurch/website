(() => {
  'use strict';

  const login = document.querySelector('#admin-login');
  const app = document.querySelector('#admin-app');
  const form = document.querySelector('#admin-login-form');
  const password = document.querySelector('#admin-password');
  const error = document.querySelector('#admin-login-error');
  const signOut = document.querySelector('#admin-sign-out');
  const sessionKey = 'mickleham-admin-demo-authenticated-v1';
  // A client-side digest only avoids placing the demonstration password in clear text.
  // This is not authentication: the static site and this check can be inspected or bypassed.
  const passwordDigest = '9f12dd4d66b7aadc8062b43b34980b33a3a1bbdf81a08783701b69fff7cc763f';

  function showDashboard() {
    login.hidden = true;
    app.hidden = false;
  }

  function showLogin() {
    try { sessionStorage.removeItem(sessionKey); } catch { /* The login screen remains visible. */ }
    app.hidden = true;
    login.hidden = false;
    form.reset();
    error.hidden = true;
    password.focus();
  }

  try { if (sessionStorage.getItem(sessionKey) === 'yes') showDashboard(); }
  catch { /* Signing in can still proceed in-memory if session storage is disabled. */ }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    error.hidden = true;
    try {
      const bytes = new TextEncoder().encode(password.value);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const actual = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
      if (actual !== passwordDigest) {
        error.textContent = 'Incorrect password. Please try again.';
        error.hidden = false;
        password.focus();
        password.select();
        return;
      }
      sessionStorage.setItem(sessionKey, 'yes');
      showDashboard();
      document.querySelector('#admin-main')?.focus({ preventScroll: true });
    } catch {
      error.textContent = 'This browser could not check the demonstration password. Please use a current browser over HTTPS.';
      error.hidden = false;
    }
  });

  signOut.addEventListener('click', showLogin);
})();
