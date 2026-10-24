# Internal public header photograph — 24 October 2026

Scope: background layers only. Home, header layout/state logic, page heroes/content, typography, navigation markup, utility controls, shared responsive CSS and footer remain unchanged. Starting Dev: ff5045dd0f3cb279ab2fbd534edbef51fd660334. Main is not modified.

## Approved source and optimisation
User-supplied approved generated church/garden panorama, codex-clipboard-4dbd3bd1-9930-416e-99ff-f871d1969e13.png. It is decorative generated artwork, not a newly documented genuine parish photograph. Original canvas 2172×724. Cropped to x=0,y=216,width=2172,height=292, removing all surrounding white canvas and the boundary rows. Resized proportionally, metadata stripped, WebP quality78/effort6. No navigation/logo/text baked in; no generated replacement and no source canvas shipped.
- assets/images/header/internal-garden-1600.webp — 1600×215, 64,196 bytes.
- assets/images/header/internal-garden-800.webp — 800×108, 25,482 bytes.
Existing site uses WebP; no extra fallback format needed. One CSS image per viewport, shared natural browser caching, no image-loading JavaScript, no layout shift, no image request on Home. Photo failure leaves #18392d green and usable controls.

## Implementation
site.js marks only existing normal public header elements on internal paths and loads internal-header-photo.css via the established stylesheet loader. Home root/index.html is excluded; Admin/auth/login paths and embedded Bible overlay are excluded. No header means no treatment. The CSS is screen-only, preserving print styling. Dropdown/drawer/Search results retain their own opaque backgrounds. Background variables/declarations are the only properties in the new CSS; the existing header stylesheet is untouched.

Tint: exact existing church green RGB(24,57,45), 82% overlay; at <=700px, 86%. Cover positioning: desktop/tablet 50% 47%; phone 58% 50%. This crop keeps foliage/light and architecture subdued, without distortion/white edges. build-typography-preview.js adds headerPhoto=20261024-1 only to internal public site.js references to avoid stale browser scripts. Home's HTML is unchanged. Generated HTML differences are that cache version only; no page hero or content changes.

## Geometry and contrast
Before and after: sixteen sizes × seven representative pages (Home, Pastoral, Worship, Visit, News, About, Baptisms); all measured header, branding, controls, nav/spacer and main top positions identical. Expanded Search does not change header height. Condensed desktop measured with/without photo class: unchanged.
| View | Before | After |
|---|---:|---:|
| Desktop >=1536 | 89px | 89px |
| Condensed desktop | 81px | 81px |
| Tablet/compact desktop | 79px | 79px |
| Phone portrait 320/375/390/430 | 113px | 113px |
| Short phone landscape | 57px | 57px |
All sixteen Home header screenshots were byte-identical before/after. No horizontal overflow. Matrix:320×700,375×812,390×844,430×932,667×375,740×360,844×390,874×402,768×1024,1024×768,1280×900,1366×900,1536×1000,1600×1000,1920×1080,2560×1200.

Every pixel of both source derivatives was composited against the chosen overlay to test worst-case contrast, not just a sample crop. Source minimum ivory/gold:6.52/5.13 desktop,7.40/5.82 phone. Rendered brightest responsive backgrounds gave minima6.48 ivory/5.10 gold; phone7.29/5.73. Existing ivory/gold text, active state, icon strokes and focus indicators are unchanged. Existing deep-green text on the ivory Visit button remains unchanged. Header axe WCAG A/AA checks passed at desktop/tablet/portrait/landscape; keyboard, menus, Search, Calendar, Bible and Visit regressions passed. Failed-photo test preserves green and Search. Full suite535 tests:521 pass, same14 pre-existing failures as prior tasks;25 focused tests pass.

## Surfaces
All normal public internal pages automatically use the one signature image. Standalone Bible page uses its normal public header; embedded book overlay does not. Home, Admin/auth, redirect/utility pages without a shared header, modal immersive experiences and print layouts retain their existing treatment.

Exact normal internal page inventory at implementation:
- about.html
- alpha.html
- baptisms.html
- bible-study-fellowship.html
- bible-translation.html
- bible.html
- calendar.html
- children-families.html
- church-building.html
- church-life.html
- churchyard-regulations.html
- churchyard.html
- contact.html
- eco-church.html
- electoral-roll.html
- feedback.html
- finding-us.html
- funerals.html
- gallery.html
- give.html
- history-bells.html
- history-domesday.html
- history-norbury.html
- history-norman.html
- history-restoration.html
- history-saxon.html
- history-today.html
- news.html
- news/a-harvest-of-thankfulness.html
- norman-architecture.html
- our-churches.html
- our-history.html
- our-team.html
- our-vision.html
- parish-magazine.html
- pastoral-care.html
- prayer.html
- privacy.html
- safeguarding.html
- search.html
- special-services.html
- sunday-services.html
- supporting-community.html
- those-who-have-served.html
- visit.html
- volunteering.html
- war-memorial.html
- weddings.html
- weekly-worship.html
- westhumble-chapel.html
- what-to-expect.html
- whats-on.html
- worship.html

Utility/excluded inventory:
- admin/index.html: Admin application; separate layout and authentication
- news-stories.html: Legacy redirect; destination uses shared shell
- parish-contact-directory.html: Legacy redirect; destination uses shared shell
