const searchForm = document.querySelector('.search-form');
const searchInput = document.querySelector('#site-search');
const searchStatus = document.querySelector('#search-status');
const searchResults = document.querySelector('#search-results');
let searchIndex = [];

function normalizeSearchText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function excerptFor(content, terms) {
  const text = content.replace(/\s+/g, ' ').trim();
  if (!text) return '';
  const lower = normalizeSearchText(text);
  const phrasePosition = lower.indexOf(terms.join(' '));
  const positions = terms.flatMap(term => {
    const found = [];
    let cursor = 0;
    while ((cursor = lower.indexOf(term, cursor)) >= 0) {
      found.push(cursor);
      cursor += term.length;
    }
    return found;
  });
  if (!positions.length) return text.slice(0, 190) + (text.length > 190 ? '…' : '');
  const position = phrasePosition >= 0 ? phrasePosition : positions.reduce((best, candidate) => {
    const nearbyTerms = positions.filter(found => found >= candidate - 70 && found <= candidate + 140).length;
    const bestNearbyTerms = positions.filter(found => found >= best - 70 && found <= best + 140).length;
    return nearbyTerms > bestNearbyTerms ? candidate : best;
  }, positions[0]);
  const start = Math.max(0, position - 75);
  const end = Math.min(text.length, position + 135);
  return `${start ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

function renderSearch(query) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(term => term.length > 0);
  searchResults.replaceChildren();
  if (!terms.length) {
    searchStatus.textContent = searchIndex.length ? 'Enter a search term to see matching pages.' : '';
    return;
  }

  const matches = searchIndex.map(page => {
    const titleText = normalizeSearchText(`${page.title} ${page.documentTitle}`);
    const contentText = normalizeSearchText(`${page.description} ${page.content}`);
    const allText = `${titleText} ${contentText}`;
    if (!terms.every(term => allText.includes(term))) return null;
    const score = terms.reduce((sum, term) => sum + (titleText.includes(term) ? 5 : 0) + (contentText.includes(term) ? 1 : 0), 0);
    return { page, score, excerpt: excerptFor(`${page.description} ${page.content}`, terms) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));

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
    const response = await fetch('search-index.json');
    if (!response.ok) throw new Error(`Unable to load search index (${response.status})`);
    searchIndex = await response.json();
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
