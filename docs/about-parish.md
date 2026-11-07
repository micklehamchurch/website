# About our parish redesign — 15 October 2026

about.html is the handwritten source page. It has no generated-topic-page marker and is not an entry in content-pages.json. The normal content builder leaves it intact; the typography builder only maintains its existing shared script hooks, and the search builder indexes the source. No new content pipeline or duplicate editorial data was introduced.

## Design and content
The supplied mockup determines the green/photo hero, two-column welcome and vision section, four equal photographic cards and separate shared footer. The institutional relationships and introductory wording come from the previous About source. The vision is the supplied existing parish vision, with “love” lowercased as requested. No new historical/organisational facts are added.

The old lower card grids and Come and visit section are removed from this landing page. Their destination pages are retained, including the global History link. Footer markup remains the existing shared site.js component outside main. Only About-scoped styling compacts its desktop presentation, with at least 32px desktop footer text links and 44px main action targets; tablet/mobile retain the shared footer's touch layout.

about-parish.js and CSS hide the temporary typography controls on the normal About URL. /about.html?design-preview=1 restores them for Dev reviewers, using the same preference storage, fonts and controls. No global preview workflow or other page is changed.

## Genuine photographs
The administrator's attachments map to the names in the brief as follows:
- download.jpg: codex-clipboard-93961bed-7efe-43cf-b55e-3f4952951672.jpg. Hero and Our Churches card.
- 5WhatsApp Image 2026-10-04 at 16.25.47(1).jpeg: codex-clipboard-533733b3-edc3-4f61-bd9a-dadc1416295c.jpg. Worship and Services.
- IMG_6528.JPG: codex-clipboard-b1da6362-2435-4a09-ad3e-5f9b85ebdce9.jpg. Our Parish.
- IMG_E6554.JPG: codex-clipboard-a4afef26-ec45-4f52-b999-f1ca2c6018eb.jpg. Our Community, showing the Mary Munday sign.
The additional porch photograph is not used because the specified four cards already have their assigned photographs.

Original → WebP (quality 85, proportional resize, no upscaling, metadata stripped):
- Church: 2048 × 1151, 814,016 bytes → hero 1600 × 899, 311,782 bytes; card 720 × 405, 66,282 bytes.
- Worship: 2048 × 1536, 937,756 bytes → 720 × 540, 104,694 bytes.
- Churchyard: 1536 × 2048, 1,330,109 bytes → 720 × 960, 193,786 bytes.
- Community: 1152 × 2048, 878,981 bytes → 720 × 1280, 234,562 bytes.

The full derivatives are not destructively cropped or retouched. CSS controls hero/card framing; the mobile hero shows the full landscape image. Below-the-fold cards lazy-load. Descriptive alt text identifies scenes without identifying people.

## Destinations and verification
Meet our two churches / Explore our churches → our-churches.html.
Our services → worship.html.
Visit and learn → visit.html.
Get involved → church-life.html.
The static navigation regression test was adjusted to permit removal of About's old standalone History card; the shared navigation test continues to assert the History destination.
Protected pages: churchyard.html, war-memorial.html, index.html; global site.js, typography-preview.js, styles.css and footer-standard.css remain unchanged.
