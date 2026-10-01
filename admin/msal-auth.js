import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  LogLevel,
  PublicClientApplication
} from '@azure/msal-browser';
import { isAuthorisedProfile, verifiedAdminEmail } from './auth-policy.mjs';
import { GRAPH_USER_SCOPE } from './auth-config.mjs';
import { checkAdminApiHealth } from './api-health.mjs';
import { acquireAdminApiToken, acquireGraphUserToken } from './auth-tokens.mjs';

const clientId = '065a6151-8b4e-4ee7-a957-b414bc83b5ee';
const redirectUri = new URL('.', window.location.href).href;
const login = document.querySelector('#admin-login');
const app = document.querySelector('#admin-app');
const loginCopy = document.querySelector('#admin-login-copy');
const status = document.querySelector('#admin-auth-status');
const errorPanel = document.querySelector('#admin-auth-error');
const signIn = document.querySelector('#admin-ms-sign-in');
const accountChoices = document.querySelector('#admin-auth-accounts');
const denied = document.querySelector('#admin-auth-denied');
const signOutButton = document.querySelector('#admin-ms-sign-out');
const switchAccountButton = document.querySelector('#admin-ms-switch');
const dashboardSignOut = document.querySelector('#admin-sign-out');
let msal;
let activeAdminApiAccount = null;

const adminApiStatusLabels = {
  checking: 'Checking…',
  connected: 'Connected',
  'authentication-required': 'Authentication required',
  'connection-failed': 'Connection failed'
};

const publicClient = new PublicClientApplication({
  auth: {
    clientId,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: false
  },
  cache: { cacheLocation: BrowserCacheLocation.SessionStorage },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Error,
      piiLoggingEnabled: false,
      loggerCallback: (_level, message) => console.error(message)
    }
  }
});

function setError(message) {
  errorPanel.textContent = message;
  errorPanel.hidden = !message;
}

function showLogin(message = '') {
  login.hidden = false;
  app.hidden = true;
  denied.hidden = true;
  accountChoices.hidden = true;
  status.hidden = true;
  signIn.hidden = false;
  setError(message);
}

function showCancelledOrFailed(error) {
  const code = String(error?.errorCode || '').toLowerCase();
  const cancelled = code === 'user_cancelled' || code === 'access_denied';
  showLogin(cancelled
    ? 'Microsoft sign-in was cancelled. You can try again when you are ready.'
    : 'Microsoft sign-in could not be completed. Please try again.');
}

function showNotAuthorised() {
  login.hidden = false;
  app.hidden = true;
  status.hidden = true;
  signIn.hidden = true;
  accountChoices.hidden = true;
  setError('');
  denied.hidden = false;
}

function showAccountChoices(accounts) {
  login.hidden = false;
  app.hidden = true;
  denied.hidden = true;
  status.hidden = false;
  status.textContent = 'Choose a Microsoft account to continue.';
  setError('');
  signIn.hidden = true;
  accountChoices.replaceChildren();
  for (const account of accounts) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'admin-auth-account';
    button.textContent = account.username || account.name || 'Microsoft account';
    button.addEventListener('click', () => restoreAccount(account));
    accountChoices.append(button);
  }
  const another = document.createElement('button');
  another.type = 'button';
  another.className = 'admin-button secondary';
  another.textContent = 'Sign in with another account';
  another.addEventListener('click', beginSignIn);
  accountChoices.append(another);
  accountChoices.hidden = false;
}

function showDashboard(profile, email) {
  login.hidden = true;
  app.hidden = false;
  document.querySelector('#admin-account-name').textContent = profile.displayName || 'Microsoft account';
  document.querySelector('#admin-account-email').textContent = email;
  document.querySelector('#admin-main')?.focus({ preventScroll: true });
}

