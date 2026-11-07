import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorisedProfile, verifiedAdminEmail } from './auth-policy.mjs';

test('allows the named Microsoft Graph profile email, case-insensitively', () => {
  const profile = { mail: 'Edward.Popov@Outlook.com', userPrincipalName: 'edward.popov@outlook.com' };
  assert.equal(isAuthorisedProfile(profile), true);
  assert.equal(verifiedAdminEmail(profile), 'edward.popov@outlook.com');
});

test('allows the named address when Graph exposes it as the user principal name', () => {
  assert.equal(isAuthorisedProfile({ mail: null, userPrincipalName: 'edward.popov@outlook.com' }), true);
});

test('rejects another authenticated Microsoft account', () => {
  assert.equal(isAuthorisedProfile({ mail: 'someone@example.com', userPrincipalName: 'someone@example.com' }), false);
});

test('does not authorize from a display name or unverified preferred username', () => {
  assert.equal(isAuthorisedProfile({ displayName: 'Eduard Popov', preferred_username: 'edward.popov@outlook.com' }), false);
});

test('rejects a missing or unusable Graph profile', () => {
  assert.equal(isAuthorisedProfile(null), false);
  assert.equal(isAuthorisedProfile({ mail: '   ', userPrincipalName: null }), false);
});
