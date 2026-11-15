(() => {
'use strict';

const feature = document.querySelector('[data-parish-expiry]');
if (feature) {
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone: 'Europe/London'}).format(new Date());
  if (today >= feature.dataset.parishExpiry) {
    feature.hidden = true;
    document.querySelector('[data-parish-evergreen]').hidden = false;
  }
}
for (const image of document.querySelectorAll('.parish-card-media img')) {
  const restore = () => {
    const fallback = image.parentElement.querySelector('template');
    if (fallback) image.replaceWith(fallback.content.cloneNode(true));
  };
  if (image.complete && !image.naturalWidth) restore();
  else image.addEventListener('error', restore, {once: true});
}

const reader = document.getElementById('magazine-reader');
if (!reader || typeof reader.showModal !== 'function') return;
const el = id => reader.querySelector('#magazine-' + id);
const editions = JSON.parse(el('editions-data').textContent);
const read = (edition, page) => '#magazine/' + edition.id + (page ? '/' + page : '');
const viewer = reader.querySelector('.magazine-viewer');
const stage = el('stage');
const sheet = el('sheet');
const pageFrame = el('reader-page');
const pages = el('page');
const editionsMenu = el('edition');
const fit = el('fit');
for (const edition of editions) editionsMenu.add(new Option(edition.name, edition.id));

let edition = editions[0];
let readerPages = [];
let currentPage = 1;
let zoom = 100;
let origin = null;

function makeReaderPages(selected) {
  const views = [];
  for (let source = 1; source <= selected.sheets; source++) {
    const wholeLabel = selected.wholePages[source];
    if (wholeLabel) {
      views.push({source, fraction: 1, offset: 0, label: wholeLabel});
    } else {
      views.push({source, fraction: 0.5, offset: 0, label: selected.leftLabels[source]});
      views.push({source, fraction: 0.5, offset: 0.5, label: selected.rightLabels[source]});
    }
  }
  return views;
}
function resizePage() {
  if (!reader.open || !sheet.naturalWidth || sheet.hidden) return;
  const style = getComputedStyle(stage);
  const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  const page = readerPages[currentPage - 1];
  const ratio = sheet.naturalWidth * page.fraction / sheet.naturalHeight;
  const fitted = fit.value === 'width' ? width : Math.min(width, height * ratio);
  const displayWidth = Math.max(1, Math.floor(fitted * zoom / 100));
  pageFrame.style.width = displayWidth + 'px';
  pageFrame.style.height = displayWidth / ratio + 'px';
  pageFrame.style.marginTop = Math.max(0, Math.floor((height - displayWidth / ratio) / 2)) + 'px';
  sheet.style.width = displayWidth / page.fraction + 'px';
  sheet.style.left = -page.offset * displayWidth / page.fraction + 'px';
  stage.classList.toggle('pannable', displayWidth > width);
}

function showPage() {
  const page = readerPages[currentPage - 1];
  const padded = String(page.source).padStart(2, '0');
  sheet.alt = [edition.name, 'reader page ' + currentPage, page.label].filter(Boolean).join(', ');
  const src = edition.images + '/sheet-' + padded + '.jpg';
  if (sheet.getAttribute('src') !== src) {
    sheet.hidden = true;
    pageFrame.hidden = true;
    el('image-error').hidden = true;
    sheet.src = src;
  }
  pages.value = String(currentPage);
  el('announce').textContent = sheet.alt + ' of ' + readerPages.length;
  el('prev').disabled = currentPage <= 1;
  el('next').disabled = currentPage >= readerPages.length;
  stage.scrollTo(0, 0);
  resizePage();
}

function setEdition(selected, page = 1) {
  edition = selected;
  readerPages = makeReaderPages(edition);
  currentPage = Math.min(readerPages.length, Math.max(1, page));
  editionsMenu.value = edition.id;
  el('download').href = edition.pdf;
  el('download').download = edition.pdf.split('/').at(-1);
  pages.replaceChildren(...readerPages.map(({label}, index) => {
    const number = index + 1;
    return new Option('Page ' + number + (label ? ' · ' + label : ''), String(number));
  }));
  el('total').textContent = 'of ' + readerPages.length;
  showPage();
}

function showReader(selected, page) {
  if (!reader.open) {
    zoom = 100;
    fit.value = 'height';
    updateZoom();
    reader.showModal();
    el('close').focus({preventScroll: true});
  }
  setEdition(selected, page);
}

function hideReader() {
  if (!reader.open) return;
  leaveFullscreen();
  reader.close();
  if (origin) {
    origin.trigger?.focus({preventScroll: true});
    window.scrollTo(0, origin.scrollY);
  }
  origin = null;
}

