const test = require('node:test');
const assert = require('node:assert/strict');
const data = require('./_content/contacts.json');
const { renderGeneralContacts } = require('./build-general-contacts');
test('General enquiries uses canonical people, methods and an intentional no-photo card', () => {
  const html = renderGeneralContacts(data);
  for (const id of ['parish-priest', 'parish-administrator']) {
    const person = data.contacts.find(p => p.id === id);
    assert(html.includes(person.name));
    assert(html.includes(`tel:${person.phone.replace(/\D/g, '')}`));
    assert(html.includes(`mailto:${person.email}`));
  }
  assert.equal((html.match(/href="our-team.html"/g) || []).length, 1);
  assert.doesNotMatch(html, /placeholder|visit.html|whats-on.html|<form/);
  const alison = html.split('aria-labelledby="enquiry-parish-administrator"')[1].split('</article>')[0];
  assert.doesNotMatch(alison, /<img/);
});
test('Admin changes flow through and missing or unpublished required records fail explicitly', () => {
  const fixture = structuredClone(data);
  const person = fixture.contacts.find(p => p.id === 'parish-administrator');
  person.name = 'Updated Administrator'; person.email = 'changed@example.org'; person.phone = '01372 123456';
  const html = renderGeneralContacts(fixture);
  assert.match(html, /Updated Administrator/); assert.match(html, /mailto:changed@example.org/); assert.match(html, /tel:01372123456/);
  person.status = 'draft'; assert.throws(() => renderGeneralContacts(fixture), /requires a published contact: parish-administrator/);
  fixture.contacts = fixture.contacts.filter(p => p.id !== 'parish-administrator');
  assert.throws(() => renderGeneralContacts(fixture), /requires a published contact/);
});
test('General enquiries shares optimized sources and saved framing with the directory', () => {
  const fixture = structuredClone(data);
  const person = fixture.contacts.find(p => p.id === 'parish-priest');
  person.photo = { position: 'top', variants: [400, 800].map(width => ({src: `assets/images/contacts/profiles/photo-12345678-1234-1234-1234-123456789abc-${width}.webp`, width, height: width, bytes: 1000})) };
  person.photoFraming = { zoom: 2, x: 25, y: 75 };
  const html = renderGeneralContacts(fixture);
  assert.match(html, /srcset="[^"]+400w, [^"]+800w/);
  assert.match(html, /sizes="176px"/);
  assert.match(html, /object-position:25% 75%;width:200%;height:200%;left:-25%;top:-75%/);
});
