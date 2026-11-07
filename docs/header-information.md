# Header information, Safeguarding and Policies

Starting Dev: `c8bcef49afa27050f310b203d66b579303c4fdee` (preserves the subsequent five-photo carousel release).
Starting main: `804a189ae8b09e8a88f4bb98947af0e9fcb34c30`.

The single shared navigation in `site.js` now includes an Important information group and a Church open daily visitor link. Above the existing 1536px breakpoint the group sits above the original navigation and the visitor link above the existing controls. The original church identity spans both rows. The expanded header measures 109px including its border; the existing scroll controller still condenses at 64px into the original 81px header. The information row disappears in that state. The fixed page reserve does not change on scroll.

Below 1536px, the existing header remains unchanged and the same Important information group travels with the existing navigation into the native modal drawer. No second navigation tree or additional menu script is introduced. Safeguarding remains in About Us as requested; the additional top-level information link gives it greater prominence. Existing categories, ordering, Alpha and Give are unchanged. Gold inline SVGs are decorative, with real link text. The Search overlay now aligns with the actual Search control in both header states.

The homepage body, hero photo/controller, Next Service selector and Sunday Zoom code/data remain unchanged. Only the shared stylesheet bundle/hash and shared script cache reference change. Churchyard Regulations HTML changes only its shared cache reference; its body, content, renderer, styles, scripts and official PDFs remain untouched. The existing footer already supplies one clear Safeguarding link on every public page and is unchanged.

## Content audit and source decisions

The Safeguarding page's existing contacts move before the policy commitments; existing commitments, responsibilities, appointment and approval/review information are retained. The original two introductory fragments above both cards are replaced with a concise reporting introduction. A link to the diocesan team's current contacts and guidance is added. No phone number or email is invented.

* Parish Safeguarding Officer: **Vickie Leney**, `safeguarding@micklehamchurch.org.uk`, **01306 884054**. Confirmed against the existing parish data and [the parish's published directory](https://www.micklehamchurch.org.uk/contactus.htm). The differing baptism-coordinator number on that old directory is not used for safeguarding.
* Existing diocesan contact: **Natasha McMillan**, `safeguarding@cofeguildford.org.uk`, **01483 790379**. The [official diocesan safeguarding team page](https://www.cofeguildford.org.uk/meet-the-team.php) confirms Natasha's role and team email; the [official staff directory](https://www.cofeguildford.org.uk/xdb/diocesanstaff/show/diocesan-safeguarding-officer) confirms the team phone. The page links to the official current team/concern guidance rather than reproducing a changing roster or inventing local reporting procedures. The existing parish page contained no separate emergency paragraph; none is removed. The linked diocesan guidance includes emergency/out-of-hours advice.
* “Church open daily” relies on the priest's confirmation in this brief. Destination: `visit.html`. That page asks people to confirm particular opening/access arrangements but supplies no contrary hours. No exact opening times are added, and its content is unchanged.

No existing central public policies landing page was found. `policies.html` is a small handwritten public page, with no generated-topic marker, so the existing topic builder cannot delete it. Search includes it and `sitemap.xml` lists the public Search inventory. `build-policy-sitemap.cjs` rebuilds this inventory during this scoped release; no external sitemap service is added.

Included destinations:

* Existing Safeguarding policy and contacts.
* Existing Baptism Policy (DOCX, PCC September 2026), baptism application form (PDF), baptism guidance, wedding guidance and funeral guidance. General guidance is explicitly labelled guidance, not a formal policy. These baptism files are already publicly linked from Baptisms and registered in the existing admin document inventory.
* Existing Churchyard Regulations page, which retains its diocesan 2022 regulations, 2026 remembrance/ashes regulations and CR1 form. No redesign or duplicated regulatory interpretation.
* Existing parish Privacy & GDPR notice, Data Privacy Consent Form PDF, and Electoral Roll guidance/application documents.

No missing document is invented. PCC confirmation/supply is needed before adding any other formal life-event or parish policies; no separate formal wedding/funeral policies were established by this audit. Existing public documents are retained with their existing dates; a filename year alone is not treated as evidence that a form has expired.

## Verification

`test/header-information.test.cjs` independently checks the actual new navigation, exact preservation of all existing categories/branding/footer, public bodies, homepage carousel/Next Service systems, regulatory assets, policy links/Search/sitemap and safeguarding records. Older historical preservation tests discount only the exact approved header/content hunks stored in `test/fixtures/header-information-approved.json`; all other changes still fail their original comparisons. The helper preserves binary bytes and is not used by the new feature tests.

`scripts/check-header-information.cjs` exercises Edge and WebKit at 1920, 1600, 1536, 1440, 1280, 1024, 834, 768, 430, 393, 375, 320, 852 landscape and 568 landscape widths. It checks expanded/condensed placement, keyboard dropdown/Escape focus return, native drawer and its close/focus return, Search finding Policies, Bible opening, Calendar destination, overflow, representative pages and enlarged text. Screenshots are inspected, not just produced. Homepage hero content remains clear of the header (109px header bottom, 112px welcome top, 232px verse top at 1600px).

Separate axe scans compare the starting Dev with the result for Home and Safeguarding at 1600px and 393px, including open mobile drawers. The new Policies page is scanned at both widths and with its drawer open. WCAG 2 A/AA and 2.1 AA scans found no violations in these states.

The content workflow recognises this scoped release and rebuilds only Safeguarding, shared cache references/home CSS, Search and sitemap. It does not regenerate Calendar, contacts, homepage data or Churchyard pages.
