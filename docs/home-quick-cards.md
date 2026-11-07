# Homepage quick-link cards

The four original links, labels, icons and order are retained. Original inline SVG line art provides a tower/nave, Gothic window, upright leafy branch and sweeping leafy branch. Artwork is hidden from assistive technology and uses 7% opacity (8% on hover). No image downloads, external artwork, dependencies or JavaScript were added to the public page.

Cards use the existing homepage 1440px content grid within the unchanged 1600px site shell. Four columns start at 1200px, two columns below 1200px, one below 360px. Cards have 152px minimum desktop height, 138px tablet height and content-driven compact phone height. The entire card is the link. Hover lifts 5px; icons lift 2px; arrows move 3px. Reduced motion removes transforms/transitions. Focus has a gold 3px outline.

The 32px hero overlap is reduced to 18px on phones. When the existing Scripture block is intentionally in the reading flow below the photograph, cards instead follow it with 18px clearance. Hero imagery, content, cropping and scripts remain untouched. The Peace entry remains immediately after the cards.

Run `node scripts/check-home-quick-cards.cjs` with PLAYWRIGHT_MODULE pointing to Playwright if it is not installed locally. Set QUICK_BASE_URL to verify a deployed website. The script uses fresh browser contexts at 11 sizes, checking layout, overflow, text/arrow bounds, destinations, Enter, focus, hover, reduced motion and the Peace dialog. It takes screenshots outside the repository.

Validation: build passed; 8 focused homepage/Peace/landscape tests passed. Full suite: 510/524 passed, with exactly the same 14 failures reproduced on the starting Dev commit 973f77af50fb8249e22d02807533bcf060f491ed. These are existing contact/Calendar/clergy/footer/homepage snapshot, verse schedule and gallery fixture/version failures, not new card regressions.
