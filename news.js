const featuredContainer = document.querySelector('#news-featured');
const featuredSection = document.querySelector('.news-featured');
const articlesContainer = document.querySelector('#news-articles');
const categoryFilter = document.querySelector('#news-category');
const status = document.querySelector('#news-status');
let articles = [];

function makeArticleCard(article, featured = false) {
  const card = document.createElement('article');
  card.className = featured ? 'news-feature-card' : 'news-article-card';
  const category = document.createElement('p');
  category.className = 'eyebrow';
  category.textContent = article.category;
  const heading = document.createElement(featured ? 'h3' : 'h3');
  const titleLink = document.createElement('a');
  titleLink.href = `news/${article.slug}.html`;
  titleLink.textContent = article.title;
  heading.append(titleLink);
  const date = document.createElement('p');
  date.className = 'sample-date';
  date.textContent = article.dateLabel;
  const excerpt = document.createElement('p');
  excerpt.className = 'news-excerpt';
  excerpt.textContent = article.excerpt;
  const readMore = document.createElement('a');
  readMore.className = 'inline-link news-read-more';
  readMore.href = `news/${article.slug}.html`;
  readMore.append(document.createTextNode('Read more '));
  const arrow = document.createElement('span');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '→';
  readMore.append(arrow);
  card.append(category, heading, date, excerpt, readMore);
  return card;
}

function renderArticles() {
  const selected = categoryFilter.value;
  const visible = articles.filter(article => selected === 'all' || article.category === selected);
  featuredSection.hidden = selected !== 'all';
  articlesContainer.replaceChildren();
  visible.forEach(article => articlesContainer.append(makeArticleCard(article)));
  status.textContent = `${visible.length} ${visible.length === 1 ? 'article' : 'articles'} shown.`;
  if (!visible.length) {
    const empty = document.createElement('p');
    empty.className = 'calendar-empty';
    empty.textContent = 'There are no published articles in this category.';
    articlesContainer.append(empty);
  }
}

async function initializeNews() {
  try {
    const response = await fetch('news-data.json');
    if (!response.ok) throw new Error(`Unable to load articles (${response.status})`);
    const data = await response.json();
    articles = (data.articles || []).filter(article => (article.status || 'published') === 'published');
    const categories = [...new Set(articles.map(article => article.category))].sort((a, b) => a.localeCompare(b));
    categories.forEach(category => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilter.append(option);
    });
    const featured = articles.find(article => article.featured);
    featuredContainer.replaceChildren(...(featured ? [makeArticleCard(featured, true)] : []));
    categoryFilter.addEventListener('change', renderArticles);
    renderArticles();
  } catch (error) {
    console.error(error);
    featuredContainer.textContent = 'Parish news is temporarily unavailable.';
    articlesContainer.textContent = 'Please try again later.';
    status.textContent = 'Parish news could not be loaded.';
  }
}

initializeNews();
