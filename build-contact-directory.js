const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const sourcePath = path.join(root, '_content', 'contacts.json');
const templatePath = path.join(root, '_templates', 'parish-contact-directory.html');
const publicPath = path.join(root, 'our-team.html');
const adminDataPath = path.join(root, 'admin', 'contacts-data.json');
const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
require('./azure-function/src/contacts-model').validateContacts(data);
const sections = data.sections || [];
const contacts = data.contacts || [];
const pccMembers = data.pccMembers || [];
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const sectionIds = new Set(sections.map(section => section.id));
const supportedStatuses = new Set(['published', 'draft']);

function validateRecords(records, type) {
  const ids = new Set();
  for (const record of records) {
    if (!record.id || !slugPattern.test(record.id)) throw new Error(`${type} has an invalid or missing id.`);
    if (ids.has(record.id)) throw new Error(`${type} contains duplicate id "${record.id}".`);
    ids.add(record.id);
    if (!supportedStatuses.has(record.status)) throw new Error(`${type} "${record.id}" must have status published or draft.`);
  }
}

validateRecords(contacts, 'Contact');
validateRecords(pccMembers, 'PCC member');
for (const section of sections) {
  if (!section.id || !section.title || !section.eyebrow) throw new Error('Each contact section needs an id, title and eyebrow.');
}
for (const contact of contacts) {
  if (!contact.role?.trim() || !contact.name?.trim()) throw new Error(`Contact "${contact.id}" needs a role and name.`);
  if (!sectionIds.has(contact.section)) throw new Error(`Contact "${contact.id}" uses an unsupported section.`);
  if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error(`Contact "${contact.id}" has an invalid email address.`);
  if (contact.phone && (!/^[+0-9().\s-]+$/.test(contact.phone) || contact.phone.replace(/\D/g, '').length < 7)) throw new Error(`Contact "${contact.id}" has an invalid phone number.`);
}
for (const member of pccMembers) if (!member.name?.trim()) throw new Error(`PCC member "${member.id}" needs a name.`);

function contactCard(records) {
  const first = records[0];
  const people = records.map(record => `<div class="directory-person"><p class="directory-name">${esc(record.name)}</p>${record.phone ? `<p class="directory-method"><span class="contact-icon" aria-hidden="true">☎</span><a href="tel:${esc(record.phone.replace(/[^+\d]/g, ''))}">${esc(record.phone)}</a></p>` : ''}</div>`).join('');
  const emails = [...new Set(records.map(record => record.email).filter(Boolean))];
  return `<article class="directory-entry"><h3>${esc(first.role)}</h3>${people}<div class="directory-contacts">${emails.map(email => `<p class="directory-method"><span class="contact-icon" aria-hidden="true">✉</span><a href="mailto:${esc(email)}">${esc(email)}</a></p>`).join('')}</div></article>`;
}

function sectionMarkup(section) {
  const records = contacts.filter(contact => contact.section === section.id && contact.status === 'published');
  const groups = [];
  for (const contact of records) {
    const last = groups[groups.length - 1];
    if (contact.groupId && last?.groupId === contact.groupId) last.records.push(contact);
    else groups.push({ groupId: contact.groupId || '', records: [contact] });
  }
  return `<section class="directory-group" aria-labelledby="directory-${esc(section.id)}"><div class="directory-section-heading"><p class="eyebrow">${esc(section.eyebrow)}</p><h2 id="directory-${esc(section.id)}">${esc(section.title)}</h2></div><div class="directory-cards">${groups.map(group => contactCard(group.records)).join('')}</div></section>`;
}

const publishedMembers = pccMembers.filter(member => member.status === 'published');
const pccSection = sections.find(section => section.id === 'pcc-members') || { id: 'pcc-members', title: 'PCC members', eyebrow: 'Parish Council' };
const renderedDirectory = `<div class="directory-grid">${sections.filter(section => section.id !== 'pcc-members').map(sectionMarkup).join('')}<section class="directory-group directory-group-pcc" aria-labelledby="directory-pcc"><div class="directory-section-heading"><p class="eyebrow">${esc(pccSection.eyebrow)}</p><h2 id="directory-pcc">${esc(pccSection.title)}</h2></div><ul class="pcc-list">${publishedMembers.map(member => `<li>${esc(member.name)}</li>`).join('')}</ul></section></div>`;

const template = fs.readFileSync(templatePath, 'utf8');
if (!template.includes('<!-- GENERATED_CONTACT_DIRECTORY -->')) throw new Error('Directory template is missing its generated content marker.');
fs.writeFileSync(publicPath, template.replace('<!-- GENERATED_CONTACT_DIRECTORY -->', renderedDirectory), 'utf8');
const adminData = {
  sections,
  contacts: contacts.filter(contact => contact.status === 'published'),
  pccMembers: pccMembers.filter(member => member.status === 'published')
};
fs.writeFileSync(path.join(root, 'parish-contact-directory.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="search-index" content="exclude"><meta name="robots" content="noindex"><link rel="canonical" href="https://micklehamchurch.github.io/website/our-team.html"><title>Our Team | St Michael &amp; All Angels</title><script>location.replace('our-team.html' + location.search + location.hash);</script><link rel="stylesheet" href="styles.css"></head><body><main class="container section"><h1>Our Team</h1><p>The Parish Contact Directory is now part of Our Team.</p><a href="our-team.html">Meet our team and find parish contacts →</a></main></body></html>
`, 'utf8');
fs.writeFileSync(adminDataPath, `${JSON.stringify(adminData, null, 2)}\n`, 'utf8');
console.log(`Generated Our Team from Contacts with ${contacts.filter(contact => contact.status === 'published').length} published contacts and ${publishedMembers.length} published PCC members.`);
