# Weddings landing page

The complete Dev wedding page follows the supplied floral editorial reference:emotional hero,four introductory features,church/interior story,practical planning,large Sustainable Flowers feature,seasonal guidance and contact,national guidance,genuine church image and a final enquiry invitation. No testimonial,price,eligibility rule,clergy name,availability or facility claim was invented.

Canonical facts remain in content-pages.json. build-content-pages.js delegates only wedding life events to weddings-render.js; all other generated pages retain their original rendering. weddings.css is page-scoped. Shared navigation,Search,Calendar,Bible,Feedback,footer and1600px shell source files are unchanged. A page-only short-landscape compatibility rule keeps header utilities in one row. Build workflow watches the new renderer,stylesheet and image assets,so subsequent content builds retain the design.

Existing local enquiry and visit destinations,Alison Wood's flower contact,seasonal/local flowers,water arrangements,the prohibition on floral foam including Oasis,Advent/Lent restrictions,the Wedding Co-ordinator advice,the DOCX and the Church of England guidance link are retained. #sustainable-flowers has responsive scroll margins below the sticky header.

See assets/images/weddings/README.md for temporary generated asset details,prompts,byte sizes and replacement instructions. The lower genuine church photograph is reused. Hero uses eager/high fetch priority; supporting photography uses lazy loading and reserved dimensions. No new runtime JavaScript is introduced.

Tests:node --test test/weddings.test.cjs; npm run build; npm test; PLAYWRIGHT_MODULE=... node scripts/check-weddings.cjs. WEDDINGS_BASE_URL selects the live Dev site. Browser coverage:320,390,768,1024,1280,1440,1920,2560px and568×320/874×402 landscape. Checks include every local CTA destination,download,anchor,shared menu/Bible,live Feedback,keyboard focus,reduced motion,images and horizontal overflow. Screenshots/results are saved beside the checkout under weddings-verification/.

Starting actual Dev:878ac451ea9c9d7cb8a6ecef4dbf182d642c66a1,including newer Bible fixes. Main remains804a189ae8b09e8a88f4bb98947af0e9fcb34c30.
