/* Shared ranking and excerpts for inline and full-page search. No DOM or requests. */
(function(root){
'use strict';
if(root.churchSearch)return;
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

function findMatches(index,query) {
  if(!Array.isArray(index))throw new Error('Search data unavailable');
  const terms=normalizeSearchText(query).split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return index.map(page => {
    const titleText = normalizeSearchText(`${page.title} ${page.documentTitle}`);
    const contentText = normalizeSearchText(`${page.description} ${page.content}`);
    const allText = `${titleText} ${contentText}`;
    if (!terms.every(term => allText.includes(term))) return null;
    const score = terms.reduce((sum, term) => sum + (titleText.includes(term) ? 5 : 0) + (contentText.includes(term) ? 1 : 0), 0);
    return { page, score, excerpt: excerptFor(`${page.description} ${page.content}`, terms) };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title));
}
const pending=new Map();
function loadIndex(url){
 if(pending.has(url))return pending.get(url);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
 const promise=fetch(url,{cache:'no-cache',signal:controller.signal}).then(response=>{if(!response.ok)throw new Error('Search data unavailable');return response.json();}).then(index=>{if(!Array.isArray(index))throw new Error('Search data unavailable');return index;}).catch(error=>{pending.delete(url);throw error;}).finally(()=>clearTimeout(timer));
 pending.set(url,promise);return promise;
}
const model=Object.freeze({normalizeSearchText,excerptFor,findMatches,loadIndex});
if(typeof module==='object'&&module.exports)module.exports=model;else root.churchSearch=model;
})(globalThis);
