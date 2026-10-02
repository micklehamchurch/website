import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { contactsMessage as calendarMessage } from './contacts-api.mjs';
const code = fs.readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
const directory = () => ({ sections: ['parish-leadership','parish-office-pcc','worship-life-events','pastoral-care-safeguarding','parish-life-communications','pcc-members'].map(id => ({id,title:id,eyebrow:'Section'})), contacts: [{id:'fixture-contact',section:'parish-leadership',role:'Fixture role',name:'Fixture Person',email:'',phone:'',status:'published',photo:''}], pccMembers:[{id:'pcc-one',name:'PCC One',status:'published'},{id:'pcc-two',name:'PCC Two',status:'draft'}] });
const initial = () => ({ok:true,sha:'a'.repeat(40),contacts:directory()});
async function harness({ publish = async () => ({ ok: true, sha: 'c'.repeat(40) }) } = {}) {
  const elements = new Map(), listeners = {}, calls = [], storage = [], monitors = [];
  const node = selector => {
    if (!elements.has(selector)) elements.set(selector, { innerHTML: '', textContent: '', dataset: {}, hidden: false, listeners: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: node, querySelectorAll: () => [], setAttribute() {}, focus() {}, showModal() {}, close() {}, reportValidity: () => true,
      addEventListener(name, callback) { this.listeners[name] = callback; } });
    return elements.get(selector);
  };
  const window = { monitorPublishedCalendar: (sha, onLive, onTimeout) => monitors.push({ sha, onLive, onTimeout }), confirm: () => true, addEventListener: (name, fn) => { listeners[name] = fn; }, churchContactsApi: {
    load: async () => { calls.push({ method: 'GET' }); return initial(); },
    publish: async payload => { calls.push({ method: 'PUT', payload: structuredClone(payload) }); return publish(payload); }, message: calendarMessage
  } };
  const location = { hash: '#contacts' };
  const context = { window, location, document: { addEventListener() {}, querySelector: node, documentElement: { dataset: {} } }, sessionStorage: { getItem: () => JSON.stringify({ contacts: { working: { sections:[],contacts:[{id:'old-demo',name:'Old demo'}],pccMembers:[] } } }), setItem: (key, value) => storage.push(JSON.parse(value)), removeItem() {} }, console, Date, Intl, URL, setTimeout: () => 0, clearTimeout() {}, FormData: class { constructor(form) { this.form = form; } entries() { return Object.entries(this.form.values); } },
    fetch: async url => ({ ok: true, json: async () => url.includes('events') ? { items: [] } : url.includes('contacts') ? { sections: [], contacts: [], pccMembers: [] } : url.includes('news') ? { articles: [] } : url.includes('pages') ? { pages: [] } : [] }) };
  vm.runInNewContext(code, context);
  const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
  await flush();
  const click = (action, kind = 'calendar', id = '') => node('#admin-content').listeners.click({ target: { closest: selector => selector === '[data-action]' ? { dataset: { action, kind, id } } : null } });
  const submit = (values, id = '', pcc = false) => {
    click(pcc ? (id ? 'edit-pcc' : 'add-pcc') : (id ? 'edit-contact' : 'add-contact'), '', id);
    const form = node(pcc ? '#admin-pcc-form' : '#admin-contact-form');
    form.values = { id, role:'Fixture role',name:'Fixture Person',section:'parish-leadership',phone:'',email:'',status:'published', ...values };
    form.listeners.submit({preventDefault(){}});
  };
  return { node, window, calls, storage, flush, click, submit, listeners, monitors };
}

test('Contacts editor loads shared data, ignores stale tab data, stages edits and preserves optional fields',async()=>{
 const h=await harness(); assert.equal(h.calls[0].method,'GET');assert.doesNotMatch(h.node('#admin-content').innerHTML,/Old demo/);
 assert.match(h.node('#admin-content').innerHTML,/data-action="publish-contacts" disabled/);
 h.submit({name:'Updated fixture'},'fixture-contact');assert.match(h.node('#admin-content').innerHTML,/Changes are staged/);
 h.click('publish-contacts');await h.flush();const p=h.calls[1].payload;assert.equal(p.sha,'a'.repeat(40));assert.equal(p.contacts.contacts[0].name,'Updated fixture');assert.equal(p.contacts.contacts[0].photo,'');assert.equal(h.storage.length,0);
 assert.match(h.node('#admin-content').innerHTML,/website is rebuilding/);assert.doesNotMatch(h.node('#admin-content').innerHTML,/Contacts live/);
 h.submit({name:'Second fixture'},'fixture-contact');h.click('publish-contacts');await h.flush();assert.equal(h.calls[2].payload.sha,'c'.repeat(40));
});
test('Contacts editor stages adds, draft/restore, category, PCC ordering and confirmed deletion',async()=>{
 const h=await harness();h.submit({name:'Added fixture',section:'worship-life-events'});h.submit({name:'Added PCC'},'',true);
 h.click('toggle-contact-status','','fixture-contact');h.click('toggle-contact-status','','fixture-contact');h.click('toggle-pcc-status','','pcc-two');
 h.node('#admin-content').listeners.click({target:{closest:q=>q==='[data-action]'?{dataset:{action:'move-pcc',id:'pcc-two',direction:'-1'}}:null}});
 h.click('delete-contact','','fixture-contact');assert.match(h.node('#admin-dialog').innerHTML,/stages permanent deletion/);
 h.node('#admin-dialog').listeners.click({target:{closest:q=>q==='[data-action="confirm-contact-delete"]'?{dataset:{id:'fixture-contact',kind:'contact'}}:null}});
 h.window.confirm=()=>false;h.click('publish-contacts');assert.equal(h.calls.length,1);h.window.confirm=()=>true;h.click('publish-contacts');await h.flush();
 const d=h.calls[1].payload.contacts;assert.equal(d.contacts.length,1);assert.equal(d.contacts[0].section,'worship-life-events');assert.equal(d.pccMembers[0].id,'pcc-two');assert.equal(d.pccMembers[0].status,'published');assert.equal(d.pccMembers.length,3);
});
test('Contacts conflict preserves staged data and requires a confirmed reload',async()=>{
 const h=await harness({publish:async()=>({ok:false,category:'contacts-version-conflict'})});h.submit({name:'Staged fixture'},'fixture-contact');h.click('publish-contacts');await h.flush();
 assert.match(h.node('#admin-content').innerHTML,/shared Contacts changed/);assert.match(h.node('#admin-content').innerHTML,/Staged fixture/);h.click('publish-contacts');assert.equal(h.calls.length,2);
 h.window.confirm=()=>false;h.click('reload-contacts');await h.flush();assert.equal(h.calls.length,2);h.window.confirm=()=>true;h.click('reload-contacts');await h.flush();assert.equal(h.calls.length,3);assert.doesNotMatch(h.node('#admin-content').innerHTML,/Staged fixture/);
});
