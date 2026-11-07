'use strict';
const { randomUUID, createHash } = require('node:crypto');
const { isAdministrator } = require('./identity');
const CAPABILITIES = Object.freeze(['news', 'publications', 'events', 'contacts', 'weekly_quotation', 'historical_people', 'photo_albums', 'feedback']);
const STATUS = ['pending', 'awaiting-approval', 'active', 'revoked'];
function fail(code = 'invalid-access-state') { throw new Error(code); }
function binding(identity) {
  if (!identity || identity.provider !== 'aad') fail('invalid-identity');
  if (identity.issuer && identity.subject) return {provider:'aad',kind:'subject',issuer:identity.issuer,subject:identity.subject,...(identity.tenantId ? {tenantId:identity.tenantId} : {}),...(identity.objectId ? {objectId:identity.objectId} : {})};
  if (identity.tenantId && identity.objectId) return {provider:'aad',kind:'object',tenantId:identity.tenantId,objectId:identity.objectId};
  fail('invalid-identity');
}
function key(value) {
  return createHash('sha256').update(JSON.stringify(value.tenantId && value.objectId ? ['aad',value.tenantId,value.objectId] : ['aad',value.issuer,value.subject])).digest('hex');
}
function validBinding(value) {
  if (!value || value.provider !== 'aad' || !['object','subject'].includes(value.kind)) return false;
  const fields = value.kind === 'object' ? ['tenantId','objectId'] : ['issuer','subject'];
  if (!fields.every(k => typeof value[k] === 'string' && value[k].length > 0 && value[k].length <= 512 && !/\s/.test(value[k]))) return false;
  for (const k of ['tenantId','objectId']) if (Object.hasOwn(value,k) && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value[k])) return false;
  return Object.keys(value).every(k=>['provider','kind','issuer','subject','tenantId','objectId'].includes(k));
}
function email(value) {
  if (typeof value !== 'string' || value.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) fail('invalid-account');
  return value.trim().toLowerCase();
}
function sections(value) {
  if (!Array.isArray(value) || !value.length || value.length > CAPABILITIES.length || new Set(value).size !== value.length || value.some(v=>!CAPABILITIES.includes(v))) fail('invalid-sections');
  return [...value].sort();
}
function validate(state) {
  if (!state || state.version !== 1 || state.environment !== 'preview' || !Number.isSafeInteger(state.revision) || state.revision < 1 || !Array.isArray(state.users) || !state.users.length || state.users.length > 500 || !Array.isArray(state.audit) || state.audit.length > 5000) fail();
  const ids = new Set(), identities = new Set();
  for (const u of state.users) {
    if (!u || typeof u.id !== 'string' || ids.has(u.id) || !['editor','owner'].includes(u.role) || !STATUS.includes(u.status) || email(u.account) !== u.account) fail();
    ids.add(u.id);
    if (u.role === 'editor') sections(u.capabilities); else if (!Array.isArray(u.capabilities) || u.capabilities.length) fail();
    if (u.status === 'pending' && u.identity) fail();
    if (['active','awaiting-approval'].includes(u.status) && !validBinding(u.identity)) fail();
    if (u.identity) { if(!validBinding(u.identity) || identities.has(key(u.identity))) fail(); identities.add(key(u.identity)); }
    if (u.status === 'awaiting-approval' && (typeof u.reviewKey !== 'string' || u.reviewKey !== key(u.identity))) fail();
  }
  if (!state.users.some(u=>u.status==='active' && u.role==='owner' && validBinding(u.identity))) fail('last-owner');
  return state;
}
function resolve(state, identity) {
  validate(state);
  if (!identity) return null;
  const matches = state.users.filter(u=>u.identity && isAdministrator(identity,[u.identity]));
  if (matches.length !== 1 || matches[0].status !== 'active') return null;
  return matches[0];
}
function allowed(user, capability) { return !!user && user.status === 'active' && (capability === 'owner' ? user.role === 'owner' : CAPABILITIES.includes(capability) && (user.role === 'owner' || user.capabilities.includes(capability))); }
function summary(user) { return {id:user.id,account:user.account,role:user.role,status:user.status,capabilities:user.role==='owner' ? [...CAPABILITIES] : [...user.capabilities],updatedAt:user.updatedAt}; }
function entry(state, actor, action, target, now) {
  if(state.audit.length >= 5000) fail('access-audit-capacity');
  state.revision++;
  state.audit.push({at:now,actor:actor.id,action,target,revision:state.revision});
}
function bootstrap(identity, account, now = new Date().toISOString()) {
  const owner={id:randomUUID(),account:email(account),role:'owner',status:'active',capabilities:[],identity:binding(identity),createdAt:now,updatedAt:now};
  return validate({version:1,environment:'preview',revision:1,users:[owner],audit:[{at:now,actor:owner.id,action:'bootstrap-owner',target:owner.id,revision:1}]});
}
function manage(original, identity, body, now = new Date().toISOString()) {
  const state=structuredClone(validate(original)), actor=resolve(state,identity);
  if(!allowed(actor,'owner')) fail('owner-required');
  const permitted={add:['action','account','role','capabilities'],update:['action','id','role','capabilities'],approve:['action','id','reviewKey'],revoke:['action','id'],'reset-pending':['action','id'],restore:['action','id']};
  if(!body || !permitted[body.action] || Object.keys(body).some(k=>!permitted[body.action].includes(k))) fail('invalid-access-request');
  let target;
  if(body.action === 'add') {
    const account=email(body.account);
    if(state.users.some(u=>u.account===account && u.status!=='revoked')) fail('account-already-exists');
    if(!['owner','editor'].includes(body.role)) fail('invalid-role');
    target={id:randomUUID(),account,role:body.role,status:'pending',capabilities:body.role==='owner'?[]:sections(body.capabilities),createdAt:now,updatedAt:now};
    if(body.role==='owner' && (!Array.isArray(body.capabilities)||body.capabilities.length)) fail('invalid-sections');
    state.users.push(target);
  } else {
    target=state.users.find(u=>u.id===body.id);
    if(!target) fail('account-not-found');
    if(target.id===actor.id && (body.action==='revoke' || (body.action==='update' && body.role!=='owner'))) fail('self-removal');
    if(body.action==='approve') {
      if(target.status!=='awaiting-approval' || body.reviewKey!==target.reviewKey) fail('review-again');
      target.status='active'; target.approvedAt=now;target.approvedBy=actor.id;
    } else if(body.action==='revoke') target.status='revoked';
    else if(body.action==='reset-pending'){
      if(target.status!=='awaiting-approval')fail('review-again');
      target.status='pending';for(const k of ['identity','reviewKey','presentedAccount','presentedName'])delete target[k];
    } else if(body.action==='restore'){
      if(target.status!=='revoked')fail('review-again');
      target.status=target.identity?'awaiting-approval':'pending';
      if(target.identity)target.reviewKey=key(target.identity);
    }
    else {
      if(target.status==='revoked') fail('account-revoked');
      if(!['owner','editor'].includes(body.role)) fail('invalid-role');
      target.role=body.role;
      target.capabilities=body.role==='owner'?[]:sections(body.capabilities);
      if(body.role==='owner' && (!Array.isArray(body.capabilities)||body.capabilities.length)) fail('invalid-sections');
    }
    target.updatedAt=now;
  }
  entry(state,actor,body.action,target.id,now);
  return validate(state);
}
// An account label selects a pending request, NEVER an authorisation grant.
// Owner approval is required; candidate claims cannot be replaced by another login.
function enrol(original, identity, account, now = new Date().toISOString(), presentation = {}) {
  const state=structuredClone(validate(original)), candidate=binding(identity), candidateKey=key(candidate), label=email(account);
  const existing=state.users.find(u=>u.identity && key(u.identity)===candidateKey);
  if(existing) {
    if(existing.account===label && existing.status==='awaiting-approval' && isAdministrator(identity,[existing.identity])) return state;
    fail('request-not-available');
  }
  const targets=state.users.filter(u=>u.account===label && u.status==='pending');
  if(targets.length!==1) fail('request-not-available');
  const target=targets[0]; target.identity=candidate;target.reviewKey=candidateKey;target.status='awaiting-approval';target.updatedAt=now;
  // Display hints are not proof of email ownership and never confer access.
  for(const field of ['presentedAccount','presentedName']) if(typeof presentation[field]==='string' && presentation[field].length<=254 && !/[\u0000-\u001f\u007f]/.test(presentation[field]))target[field]=presentation[field];
  entry(state,{id:target.id},'account-presented',target.id,now);
  return validate(state);
}
module.exports={CAPABILITIES,binding,key,validate,resolve,allowed,summary,bootstrap,manage,enrol};
