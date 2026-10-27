# Phase 1 shared navigation

The approved warm ivory header uses the existing wordmark, utilities and 1600px site shell. No page body, hero, footer, URL, public API or Admin interface is redesigned. `site.js` contains the single audited `navigationCategories` definition.

## Structure

Home remains a direct link. Five buttons open ONE non-modal five-column hub at 1536px and above. All columns remain visible; the selected column has a warm gold surface/top rule. Every desktop trigger controls the same `navigation-hub` region and reports its actual expanded state. Click a different trigger to select that column; click the selected trigger again to close. Escape returns focus to the opener/column trigger, outside activation dismisses, Tab can leave normally. Up/Down and Home/End enhance the ordinary links without imposing application-menu roles.

At 1535px and below, the existing modal drawer moves the SAME navigation tree; each section is moved beneath its category trigger. Its `aria-controls` then targets that individual accordion section. Only one category expands at a time. Native dialog dismissal, focus locking/return, touch targets, scrolling and existing phone-landscape geometry remain. Resizing closes disclosures and relocates nodes; no cloned link tree.

- Services: Services Overview → worship.html; Service Times → weekly-worship.html; Prayer → prayer.html.
- Life Events: Baptisms → baptisms.html; Weddings → weddings.html; Funerals → funerals.html.
- Visit & Explore: Find Us → finding-us.html; The Church Building → church-building.html; Our History → our-history.html; The Churchyard → churchyard.html; Westhumble Chapel → westhumble-chapel.html.
- Community: News → news.html; Community & Groups → church-life.html; Children & Families → children-families.html; Bible Study & Fellowship → bible-study-fellowship.html; Pastoral Care → pastoral-care.html; Eco Church → eco-church.html; Parish Magazine → news.html#latest-parish-magazine.
- About Us: Our Team FIRST → our-team.html; Our Parish → about.html; Our Vision → our-vision.html; Our Churches → our-churches.html; Safeguarding → safeguarding.html; Contact → contact.html.

Search, Calendar, Bible and Plan your visit retain their destinations and existing behaviour. No Calendar or Bible duplicate appears in the hub. Existing lower-priority pages are retained. Electoral Roll and Privacy currently lack shared footer links: this is reported for a later approved footer/contextual change, not silently redesigned here.

## Assets/performance

Five decorative 480×200 WebPs are ordinary resized/cropped derivatives of genuine existing parish photographs, not generated images. Width/height and fixed CSS height reserve their space. Nothing is requested until the desktop hub first opens; no navigation photographs load on mobile. Failed photographs become invisible while their space and text links remain intact. Total is 89,686 bytes, approximately 87.6 KiB, cached after first opening.

| File under assets/images/navigation/ | Source | Bytes |
| --- | --- | ---: |
| services-480.webp | about/worship.webp (parish interior/community) | 19366 |
| life-events-480.webp | albums/st-michaels-church-churchyard/st-michaels-church-churchyard-13-960.webp (genuine stained glass) | 21944 |
| visit-480.webp | about/church-card.webp (genuine exterior) | 15192 |
| community-480.webp | albums/harvest-family-service-2026/harvest-family-service-01-960.jpg | 18686 |
| about-480.webp | albums/st-michaels-church-churchyard/st-michaels-church-churchyard-02-960.webp (genuine entrance) | 14498 |

Header/nav text #18392d on #fbf7ed; restrained gold #946914. Selected surfaces stay warm and readable. Current-page indication retains aria-current and a slim gold rule; focus uses a separate outline. Reduced motion suppresses motion. No frameworks or dependencies added.

The central `build-typography-preview.js` post-build version hook refreshes every public `site.js` URL. Public HTML changes are shared-script cache keys only. The Dev workflow recognises navigation-only releases and runs this hook without regenerating unrelated/date-sensitive content. Mixed content releases retain the normal build.

## Verification

`node --test test/navigation.test.cjs test/drawer-current.test.cjs test/home-header-hero.test.cjs test/standard-header-type.test.cjs test/landscape-reading.test.cjs test/history-direct.test.cjs test/history-story.test.cjs` covers content/semantics/preserved behaviours. Historical content-freeze tests ignore the authorised shared-script cache version, but retain their page-content checks.

`node scripts/check-navigation-preservation.cjs` separately checks all existing public files against starting Dev 5abea88 (ignoring only shared script URLs), the unchanged footer, Admin, Calendar, Bible, Feedback and canonical content. It runs outside the unit-suite because older build tests rewrite generated files.

`node scripts/check-navigation-hub.cjs` runs fresh Edge contexts at 2560, 1920, 1600, 1536, 1440, 1366, 1280, 1180, 1024, 820, 768, 430, 390, 375, 320 and 874×402/667×375. It checks all categories, 24 destinations and magazine fragment, selected state, current-page navigation flows, Back/Forward, 44px targets, scrolling/overflow, focus/Escape, desktop axe and deferred-image requests. `NAVIGATION_BASE_URL` targets live Dev and `NAVIGATION_OUTPUT` chooses a report/screenshot directory outside the repo. Browser emulation is not physical-device testing or manual screen-reader certification.
## Phase 2 footer discovery (27 October 2026)

The Phase 1 header/navigation is unchanged. The existing footer's Get in touch group becomes Parish information: Contact the church, Our Team, Safeguarding, Electoral Roll. Its former duplicate bottom-row Contact link becomes Privacy & GDPR. Explore, identity/YouTube, typography controls, credit, Bible acknowledgement and Admin link remain unchanged. No footer CSS, page body, route, API, permission or new artwork changes. The central post-build hook bumps only the shared-script footer cache key to 20261027-links-1, so visitors receive the links promptly across all existing public pages.

### Footer refinement (27 October 2026)

Parish information now contains, in order: Contact the church; Our Team; Safeguarding; Electoral Roll; Privacy & GDPR; Bible translation acknowledgement. The latter two are no longer repeated in the bottom row. The normal bottom row contains only copyright and the existing unlinked Website by Ed Popov credit. Administration — Development Preview retains its exact destination and label in a small separate development-tools group immediately above that row; existing typography preview controls are preserved. One 44px-target CSS rule accommodates that existing Dev link; all original footer styling and dark green remain. The redundant homepage-verses acknowledgement injection is removed (no verse behaviour changed), and its script cache version is refreshed by the central hook to avoid cached duplication.
