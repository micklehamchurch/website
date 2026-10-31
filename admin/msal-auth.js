import recurrence from './calendar-recurrence-editor.mjs';
window.churchRecurrence = recurrence;
window.dispatchEvent(new Event('admin-recurrence-ready'));
import {
  BrowserCacheLocation,
  InteractionRequiredAuthError,
  LogLevel,
  PublicClientApplication
} from '@azure/msal-browser';
import { GRAPH_USER_SCOPE, MICROSOFT_CLIENT_ID, MICROSOFT_AUTHORITY } from './auth-config.mjs';
import { checkAdministratorIdentity } from './api-identity.mjs';
import { checkAdminApiHealth } from './api-health.mjs';
import { checkGithubRepositoryStatus } from './api-github-status.mjs';
import { acquireAdminApiToken, acquireGraphUserToken } from './auth-tokens.mjs';
import { attachContactsApi } from './contacts-api.mjs';
import { attachHomepageVersesApi } from './homepage-verses-api.mjs';
import { attachPhotoAlbumsApi } from './photo-albums-api.mjs';
import { attachFeedbackApi } from './feedback-api.mjs';
import { attachClergyApi } from './clergy-api.mjs';
import { attachNewsApi } from './news-api.mjs';
import { attachCalendarApi } from './calendar-api.mjs';
import { attachGoogleSyncApi } from './google-calendar-sync-api.mjs';
import {verifyPrivateOwner} from './access-setup.mjs';
import {createShell,attachDrawer} from './cms-shell.mjs';
import {createAccessClient} from './access-client.mjs';
import {createUsersInterface} from './users-permissions.mjs';
window.AdminShell=createShell();
attachDrawer();

const clientId = MICROSOFT_CLIENT_ID;
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
let connectionAccount=null,connectionProfile=null;
let currentProfile=null;
let accessCall;

const adminApiStatusLabels = {
  checking: 'Checking…',
  connected: 'Connected',
  'authentication-required': 'Authentication required',
  'connection-failed': 'Connection failed'
};
const githubRepositoryStatusLabels = {
  checking: 'Checking…',
  connected: 'Connected',
  'connection-failed': 'Connection failed'
};

