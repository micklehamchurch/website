/* Pure pagination and location metadata helpers. Never stores Scripture text. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.BiblePagesModel = model;
})(typeof window === 'object' ? window : globalThis, () => {
  'use strict';
  const keys = { last: 'mickleham:bible:last:v1', bookmark: 'mickleham:bible:bookmark:v1' };
  const chapterCounts = Object.fromEntries('GEN:50 EXO:40 LEV:27 NUM:36 DEU:34 JOS:24 JDG:21 RUT:4 1SA:31 2SA:24 1KI:22 2KI:25 1CH:29 2CH:36 EZR:10 NEH:13 EST:10 JOB:42 PSA:150 PRO:31 ECC:12 SNG:8 ISA:66 JER:52 LAM:5 EZK:48 DAN:12 HOS:14 JOL:3 AMO:9 OBA:1 JON:4 MIC:7 NAM:3 HAB:3 ZEP:3 HAG:2 ZEC:14 MAL:4 MAT:28 MRK:16 LUK:24 JHN:21 ACT:28 ROM:16 1CO:16 2CO:13 GAL:6 EPH:6 PHP:4 COL:4 1TH:5 2TH:3 1TI:6 2TI:4 TIT:3 PHM:1 HEB:13 JAS:5 1PE:5 2PE:3 1JN:5 2JN:1 3JN:1 JUD:1 REV:22'.split(' ').map(pair => { const [id, count] = pair.split(':'); return [id, Number(count)]; }));
  const books = new Set(Object.keys(chapterCounts));
  function valid(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || value.v !== 1 || !['niv', 'nirv'].includes(value.translation)) return null;
    if (typeof value.chapter !== 'string' || !books.has(value.book) || !new RegExp('^' + value.book + '\\.[1-9][0-9]{0,2}$').test(value.chapter)) return null;
    if (Number(value.chapter.split('.')[1]) > chapterCounts[value.book]) return null;
    if (!Number.isInteger(value.page) || value.page < 0 || value.page > 20000 || !Number.isInteger(value.offset) || value.offset < 0 || value.offset > 1000000) return null;
    if (typeof value.reference !== 'string' || !value.reference.trim() || value.reference.length > 80 || /[\x00-\x1f]/.test(value.reference)) return null;
    return { v: 1, translation: value.translation, book: value.book, chapter: value.chapter, reference: value.reference, page: value.page, offset: value.offset };
  }
  function read(storage, kind) {
    try { const raw = storage.getItem(keys[kind]); return raw && raw.length < 2048 ? valid(JSON.parse(raw)) : null; } catch { return null; }
  }
  function save(storage, kind, value) {
    const location = valid(value);
    if (!location) return false;
    try { storage.setItem(keys[kind], JSON.stringify(location)); return true; } catch { return false; }
  }
  function remove(storage, kind) {
    try { storage.removeItem(keys[kind]); return true; } catch { return false; }
  }
  function bookmarkPage(bookmark, location, pages) {
    if (!bookmark || !location || bookmark.translation !== location.translation || bookmark.chapter !== location.chapter) return -1;
    return pageForOffset(pages, bookmark.offset);
  }
  function adjacentChapter(chapter, direction, availableBooks = Object.keys(chapterCounts)) {
    if (typeof chapter !== 'string' || !/^[A-Z0-9]{3}\.[1-9][0-9]{0,2}$/.test(chapter) || ![-1, 1].includes(direction)) return null;
    const [book, number] = chapter.split('.'), n = Number(number), order = Object.keys(chapterCounts);
    if (!Number.isInteger(n) || n < 1 || n > chapterCounts[book] || !order.includes(book) || !availableBooks.includes(book)) return null;
    if (n + direction >= 1 && n + direction <= chapterCounts[book]) return `${book}.${n + direction}`;
    const nextBook = order[order.indexOf(book) + direction];
    return nextBook && availableBooks.includes(nextBook) ? `${nextBook}.${direction > 0 ? 1 : chapterCounts[nextBook]}` : null;
  }
  function paginate(units, fits) {
    const pages = [];
    for (let start = 0; start < units.length;) {
      let low = start + 1, high = Math.min(units.length, start + 32), end = low;
      // Bound probes near one page rather than rebuilding half a long chapter.
      while (high < units.length && fits(start, high)) { low = high; high = Math.min(units.length, start + (high - start) * 2); }
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        if (fits(start, mid)) { end = mid; low = mid + 1; } else high = mid - 1;
      }
      // Keep a verse marker with its following word whenever possible.
      if (end > start + 1 && units[end - 1]?.verse) end--;
      pages.push({ start, end }); start = end;
    }
    return pages.length ? pages : [{ start: 0, end: 0 }];
  }
  function pageForOffset(pages, offset) {
    const index = pages.findIndex(p => offset >= p.start && offset < p.end);
    return index < 0 ? pages.length - 1 : index;
  }
  function turn(index, direction, columns, count) {
    return Math.min(Math.floor((count - 1) / columns) * columns, Math.max(0, index + direction * columns));
  }
  function keyDirection(event, editable) {
    if (editable || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return 0;
    return event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
  }
  function swipeDirection(start, end, selected = false) {
    if (!start || !end || selected || end.at - start.at > 1000) return 0;
    const dx = end.x - start.x, dy = end.y - start.y;
    return Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8 ? (dx < 0 ? 1 : -1) : 0;
  }
  function layoutColumns(width, height, fontSize = 20) {
    return width >= 900 && height >= 560 && width / 2 - 96 >= fontSize * 17 ? 2 : 1;
  }
  function tapDirection(start, end, bounds, blocked = false) {
    if (!start || !end || !bounds || blocked || end.at - start.at > 350 || end.at < start.at) return 0;
    if (Math.abs(end.x - start.x) > 10 || Math.abs(end.y - start.y) > 10) return 0;
    const edge = Math.min(30, bounds.width * .08);
    const zone = p => p.y < bounds.top || p.y > bounds.bottom || p.x < bounds.left || p.x > bounds.right ? 0 : p.x <= bounds.left + edge ? -1 : p.x >= bounds.right - edge ? 1 : 0;
    return zone(start) === zone(end) ? zone(end) : 0;
  }
  return { keys, valid, read, save, remove, bookmarkPage, adjacentChapter, paginate, pageForOffset, turn, keyDirection, swipeDirection, layoutColumns, tapDirection };
});
