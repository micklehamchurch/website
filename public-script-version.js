// Replace version keys rather than appending them, including legacy duplicates.
function versionPublicScript(url, versions) {
  const [withoutHash, ...hash] = url.split('#');
  const question = withoutHash.indexOf('?');
  const pathname = question < 0 ? withoutHash : withoutHash.slice(0, question);
  const query = new URLSearchParams(question < 0 ? '' : withoutHash.slice(question + 1).replace(/&amp;/g, '&'));
  for (const [key, value] of Object.entries(versions)) query.set(key, value);
  return `${pathname}?${query}${hash.length ? '#' + hash.join('#') : ''}`;
}
function versionSiteScript(url, page) {
  const versions = {
    typography: '20261007-v1', header: '20261106-racial-justice-1', gallery: '20261009-v1',
    footer: '20261027-layout-1', feedback: '20261019-public-wording-1'
  };
  if (page !== 'index.html') {
    versions.headerPhoto = /^pews-news(?:\.html|\/)/.test(page) ? '20261024-pews-1'
      : page === 'news.html' ? '20261024-newshub-1' : '20261024-4';
  }
  return versionPublicScript(url, versions);
}

module.exports = { versionPublicScript, versionSiteScript };