const publicClient = new PublicClientApplication({
  auth: {
    clientId,
    authority: MICROSOFT_AUTHORITY,
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
  const connectionDiagnostic = document.querySelector('#admin-api-diagnostic');
  if (connectionDiagnostic) connectionDiagnostic.textContent = diagnostic ? `Connection diagnostic: ${diagnostic}` : '';
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

function updateGithubRepositoryStatus(state, diagnostic = null) {
  const safeState = githubRepositoryStatusLabels[state] ? state : 'connection-failed';
  window.dispatchEvent(new CustomEvent('github-repository-status-change', { detail: { state: safeState } }));
  if (diagnostic && safeState !== 'connected') {
    console.warn(`[GitHub Repository] Status category: ${diagnostic}.`);
  }
}

async function checkGithubRepositoryConnection(accessToken) {
  updateGithubRepositoryStatus('checking');
  try {
    const result = await checkGithubRepositoryStatus(accessToken);
    updateGithubRepositoryStatus(result.state, result.diagnostic);
  } catch {
    updateGithubRepositoryStatus('connection-failed', 'request-failed');
  }
}

async function checkAdminApiConnection(account, { interactive = false } = {}) {
  updateAdminApiStatus('checking');
  updateGithubRepositoryStatus('checking');
  try {
    const accessToken = await acquireAdminApiToken(msal, account, { interactive });
    const result = await checkAdminApiHealth(accessToken);
    updateAdminApiStatus(result.state, result.diagnostic);
    if (result.state === 'connected') {
      void checkGithubRepositoryConnection(accessToken);
      window.dispatchEvent(new Event('admin-news-ready'));
      window.dispatchEvent(new Event('admin-clergy-ready'));
      window.dispatchEvent(new Event('admin-contacts-ready'));
      window.dispatchEvent(new Event('admin-homepage-verses-ready'));
      window.dispatchEvent(new Event('admin-photo-albums-ready'));
      window.dispatchEvent(new Event('admin-feedback-ready'));
    } else {
      updateGithubRepositoryStatus('connection-failed', 'admin-api-unavailable');
    }
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      updateAdminApiStatus('authentication-required', 'interaction-required', true);
      updateGithubRepositoryStatus('connection-failed', 'admin-api-authentication-required');
      return;
    }
    const errorCode = String(error?.errorCode || '').toLowerCase();
    if (interactive && ['user_cancelled', 'access_denied', 'interaction_required', 'consent_required', 'login_required'].includes(errorCode)) {
      updateAdminApiStatus('authentication-required', 'interactive-authentication-incomplete', true);
      updateGithubRepositoryStatus('connection-failed', 'admin-api-authentication-required');
      return;
    }
    updateAdminApiStatus('connection-failed', 'token-acquisition-failed');
    updateGithubRepositoryStatus('connection-failed', 'admin-api-unavailable');
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
  currentProfile=profile;
  activeAdminApiAccount = account;
  await completeAccess(account,profile);
}

async function completeAccess(account,profile,{interactive=false}={}){
  activeAdminApiAccount=account;
  const current=await accessCall('session',{interactive});
  if(!current.ok){
    connectionAccount=account;connectionProfile=profile;
    showLogin(current.error==='connection-required'?'Connect your Microsoft account to the website to continue.':'Website access could not be checked. Try again; your permissions have not been changed.');
    signIn.textContent='Connect to website';return;
  }
  connectionAccount=null;connectionProfile=null;
  if(!current.access){
    const label=profile.mail||profile.userPrincipalName;
    if(current.status==='no-access'&&label)await accessCall('enrolment',{method:'POST',body:{account:label}});
    showNotAuthorised();
    denied.querySelector('h2').textContent='Your account needs approval from the Website Owner before you can manage content.';
    let requestForm=document.querySelector('#cms-request-access');
    if(!requestForm){
      requestForm=document.createElement('form');requestForm.id='cms-request-access';requestForm.innerHTML='<p>If the owner added you under another account email, enter it here. This requests review; it does not grant access.</p><label for="cms-request-account">Microsoft account email</label><input id="cms-request-account" type="email" required maxlength="254"><button class="admin-button" type="submit">Request owner review</button><button class="admin-button secondary" type="button" id="cms-check-approval">Check approval</button><p role="status"></p>';
      denied.append(requestForm);
      requestForm.addEventListener('submit',async event=>{event.preventDefault();const button=requestForm.querySelector('[type=submit]');button.disabled=true;try{const result=await accessCall('enrolment',{method:'POST',body:{account:requestForm.querySelector('input').value.trim()}});requestForm.querySelector('[role=status]').textContent=result.ok?'Your account is awaiting owner approval. You cannot manage content yet.':'The request could not be matched. Contact the Website Owner.';}finally{button.disabled=false;}});
      requestForm.querySelector('#cms-check-approval').addEventListener('click',()=>void completeAccess(activeAdminApiAccount,currentProfile));
    }
    requestForm.querySelector('input').value=label||'';
    return;
  }
  if(current.enforcement!=='capabilities'&&current.access.role!=='owner'){
    showNotAuthorised();denied.querySelector('h2').textContent='Your access has been approved. Section access is awaiting activation by the Website Owner.';return;
  }
  window.AdminShell.setSession(current);
  showDashboard(profile,profile.mail||profile.userPrincipalName||'Microsoft account');
  updateAdminApiStatus('connected');
  for(const [cap,event] of [['events','admin-calendar-ready'],['contacts','admin-contacts-ready'],['news','admin-news-ready'],['publications','admin-news-ready'],['weekly_quotation','admin-homepage-verses-ready'],['historical_people','admin-clergy-ready'],['photo_albums','admin-photo-albums-ready'],['feedback','admin-feedback-ready']])if(window.AdminShell.can(cap))window.dispatchEvent(new Event(event));
}
let refreshingAccess=false;
async function refreshAccess(){
  if(refreshingAccess||!activeAdminApiAccount||!window.AdminShell.session?.access)return;
  refreshingAccess=true;
  try{
    const next=await accessCall('session');
    if(!next.ok||!next.access){window.AdminShell.setSession(null);document.querySelectorAll('dialog[open]').forEach(d=>d.close());window.dispatchEvent(new Event('admin-access-lost'));showLogin('Your website access could not be confirmed. Sign in again or contact the Website Owner.');return;}
    if(next.enforcement!==window.AdminShell.session.enforcement||JSON.stringify(next.access)!==JSON.stringify(window.AdminShell.session.access)){
      document.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close());
      window.AdminShell.setSession(next);
    }
  }finally{refreshingAccess=false;}
}
window.setInterval(()=>{if(!document.hidden)void refreshAccess();},60000);
window.addEventListener('focus',()=>void refreshAccess());
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshAccess();});
window.addEventListener('admin-access-recheck',()=>void refreshAccess());

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
  if(connectionAccount){await completeAccess(connectionAccount,connectionProfile,{interactive:true});return;}
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
document.querySelector('#admin-check-identity').addEventListener('click', async event => {
  const button = event.currentTarget;
  const result = document.querySelector('#admin-identity-result');
  button.disabled = true;
  result.textContent = 'Checking verified identity…';
  try {
    if (!activeAdminApiAccount) throw new Error('account-required');
    const check = await checkAdministratorIdentity(msal, activeAdminApiAccount, { interactive: true });
    result.textContent = check.ok
      ? JSON.stringify(check.identity, null, 2)
      : `Identity check failed (${check.diagnostic}).`;
  } catch {
    result.textContent = 'Identity check could not be completed. Sign in and authorise the Admin API connection, then try again.';
  } finally {
    button.disabled = false;
  }
});
switchAccountButton.addEventListener('click', beginSignIn);
document.querySelector('#admin-copy-owner-setup')?.addEventListener('click',async event=>{
  const button=event.currentTarget,result=document.querySelector('#admin-private-owner-result');
  button.disabled=true;result.textContent='Verifying the existing owner…';
  try{
    if(!activeAdminApiAccount)throw Error('account-required');
    const check=await checkAdministratorIdentity(msal,activeAdminApiAccount,{interactive:true});
    if(!check.ok || check.identity.administrator!==true || check.identity.authorizationStatus!=='http-200')throw Error('owner-required');
    await navigator.clipboard.writeText(JSON.stringify(check.identity));
    result.textContent='Verified owner setup copied as one line. Paste it only into the private Cloud Shell bootstrap prompt. No token was copied.';
  }catch{result.textContent='Owner setup could not be verified or copied. Check Microsoft sign-in and browser clipboard access, then try again.';}
  finally{button.disabled=false;}
});
document.querySelector('#admin-check-private-owner')?.addEventListener('click',async event=>{
  const button=event.currentTarget,result=document.querySelector('#admin-private-owner-result');
  button.disabled=true;result.textContent='Checking private owner access…';
  try{
    if(!activeAdminApiAccount)throw Error('account-required');
    const check=await verifyPrivateOwner(msal,activeAdminApiAccount);
    result.textContent=check.ok?'Private permission store read-back succeeded. Your signed-in Microsoft account is an active Website Owner. '+(check.enforcement==='capabilities'?'Section permissions are enabled.':'Existing owner admission is still in place; section permissions have not been enabled.'):'Private owner access could not be verified. Complete storage setup before changing authentication enforcement.';
  }catch{result.textContent='Private owner access could not be checked. Sign in and connect to the Admin API, then try again.';}
  finally{button.disabled=false;}
});
signOutButton.addEventListener('click', signOut);
dashboardSignOut.addEventListener('click', signOut);
window.addEventListener('github-repository-status-change',event=>{const target=document.querySelector('#cms-repository-result');if(target)target.textContent='Repository connection: '+(githubRepositoryStatusLabels[event.detail.state]||'Not available')+'.';});
document.querySelector('#cms-help')?.addEventListener('click',()=>{
  const dialog=document.querySelector('#admin-dialog');
  dialog.innerHTML='<div class="admin-dialog-inner"><div class="admin-dialog-head"><h2 id="admin-dialog-title">Help with website administration</h2><button class="admin-icon-button" type="button" aria-label="Close help">×</button></div><p>Choose a section, make your changes, then use its Save or Publish action. Changes awaiting publication are not yet displayed on the website.</p><p>After publishing, “Saved — website updating” means the update was saved and the website is rebuilding. It does not confirm the public page has updated.</p><p>Drafts and research notes stored with website content are not confidential. Do not include sensitive personal information.</p><p>If access or a save fails, keep your work and contact the Website Owner. Do not repeat a publish if the result is uncertain.</p></div>';
  dialog.querySelector('button').addEventListener('click',()=>dialog.close());dialog.showModal();dialog.querySelector('button').focus();
});
document.addEventListener('click',event=>{if(event.target.closest('a[href="#help"]')){event.preventDefault();document.querySelector('#cms-help')?.click();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const menu=document.querySelector('.cms-account-menu[open]');if(menu){menu.open=false;menu.querySelector('summary').focus();}}});
document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-owner-connection]');if(!button||!window.AdminShell.owner())return;
  button.disabled=true;await checkAdminApiConnection(activeAdminApiAccount,{interactive:true});
  const target=document.querySelector('#cms-connection-result');if(target)target.textContent='Connection check complete. '+(document.documentElement.dataset.adminApiStatus==='connected'?'Website API connected.':'Connection needs attention.');button.disabled=false;
});
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
    accessCall=createAccessClient(msal,()=>activeAdminApiAccount);
    window.AdminUsers=createUsersInterface(accessCall);
    // React to server denials without logging responses or token values.
    const originalFetch=window.fetch.bind(window);
    window.fetch=async(...args)=>{
      const response=await originalFetch(...args);
      const url=String(args[0]?.url||args[0]);
      if([403,503].includes(response.status)&&url.includes('azurewebsites.net/api/')){
        try{const error=(await response.clone().json()).error;if(['access-denied','owner-required','administrator-required','access-unavailable'].includes(error))window.dispatchEvent(new Event('admin-access-recheck'));}catch{}
      }
      return response;
    };
    attachCalendarApi(msal, () => activeAdminApiAccount);
    attachGoogleSyncApi(msal, () => activeAdminApiAccount);
    attachContactsApi(msal, () => activeAdminApiAccount);
    attachHomepageVersesApi(msal, () => activeAdminApiAccount);
    attachPhotoAlbumsApi(msal, () => activeAdminApiAccount);
    attachNewsApi(msal, () => activeAdminApiAccount);
    attachClergyApi(msal, () => activeAdminApiAccount);
    attachFeedbackApi(msal, () => activeAdminApiAccount);
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
