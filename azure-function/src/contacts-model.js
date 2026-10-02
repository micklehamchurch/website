const SECTION_IDS = Object.freeze(['parish-leadership', 'parish-office-pcc', 'worship-life-events', 'pastoral-care-safeguarding', 'parish-life-communications', 'pcc-members']);
const MAX_CONTACTS_BYTES = 256 * 1024;
const slug = value => typeof value === 'string' && value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
function keys(value, required, optional = []) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || required.some(key => !Object.hasOwn(value, key)) || Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) throw new Error('invalid-schema');
}
function text(value, limit, empty = false) {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim()) || /[<>\u0000-\u001f\u007f]/.test(value)) throw new Error('invalid-text');
}
function validateContacts(data) {
  keys(data, ['sections', 'contacts', 'pccMembers']);
  if (!Array.isArray(data.sections) || data.sections.length !== SECTION_IDS.length || !Array.isArray(data.contacts) || !Array.isArray(data.pccMembers) || data.contacts.length > 500 || data.pccMembers.length > 500) throw new Error('invalid-collections');
  const sectionIds = new Set();
  for (const section of data.sections) {
    keys(section, ['id', 'title', 'eyebrow']);
    if (!SECTION_IDS.includes(section.id) || sectionIds.has(section.id)) throw new Error('invalid-section');
    sectionIds.add(section.id); text(section.title, 120); text(section.eyebrow, 160);
  }
  const ids = new Set();
  for (const [records, pcc] of [[data.contacts, false], [data.pccMembers, true]]) for (const record of records) {
    keys(record, pcc ? ['id', 'name', 'status'] : ['id', 'section', 'role', 'name', 'status'], pcc ? ['photo'] : ['phone', 'email', 'groupId', 'photo']);
    if (!slug(record.id) || ids.has(record.id) || !['published', 'draft'].includes(record.status)) throw new Error('invalid-identity');
    ids.add(record.id); text(record.name, 180);
    if (!pcc) {
      text(record.role, 180);
      if (!sectionIds.has(record.section) || record.section === 'pcc-members') throw new Error('invalid-section');
      if (record.email !== undefined) { text(record.email, 254, true); if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) throw new Error('invalid-email'); }
      if (record.phone !== undefined) { text(record.phone, 60, true); if (record.phone && (!/^[+0-9().\s-]+$/.test(record.phone) || record.phone.replace(/\D/g, '').length < 7 || record.phone.replace(/\D/g, '').length > 20)) throw new Error('invalid-phone'); }
      if (record.groupId !== undefined && !slug(record.groupId)) throw new Error('invalid-group');
    }
    // Reserved optional asset reference only; no photo rendering or upload is enabled.
    if (record.photo !== undefined && (typeof record.photo !== 'string' || (record.photo !== '' && !/^assets\/images\/contacts\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/.test(record.photo)))) throw new Error('invalid-photo');
  }
  if (Buffer.byteLength(JSON.stringify(data)) > MAX_CONTACTS_BYTES) throw new RangeError('contacts-too-large');
  return data;
}
module.exports = { validateContacts, MAX_CONTACTS_BYTES, SECTION_IDS };
