const fs = require('node:fs');
const path = require('node:path');
const { validateContacts } = require('./azure-function/src/contacts-model');
const { portrait } = require('./contact-portrait');
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

function renderGeneralContacts(data) {
  validateContacts(data);
  const descriptions = [
    ['parish-priest', 'For pastoral matters, services, baptisms, weddings, funerals, prayer and other church enquiries.'],
    ['parish-administrator', 'For general parish enquiries, administration, bookings and practical questions.']
  ];
  const records = descriptions.map(([id]) => {
    const record = data.contacts.find(person => person.id === id && person.status === 'published');
    if (!record) throw new Error(`General enquiries requires a published contact: ${id}`);
    return record;
  });
  const cards = records.map((person, index) => `<article class="enquiry-card" aria-labelledby="enquiry-${person.id}">
    <div class="enquiry-person">${portrait(person)}<div><p class="eyebrow">${esc(person.role)}</p><h2 id="enquiry-${person.id}">${esc(person.name)}</h2></div></div>
    <p class="enquiry-description">${descriptions[index][1]}</p>
    <div class="enquiry-methods">${person.phone ? `<a href="tel:${esc(person.phone.replace(/[^+\d]/g, ''))}"><span aria-hidden="true">☎</span> ${esc(person.phone)}</a>` : ''}${person.email ? `<a href="mailto:${esc(person.email)}"><span aria-hidden="true">✉</span> ${esc(person.email)}</a>` : ''}</div>
  </article>`).join('\n');
  const alison = records[1];
  const action = alison.email ? `<a class="inline-link" href="mailto:${esc(alison.email)}">Email ${esc(alison.name)} <span aria-hidden="true">→</span></a>` : alison.phone ? `<a class="inline-link" href="tel:${esc(alison.phone.replace(/[^+\d]/g, ''))}">Call ${esc(alison.name)} <span aria-hidden="true">→</span></a>` : '';
  return `<div class="enquiry-grid">${cards}</div>
    <aside class="enquiry-guidance" aria-labelledby="enquiry-guidance-title"><div><h2 id="enquiry-guidance-title">Not sure who to contact?</h2><p>Contact ${esc(alison.name)}, our ${esc(alison.role)}, and she can direct your enquiry to the right person.</p></div>${action}</aside>
    <section class="enquiry-team" aria-labelledby="enquiry-team-title"><h2 id="enquiry-team-title">Looking for someone specific?</h2><p>See all clergy, churchwardens, PCC members and parish contacts.</p><a class="inline-link" href="our-team.html">Meet our team <span aria-hidden="true">→</span></a></section>`;
}

if (require.main === module) {
  const template = fs.readFileSync(path.join(__dirname, '_templates/contact.html'), 'utf8');
  if (!template.includes('<!-- GENERATED_GENERAL_CONTACTS -->')) throw new Error('Contact template is missing its generated content marker.');
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '_content/contacts.json'), 'utf8'));
  fs.writeFileSync(path.join(__dirname, 'contact.html'), template.replace('<!-- GENERATED_GENERAL_CONTACTS -->', renderGeneralContacts(data)));
  console.log('Generated Contact page from canonical Contacts.');
}
module.exports = { renderGeneralContacts };
