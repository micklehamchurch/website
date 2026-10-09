// Replace version keys rather than appending them, including legacy duplicates.
function versionPublicScript(url, versions) {
  const [withoutHash, ...hash] = url.split('#');
  const question = withoutHash.indexOf('?');
  const pathname = question < 0 ? withoutHash : withoutHash.slice(0, question);
  const query = new URLSearchParams(question < 0 ? '' : withoutHash.slice(question + 1).replace(/&amp;/g, '&'));
  for (const [key, value] of Object.entries(versions)) query.set(key, value);
  return `${pathname}?${query}${hash.length ? '#' + hash.join('#') : ''}`;
}
module.exports = { versionPublicScript };
