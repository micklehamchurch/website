const searchForm = document.querySelector('.search-form');
const searchInput = document.querySelector('#site-search');
const searchStatus = document.querySelector('#search-status');
const searchResults = document.querySelector('#search-results');
let searchIndex = [];

const {normalizeSearchText,findMatches}=globalThis.churchSearch||{};

function renderSearch(query) {
  if(!findMatches){searchStatus.textContent='Search is temporarily unavailable. Please use the navigation to browse the site.';return;}
  const terms = normalizeSearchText(query).split(/\s+/).filter(term => term.length > 0);
  searchResults.replaceChildren();
  if (!terms.length) {
    searchStatus.textContent = searchIndex.length ? 'Enter a search term to see matching pages.' : '';
    return;
  }

  const matches = findMatches(searchIndex,query);

  searchStatus.textContent = matches.length ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'} for “${query.trim()}”.` : `No pages found for “${query.trim()}”. Try different words.`;
  const fragment = document.createDocumentFragment();
  matches.forEach(({ page, excerpt }) => {
    const article = document.createElement('article');
    article.className = 'search-result';
    const heading = document.createElement('h2');
    const link = document.createElement('a');
    link.href = page.url;
    link.textContent = page.title;
    heading.append(link);
    const summary = document.createElement('p');
    summary.textContent = excerpt;
    article.append(heading, summary);
    fragment.append(article);
  });
  searchResults.append(fragment);
}

async function initializeSearch() {
  searchInput.value = new URLSearchParams(location.search).get('q') || '';
  try {
    searchIndex = await globalThis.churchSearch.loadIndex(new URL('search-index.json',document.baseURI).href);
    renderSearch(searchInput.value);
  } catch (error) {
    console.error(error);
    searchStatus.textContent = 'Search is temporarily unavailable. Please use the navigation to browse the site.';
  }
}

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  const url = new URL(location.href);
  if (query) url.searchParams.set('q', query);
  else url.searchParams.delete('q');
  history.replaceState(null, '', url);
  renderSearch(query);
});
searchForm.addEventListener('submit', event => {
  event.preventDefault();
  renderSearch(searchInput.value);
});
initializeSearch();
