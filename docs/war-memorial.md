# Mickleham War Memorial — supplied photographs and evidence

The administrator supplied four original photographs and a visual reference on 15 October 2026. Only genuine photographs are published; the mockup is a layout reference.

## Evidence and wording

IMG_6564.JPG clearly reads, with line breaks:
THIS CROSS
WAS ERECTED
IN 1920 BY THE
PARISH OF
MICKLEHAM
TO THE GLORY
OF GOD AND
IN MEMORY OF

IMG_6561.JPG reads: WHO FELL IN THE GREAT WAR 1914-1919. The page preserves the inscription's 1914–1919 range rather than changing it to a conventional war-date range.

IMG_6563.JPG clearly reads:
THIS CROSS
IS ALSO
IN MEMORY
OF

The 1939–1945 dates are visible on its base. Individual names are not transcribed or guessed.

IMPORTANT: IMG_6562.JPG is NOT evidence for a Second World War marker. Its date is 1915–1965. Its upper initials appear as W.I.; their meaning and the marker's history have not been established. The gallery therefore describes it neutrally as a small dated stone marker, and makes no claim about a later wartime addition.

The parish calendar source (_content/calendar.json) contains an Act of Remembrance at War Memorial on 8 November 2026. This supports the page's statement that the calendar includes an Act of Remembrance, without claiming an unverified annual tradition.

Omitted: the old page's unverified counts of eleven names for each war, unclear names, any dedication ceremony/unveiling details, dates when further names were added, and a claim that the 1915–1965 marker commemorates the Second World War.

## Photographs

Originals are stored externally and are not copied into the public repository. All four have stored dimensions 5712 × 4284 with EXIF orientation 6; correctly oriented they are 4284 × 5712 portrait photographs.

- IMG_6564.JPG: 7,552,659 bytes → memorial.webp, 1200 × 1600, 538,496 bytes.
- IMG_6563.JPG: 8,430,737 bytes → inscription.webp, 900 × 1200, 394,590 bytes.
- IMG_6561.JPG: 10,587,281 bytes → first-world-war.webp, 900 × 1200, 444,778 bytes.
- IMG_6562.JPG: 8,526,254 bytes → dated-marker.webp, 900 × 1200, 447,398 bytes.

WebP quality 86, proportional resizing only, EXIF orientation applied and metadata stripped. No upscaling, destructive crop, retouching, fabricated subjects or photographic effects. CSS crops the desktop photographs; every photograph links to its full optimised portrait so inscriptions and the complete memorial can be inspected. Mobile shows the complete main photograph.

## Architecture and design

content-pages.json is the only editorial source. build-content-pages.js dispatches the war-memorial layout to war-memorial-render.js, using page-scoped war-memorial.css. The normal build regenerates war-memorial.html and search-index.json. Existing header/footer, typography controls and Churchyard content are untouched.

The desktop follows the reference's wide split composition, cream blend, two actions and three equally tall detail images. The genuine main image is portrait rather than the mockup's landscape composition, so a taller hero retains more of the cross and church without distorting or inventing the scene. Tablet/mobile switch to a normal-flow main photograph and mobile gallery stack.

Primary action: our-history.html, the existing Our History page. Secondary: churchyard.html. Breadcrumb: visit.html.
