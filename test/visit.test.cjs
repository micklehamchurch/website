const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'visit.html'),'utf8'),css=fs.readFileSync(path.join(root,'visit.css'),'utf8');
test('visitor jumps resolve to accessible sections and preserve old Find Us anchor',()=>{
  for(const id of ['first-visit','finding-us','church-guide','history','walking','getting-here','westhumble']){assert.match(html,new RegExp('href="#'+id+'"'));assert.match(html,new RegExp('id="'+id+'" tabindex="-1"'));}
  assert.equal((html.match(/<h1\b/g)||[]).length,1);assert.match(css,/scroll-margin-top:/); // browser script checks actual sticky-header clearance
});
test('visitor images are real supplied photographs without artificial map or shading',()=>{
  assert.doesNotMatch(html,/assets\/demo|placeholder|<iframe|data-footer-compact/);assert.doesNotMatch(css,/filter\s*:|blend-mode\s*:/);assert.match(css,/linear-gradient\(to right, var\(--paper\), #fffdf800\)/);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'assets/images/visit/westhumble-chapel.jpg'))).digest('hex'),'df4ae4e3bd6d7e65c8688781014351e6f4c2cecf15b2fc3a951adfcaaa16ca4c');
  for(const src of [...html.matchAll(/(?:src|srcset)="(assets\/images\/visit\/[^" ,]+)/g)].map(m=>m[1]))assert(fs.existsSync(path.join(root,src.split("?")[0])));
});
test('visitor links retain parish destinations and safely open official external sources',()=>{
  for(const link of html.matchAll(/<a\b[^>]*href="(https:[^"]+)"[^>]*>/g)){assert.match(link[0],/target="_blank"/);assert.match(link[0],/rel="noopener noreferrer"/);}
  for(const href of ['what-to-expect.html','church-building.html','our-history.html','westhumble-chapel.html','calendar.html','contact.html'])assert.match(html,new RegExp('href="'+href+'"'));
  assert.match(html,/maps\/dir\/\?api=1&amp;origin=.*&amp;destination=.*&amp;travelmode=walking/);assert.match(html,/tfl\.gov\.uk\/bus\/route\/465\//);assert.doesNotMatch(html,/\b425\b/);
  assert.match(fs.readFileSync(path.join(root,'index.html'),'utf8'),/href="visit.html">Plan your visit/);
});

// Preserve the approved practical travel wording while changing its presentation.
const approvedTravel=[
  "For Mickleham church, use Old London Road, RH5 6DU. For the Chapel of Ease, use the Westhumble location above, RH5 6BG.",
  "Please contact the parish to confirm parking or access arrangements rather than assuming on-site facilities.",
  "Box Hill &amp; Westhumble station is on Westhumble Street in Westhumble. For the chapel, plan your onward journey within Westhumble; for Mickleham church, allow for a separate onward walk or connection.",
  "The 465 links Kingston, Surbiton, Leatherhead and Dorking and serves the Mickleham Church stop. It also serves Westhumble Street; for the Chapel of Ease, check your onward route from that stop to the chapel.",
  "Plan a walking route to the church or chapel using the location links above. If you’re combining a visit with Box Hill, follow the National Trust’s route advice and allow for the terrain."
];
test("compact travel disclosure retains every approved travel paragraph",()=>{assert.match(html,/<details class="visit-travel-details">/);assert.match(html,/<summary id="travel-information">/);for(const paragraph of approvedTravel)assert(html.includes(paragraph));assert.doesNotMatch(html,/<details[^>]*\bopen\b/);});

test('desktop visitor hero uses a full-width natural photograph and left cream fade',()=>{assert.match(css,/aspect-ratio: 16 \/ 9/);assert.match(css,/top: 0; right: 0; width: 100%; height: 100%; aspect-ratio: auto/);assert.match(css,/object-position: 50% 37%/);assert.match(css,/rgba\(255, 253, 248, 0\) 45%/);assert.match(html,/sizes="100vw"/);});
