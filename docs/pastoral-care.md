# Pastoral Care migration — 24 October 2026

Source: https://www.micklehamchurch.org.uk/359295070171.htm, fetched live before editing.

## Content audit and contact decision
The original introduction, John 13:34–35 reference, practical/prayerful community care and closing Gospel/service message are preserved in meaning with small readability edits. Scripture is not copied from the legacy page: the existing licensed NIV Anglicised Bible endpoint supplies JHN.13.34-JHN.13.35 on view, with provider copyright and FUMS reporting. No Scripture is saved in the page/build assets. Failure offers retry and a Bible link.

Recovered activity details:
- Soup Lunches: Village Hall, Lent and Autumn; bread, home-made soup, cheese, company; transport available; no charge, donations welcomed; charities nominated by Church Community Group; new friendships and strengthened relationships.
- Breakfasts: Women's third Saturday, Men's fourth Saturday monthly; Stepping Stones pub, Westhumble, 9.00am; open to local community, company and conversation.
- Afternoon Tea: third Monday monthly, called T@3; local homes; home-made refreshments, teas/coffees, new and existing friendships. No exact clock time is inferred from T@3.
- Coffee and Cake: Chapel in Westhumble, first Saturday monthly from 10.00am. No additional menu or event details invented.

The four contact anchors (Andy Diamond twice, Stephanie Randall, Jonathan Blake) have no href, onclick or resolvable destination in the live source. Andy appears in the new site's published PCC list, which does not verify activity organiser responsibility. Stephanie/Jonathan were not verified in the new contact data. No matching current calendar activities established the legacy schedules. The user explicitly approved retaining activities with qualified legacy arrangements, withholding personal names, and using the existing parish contact route. These details are not represented as confirmed current events. A notice appears both above the cards and in each detail view. Names remain in this audit only, not in public activity content.

Legacy page also links its old navigation (redirect/newwelcome/aboutus/services/churchlife/calendar, prayer 968013942241.htm, childrenstudentsandfamilies/homegroups/914257228374.htm/giving/electoralroll/weeklynews) and Church123 builder credit. None is an activity contact. Legacy hands image: livesiteadmin hosted 77d988ead1d46995477e5090ed861b2e.jpg, unverified provenance/licensing, not reused. Old footer selfphoto.jpg is not copied.

Existing verified routes: contact.html (parish general/activity enquiries), contact.html#enquiry-parish-priest (pastoral support), prayer.html, safeguarding.html (kept distinct), calendar.html. No invented contact details. See _content/contacts.json and generated contact.html.

## Design and assets
Shared green header, 1600px shell, typography and footer retained. Full-width garden hero, introductory serif copy, contemplative Scripture panel, care story, four concise icon cards, closing pastoral support invitation. No stock/generated photography and no unverified hands image. Genuine parish Garden of Remembrance assets reused unchanged: assets/images/peace/garden-{640,1600}.webp (640×480/136790 bytes and 1600×1200/793958 bytes), provenance documented in moment-of-peace.md. These are nature/context images, not activity documentation. No photographs clearly attributable to the four activities were identified, so dialogs have no photos.

## Interaction and maintenance
content-pages.json is the page content source; pastoral-care-render.js generates the page via build-content-pages.js. Page-only CSS and JS avoid global changes. All four activity details are rendered in normal document flow without JavaScript; supporting browsers enhance them into one native modal dialog. IDs: soup-lunches, breakfasts, afternoon-tea, coffee-and-cake. Card activation pushes an entry; Close/Escape returns to the prior URL; direct-link Close replaces the fragment. Back/Forward opens/closes appropriately. Native inert background plus explicit keyboard focus cycling, labelled/described dialogs, focus return and scroll restoration. Browser hashes outside these IDs are left alone. No Admin/API/schema/authentication changes.

## Verification
scripts/check-pastoral-care.cjs covers twelve widths, four dialogs, direct links, Back/Forward, focus cycling/return, keyboard/touch/mouse, no overflow, licensed reading/attribution, retry, no-JavaScript detail fallback and axe WCAG checks. Localhost uses an in-memory real provider response to respect production-only Bible CORS; live mode requests the real endpoint directly. No provider response/token is written to disk.
