const fs = require('node:fs');
const path = require('node:path');
const model = require('./news-feed-model');
const magazine = require('./parish-magazine-render.cjs');
const e = model.esc;

const icons = {
  video: '<span class="parish-video-icon" aria-hidden="true">▶</span>',
  news: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h4v4H7zM14 8h3m-3 4h3M7 16h10"/></svg>',
  magazine: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6C9 3 5 3 2 5v14c3-2 7-2 10 1 3-3 7-3 10-1V5c-3-2-7-2-10 1Zm0 0v14"/></svg>',
  highlight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 5h8m-8 3h5"/></svg>'
};

function media(href, label, image, {video = false, fallback = ''} = {}) {
  const contents = image
    ? `<img src="${e(image.small || image.src)}" alt="" loading="lazy" decoding="async"><template>${fallback}</template>`
    : fallback;
  return `<a class="parish-card-media" href="${e(href)}" aria-label="${e(label)}"${video ? ' target="_blank" rel="noopener noreferrer"' : ''}>${contents}${video ? '<span class="parish-play" aria-hidden="true">▶</span>' : ''}</a>`;
}

function button(href, label, video = false) {
  return `<a class="magazine-button" href="${e(href)}"${video ? ' target="_blank" rel="noopener noreferrer"' : ''}>${e(label)} <span aria-hidden="true">›</span></a>`;
}

function card(icon, title, description, photo, actions, attributes = '') {
  return `<article class="parish-card"${attributes}>
    ${photo}
    <div class="parish-card-copy"><h3>${icons[icon]} ${e(title)}</h3><p>${e(description)}</p>${actions}</div>
  </article>`;
}

function render(feed, service = null) {
  const pews = model.select(feed, 'pews-news')[0];
  const story = model.select(feed, 'parish-story').find(item => item.id === 'story:we-will-remember-them');
  const serviceUrl = service ? 'https://www.youtube.com/watch?v=' + service.video.id : 'sunday-services.html';
  const serviceLabel = service ? 'Watch ' + service.video.title + ' on YouTube' : 'Browse Sunday services';
  const servicePhoto = media(serviceUrl, serviceLabel, service?.thumbnail && {src: service.thumbnail.path},
    {video: Boolean(service), fallback: '<div class="home-service-placeholder" aria-hidden="true">Parish services</div>'});
  const pewsUrl = pews?.url || 'pews-news.html';
  const pewsPhoto = media(pewsUrl, 'Read the latest Pews News', pews?.image, {fallback: model.placeholder()});
  const latest = magazine.latest;
  const fallback = card('highlight', 'Explore Our Church', 'Discover the history of St Michael & All Angels and its place in village life.',
    media('our-history.html', 'Explore our church history', {src: 'assets/images/home/hero-autumn-church-640.webp'}),
    button('our-history.html', 'Read the Full Story'), story ? ' data-parish-evergreen hidden' : '');

  return `<!-- home-news:start -->
<section class="from-our-parish" aria-labelledby="home-news-heading">
  <link rel="stylesheet" href="parish-magazine.css?v=modern-classic-1">
  <div class="parish-section-inner">
    <h2 id="home-news-heading">From Our Parish</h2>
    <p class="parish-section-intro">Latest services, Pews News, our parish magazine and highlights from our church community.</p>
    <div class="parish-card-grid">
      ${card('video', 'Latest Service', 'Watch the most recent church service on our YouTube channel.', servicePhoto, button(serviceUrl, service ? 'Watch on YouTube' : serviceLabel, Boolean(service)))}
      ${card('news', 'Pews News', 'The latest weekly news, readings and notices from our parish.', pewsPhoto, button(pewsUrl, 'Read the Latest Edition'))}
      ${card('magazine', 'Parish Magazine', 'Read the latest monthly magazine or browse our archive of past editions.',
        magazine.coverLink(latest, 'parish-card-media parish-card-cover'),
        magazine.trigger(latest, 'Read the ' + latest.name + ' Edition', 'magazine-button') +
        `<a class="magazine-text-link" href="${magazine.archive}#previous-editions">View Previous Editions <span aria-hidden="true">›</span></a>`)}
      ${story ? card('highlight', 'Remembrance Sunday', 'A time to remember and give thanks for the service and sacrifice of others.',
        media(story.url, 'Read We Will Remember Them', story.image, {fallback: model.placeholder('parish-story')}),
        button(story.url, 'Read the Full Story'), ' data-parish-expiry="2026-12-01"') : ''}
      ${fallback}
    </div>
  </div>
  ${magazine.reader()}
</section>
<!-- home-news:end -->`;
}

function build(root = __dirname) {
  const file = path.join(root, 'index.html');
  const feed = JSON.parse(fs.readFileSync(path.join(root, 'news-feed.json'), 'utf8'));
  const html = fs.readFileSync(file, 'utf8');
  const section = /<!-- home-news:start -->[\s\S]*?<!-- home-news:end -->/;
  if (!section.test(html)) throw Error('Missing Home news markers');
  const newline = html.includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(file, html.replace(section, () => render(feed, readService(root)).replace(/\n/g, newline)));
}

function readService(root = __dirname) {
  try {
    const serviceModel = require('./azure-function/src/sunday-service-model');
    const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
    return serviceModel.validCache(read('sunday-service.json'), read('youtube-sunday-source.json'));
  } catch {
    return null;
  }
}

module.exports = {render, build, readService};
if (require.main === module) build();