function updateAdminApiStatus(state, diagnostic = null, needsInteraction = false) {
  document.documentElement.dataset.adminApiStatus = state;
  document.documentElement.dataset.adminApiNeedsInteraction = String(needsInteraction);
  window.dispatchEvent(new CustomEvent('admin-api-status-change', { detail: { state, needsInteraction } }));
  const indicator = document.querySelector('#admin-api-status');
  if (indicator) {
    indicator.dataset.state = state;
    indicator.querySelector('[data-api-state-label]').textContent = adminApiStatusLabels[state];
    const authorize = indicator.querySelector('#admin-api-authorize');
    if (authorize) authorize.hidden = !needsInteraction;
  }
  if (diagnostic && state !== 'connected') {
    console.warn(`[Admin API] Health check category: ${diagnostic}.`);
  }
}

async function checkAdminApiConnection(account, { interactive = false } = {}) {
  updateAdminApiStatus('checking');
  try {
    const accessToken = await acquireAdminApiToken(msal, account, { interactive });
    const result = await checkAdminApiHealth(accessToken);
    updateAdminApiStatus(result.state, result.diagnostic);
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      updateAdminApiStatus('authentication-required', 'interaction-required', true);
      return;
    }
    const errorCode = String(error?.errorCode || '').toLowerCase();
    if (interactive && ['user_cancelled', 'access_denied', 'interaction_required', 'consent_required', 'login_required'].includes(errorCode)) {
      updateAdminApiStatus('authentication-required', 'interactive-authentication-incomplete', true);
      return;
    }
    updateAdminApiStatus('connection-failed', 'token-acquisition-failed');
  }
}

async function graphProfile(account, response = null) {
  msal.setActiveAccount(account);
  let accessToken = response?.accessToken;
  if (!accessToken) {
    const token = await acquireGraphUserToken(msal, account);
    accessToken = token.accessToken;
  }
  const result = await fetch('https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!result.ok) throw new Error('profile_unavailable');
  const profile = await result.json();
  const email = verifiedAdminEmail(profile);
  if (!email || !isAuthorisedProfile(profile)) {
    showNotAuthorised();
    return;
  }
  showDashboard(profile, email);
  activeAdminApiAccount = account;
  void checkAdminApiConnection(account);
}

async function restoreAccount(account) {
  status.hidden = false;
  status.textContent = 'Checking your Microsoft account…';
  accountChoices.hidden = true;
  signIn.hidden = true;
  setError('');
  try {
    await graphProfile(account);
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      showLogin('Your Microsoft sign-in needs to be refreshed. Sign in again to continue.');
      return;
    }
    showLogin('We could not verify this Microsoft account right now. Please try signing in again.');
  }
}

async function beginSignIn() {
  setError('');
  status.hidden = false;
  status.textContent = 'Opening Microsoft sign-in…';
  signIn.disabled = true;
  try {
    await msal.loginRedirect({ scopes: [GRAPH_USER_SCOPE], prompt: 'select_account', redirectUri });
  } catch (error) {
    signIn.disabled = false;
    showCancelledOrFailed(error);
  }
}

async function signOut() {
  try {
    const account = msal.getActiveAccount();
    await msal.logoutRedirect({ account, postLogoutRedirectUri: redirectUri });
  } catch {
    showLogin('Sign out could not be completed. Please try again.');
  }
}

signIn.addEventListener('click', beginSignIn);
switchAccountButton.addEventListener('click', beginSignIn);
signOutButton.addEventListener('click', signOut);
dashboardSignOut.addEventListener('click', signOut);
document.addEventListener('click', event => {
  if (!event.target.closest('#admin-api-authorize') || !activeAdminApiAccount) return;
  const button = event.target.closest('#admin-api-authorize');
  button.disabled = true;
  void checkAdminApiConnection(activeAdminApiAccount, { interactive: true }).finally(() => {
    button.disabled = false;
  });
});

async function start() {
  try {
    await publicClient.initialize();
    msal = publicClient;
    const response = await msal.handleRedirectPromise();
    if (response?.account) {
      await graphProfile(response.account, response);
      return;
    }

    const accounts = msal.getAllAccounts();
    if (accounts.length > 1) {
      showAccountChoices(accounts);
      return;
    }
    if (accounts.length === 1) {
      await restoreAccount(accounts[0]);
      return;
    }
    showLogin();
  } catch (error) {
    showCancelledOrFailed(error);
  }
}

start();
