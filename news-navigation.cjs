
const destinations = [
  {id: 'all', label: 'All news', href: 'news.html?type=all#news-feed'},
  {id: 'pews-news', label: 'Pews News', href: 'news.html?type=pews-news#news-feed', icon: 'paper'},
  {id: 'parish-magazine', label: 'Parish Magazine', href: 'parish-magazine.html', icon: 'book'},
  {id: 'parish-story', label: 'Parish stories', href: 'news.html?type=parish-story#news-feed', icon: 'heart'}
];
const paths = {
  paper: '<path d="M3 5h14v15H5a2 2 0 0 1-2-2zM17 8h4v10a2 2 0 0 1-2 2h-2M6 9h8M6 13h8M6 17h5"/>',
  book: '<path d="M12 5C9 3 6 3 3 5v14c3-2 6-2 9 0 3-2 6-2 9 0V5c-3-2-6-2-9 0zm0 0v14"/>',
  heart: '<path d="M20.8 5.5a5 5 0 0 0-7.1 0L12 7.2l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l7.1-6.7 1.7-1.7a5 5 0 0 0 0-7.1z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'
};
const icon = name => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
function newsNavigation(active = 'all') {
  const links = destinations.map(({id, label, href, icon: glyph}) => {
    const filter = active !== 'parish-magazine' && id !== 'parish-magazine' ? ` data-news-filter="${id}"` : '';
    const legacyAnchor = active === 'all' && id === 'parish-magazine' ? ' id="latest-parish-magazine"' : '';
    const current = id === active ? ' aria-current="page"' : '';
    return `<a href="${href}"${filter}${current}${legacyAnchor}>${glyph ? icon(glyph)+' ' : ''}${label}</a>`;
  });
  return `<nav class="news-hub-nav" aria-label="Browse news"><h2>News</h2><div>${links.join('')}</div></nav>`;
}
module.exports = {icon, newsNavigation};
