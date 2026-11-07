# Compact homepage quick links

Starting Dev: `0d17872a7a3df6c3faa16e5d3ce15e1853815e72`.
Starting main: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

Only the four quick-link cards are redesigned. They retain their original order, headings, icon paths and whole-anchor destinations: Worship (`worship.html`), Explore and learn (`visit.html`), Our community (`church-life.html`) and What’s on (`calendar.html`). The arrow spans and oversized decorative SVGs are removed from the DOM. Each original gold line icon sits in a pale-gold rounded-square container beside its heading. No descriptions, new images or JavaScript are added.

The cards use the existing ivory, green and gold palette, a fine muted-gold border, 13px corners and a restrained shadow. Desktop cards are 88px high with comfortable padding; tablet/phone cards use the same horizontal icon-heading arrangement. A 2px hover lift, mild border/shadow emphasis and the existing visible gold focus treatment provide interaction cues. Reduced motion removes the lift; the existing global accessibility stylesheet may express disabled transitions as a near-zero duration.

The established 1199px tablet breakpoint retains two columns; desktop uses four. At 600px and below, portrait mobile becomes one column with 84px cards. Existing short-landscape architecture retains two columns. Grid tracks use equal flexible rows and minimum, rather than fixed, card heights so enlarged text can grow without clipping. Headings remain 20–23px desktop and 21–22px tablet/phone. The service heading can naturally wrap at the smallest desktop widths while preserving the 88px equal-height row.

`home-content.css` changes only its quick-card section. Every later rule remains byte-for-byte unchanged. `index.html` changes only the quick-card block and CSS bundle hash. `home-style-sources.json` versions this existing source in the same cascade position; `home-critical.css` is rebuilt deterministically from the source manifest. This keeps the compact layout in the first-paint stylesheet, without a delayed override or extra asset requests. Later sections naturally move up as the cards become shorter; their markup, designs and styles remain unchanged.

The shared header, illustrated church logo, information links, global navigation, hero/carousel, Next Service and Zoom, News, Take a Moment, Life Events, discovery area and footer are preserved. The dedicated test compares the entire homepage outside the card block and delivery hash to the starting Dev, as well as every relevant shared script and protected stylesheet. Older preservation tests now allow this explicitly authorised card change; the new test independently preserves all of `home-content.css` outside that block.

`scripts/check-home-quick-links.cjs` checks Edge and WebKit at 1920,1600,1536,1440,1280,1200,1199,1024,834,768,601,600,430,393,375,320,852 landscape and568 landscape widths. It verifies columns, equal heights, icon/text centres, exact titles/destinations, absence of arrows/artwork, no overflow, keyboard activation/focus, padding-area whole-card clicks, reduced motion and hover. WebKit's platform-dependent Tab preference is accommodated by explicit keyboard focus followed by Enter. Separate enlarged-text checks ensure growth without clipping. Actual desktop, smallest-desktop, tablet and phone screenshots are inspected.

The Dev content workflow has a narrow quick-link release path that rebuilds only the homepage CSS bundle. It never regenerates Calendar, Next Service, Search, News or other page bodies for this release.
