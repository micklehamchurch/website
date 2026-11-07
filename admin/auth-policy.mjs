export const authorisedEmail = 'edward.popov@outlook.com';

function normaliseEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

// Only call this with the Microsoft Graph /me profile, not unverified UI input.
export function verifiedAdminEmail(profile) {
  const candidates = [profile?.mail, profile?.userPrincipalName].map(normaliseEmail);
  return candidates.find(value => value === authorisedEmail) || '';
}

export function isAuthorisedProfile(profile) {
  return Boolean(verifiedAdminEmail(profile));
}