function route() {
  const match = /^#magazine\/(\d{4}-\d{2})(?:\/(\d+))?$/.exec(location.hash);
  const selected = match && editions.find(item => item.id === match[1]);
  if (selected) {
    showReader(selected, Number(match[2] || 1));
    return;
  }
  hideReader();
}
function closeReader() {
  if (history.state?.magazineReader) {
    history.back();
    return;
  }
  history.replaceState(null, '', location.pathname + location.search);
  hideReader();
}

function turnTo(number) {
  if (number < 1 || number > readerPages.length || number === currentPage) return;
  currentPage = number;
  history.replaceState(history.state, '', read(edition, currentPage));
  showPage();
}

function updateZoom() {
  el('reset').textContent = zoom + '%';
  el('reset').setAttribute('aria-label', zoom + '% zoom · Reset zoom');
  el('minus').disabled = zoom === 100;
  el('plus').disabled = zoom === 300;
}

function setZoom(next) {
  const factor = next / zoom;
  const left = (stage.scrollLeft + stage.clientWidth / 2) * factor - stage.clientWidth / 2;
  const top = (stage.scrollTop + stage.clientHeight / 2) * factor - stage.clientHeight / 2;
  zoom = next;
  updateZoom();
  resizePage();
  stage.scrollTo(next === 100 ? 0 : left, next === 100 ? 0 : top);
}

function syncFullscreen() {
  const active = document.fullscreenElement === viewer || reader.classList.contains('expanded');
  const label = active ? 'Exit fullscreen' : 'Fullscreen';
  el('full').setAttribute('aria-pressed', String(active));
  el('full').setAttribute('aria-label', label);
  el('full').querySelector('span').textContent = label;
}

function leaveFullscreen() {
  if (document.fullscreenElement === viewer) document.exitFullscreen().catch(() => {});
  reader.classList.remove('expanded');
  syncFullscreen();
}

el('full').onclick = async () => {
  if (document.fullscreenElement === viewer || reader.classList.contains('expanded')) {
    leaveFullscreen();
    return;
  }
  try {
    await viewer.requestFullscreen();
  } catch {
    reader.classList.add('expanded');
  }
  syncFullscreen();
};
document.addEventListener('fullscreenchange', syncFullscreen);
el('close').onclick = closeReader;
reader.addEventListener('cancel', event => {
  event.preventDefault();
  if (reader.classList.contains('expanded')) leaveFullscreen();
  else closeReader();
});
document.addEventListener('click', event => {
  const trigger = event.target.closest('a[data-magazine-edition]');
  if (!trigger || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
  event.preventDefault();
  origin = {trigger, scrollY: window.scrollY};
  history.pushState({magazineReader: true}, '', read(editions.find(item => item.id === trigger.dataset.magazineEdition)));
  route();
});
window.addEventListener('popstate', route);
window.addEventListener('hashchange', () => {
  const routeEdition = read(edition, currentPage);
  if (reader.open && (location.hash === routeEdition || (currentPage === 1 && location.hash === read(edition)))) return;
  route();
});
editionsMenu.onchange = () => {
  const next = editions.find(item => item.id === editionsMenu.value);
  history.replaceState(history.state, '', read(next));
  setEdition(next);
};
pages.onchange = () => turnTo(Number(pages.value));
el('prev').onclick = () => turnTo(currentPage - 1);
el('next').onclick = () => turnTo(currentPage + 1);
fit.onchange = () => setZoom(100);
el('minus').onclick = () => setZoom(Math.max(100, zoom - 25));
el('plus').onclick = () => setZoom(Math.min(300, zoom + 25));
el('reset').onclick = () => setZoom(100);

reader.addEventListener('keydown', event => {
  if (event.ctrlKey || event.altKey || event.metaKey || event.target.closest('select,input')) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  if (stage.classList.contains('pannable') && event.target === stage) return;
  event.preventDefault();
  turnTo(currentPage + (event.key === 'ArrowLeft' ? -1 : 1));
});

let touch;
stage.addEventListener('touchstart', event => {
  touch = event.touches.length === 1 ? event.touches[0] : null;
}, {passive: true});
stage.addEventListener('touchcancel', () => { touch = null; });
stage.addEventListener('touchend', event => {
  const start = touch;
  touch = null;
  if (!start || zoom > 100 || event.touches.length) return;
  const end = event.changedTouches[0];
  const x = end.clientX - start.clientX;
  const y = end.clientY - start.clientY;
  if (Math.abs(x) > 50 && Math.abs(x) > Math.abs(y) * 1.5) turnTo(currentPage + (x < 0 ? 1 : -1));
}, {passive: true});

sheet.addEventListener('load', () => {
  sheet.hidden = false;
  pageFrame.hidden = false;
  resizePage();
});
sheet.addEventListener('error', () => {
  sheet.hidden = true;
  el('image-error').hidden = false;
});
new ResizeObserver(resizePage).observe(stage);

route();
})();
