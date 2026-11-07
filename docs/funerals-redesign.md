# Funerals: peace, remembrance and support

Source of truth: the Funerals entry in `content-pages.json`. All four original paragraphs and the summary are retained verbatim, including the qualification that no particular service or arrangement is assumed. The real contact destination remains `contact.html`.

The page retains sustainable flowers guidance (DOCX), the no-floral-foam request, seasonal/local flowers and foliage, Church of England funeral guidance, prayer, pastoral care, Weddings flower anchor, and Worship back link. No fees, music options, eligibility, burial rules, availability or clergy details are added. Planning is presented as conversation topics supported by the existing copy, not an invented numbered process.

`build-content-pages.js` delegates only funeral life-event pages to `funerals-render.js` and includes `funerals.css`. CSS is page-scoped; the only header rule applies when immediately followed by the Funerals page, preserving the existing short-landscape utility row. No shared CSS, runtime JavaScript, fonts, Admin or API code changes.

Visual structure: warm candlelit hero; restrained introductory icons; genuine churchyard story; arranging a service; genuine parish exterior remembrance feature; practical flower/national guidance resources; quiet floral contact ending. Generated scenes are explicitly illustrative in alt text and a visible note. No people are depicted.

Run `node --test test/funerals.test.cjs test/baptisms.test.cjs test/weddings.test.cjs`. Browser verification uses `scripts/check-funerals.cjs`, ten viewports from 320px to 2560px including 568×320 and 874×402. `FUNERALS_BASE_URL` selects the actual Dev site. Screenshots and results go to `../funerals-verification` outside the checkout.

Image prompts, provenance, dimensions, compressed sizes and replacement instructions: `assets/images/funerals/README.md`.
