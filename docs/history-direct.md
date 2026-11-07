# Direct History discovery cards

Baseline Dev:66e225111fe50b149015412bb3f57b626019ce39.

Only the main Our History collection section changes. It now links directly to four genuine pages rather than asking visitors to choose categories. Existing collections remain generated, indexed and usable from other stories. The timeline and clergy feature retain their exact markup, ordering, imagery and links; Philippa's article and all entry data remain unchanged.

Add or reorder an item in _content/history.json landingStories. Each item references an existing entryId (published generated article or retained page) or collectionId (retained direct page and image). Display title, concise description, CTA, order, status and image focal point are explicit metadata. This separate landing list does not alter the entry biography or collection architecture. Draft placements/entries and planned targets do not appear. Unknown IDs and missing retained destinations fail validation. No filters or placeholders are rendered. Entries without a suitable genuine image use a plain ivory area, never a fabricated historical photograph.

Current inventory:
- Philippa Walton → history-entry-philippa-walton.html. Existing authentic memorial WebPs: assets/images/history/philippa-walton-memorial-{480,1200}.webp. Eighteenth-century wording follows her verified article, rather than the mock-up's incorrect seventeenth-century description.
- The Church Building → church-building.html. Existing genuine assets/images/about/church-card.webp (720×405) and church-hero.webp (1600×899).
- Mickleham War Memorial → war-memorial.html. Existing genuine assets/images/history/war-memorial-480.webp and assets/images/war-memorial/memorial.webp (1200×1600).
- The Churchyard → churchyard.html. Existing genuine assets/images/albums/st-michaels-church-churchyard/st-michaels-church-churchyard-03-{480,960}.webp.

Four columns above1100px fit the established1280px content width; two columns at1100px and below; one at760px and below. Short landscape up to1000px wide and500px high uses two columns with120px images. Ordinary phone images are170px high. Desktop images reserve8:5 geometry, tablet images cap at220px. Cards reuse the ivory, green, serif and gold styling, with subtle borders and no animation or strong shadow. Whole-card links are keyboard accessible; the CTA reserves at least44px height. Responsive source sets, lazy loading, async decode and explicit image dimensions are reused. No new images, fonts, browser scripts or dependencies.

Only the landing page stylesheet query changes; the shared template and the published article remain untouched. The extra CSS is scoped to the new landing grid. The content workflow includes the new test/document paths in its scoped History build, avoiding unrelated Home/date-sensitive rebuilds.
