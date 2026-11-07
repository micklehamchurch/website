# Racial Justice Covenant resource

Starting Dev: `560869b253a784709631d93fd5bdfb3e60bcc804`.

Added the approved neutral diocesan resource immediately after Safeguarding in
`policies.html`, retaining every original section, ID and document link. The new
section uses `policies-racial-justice`. It makes no claim of parish/PCC adoption.
Both approved external destinations returned HTTP 200 (PDF: application/pdf,
3,306,315 bytes; diocesan resources: text/html).

The existing Other policies menu column gains one additional link, also available
in the mobile drawer. Its existing handlers, photograph, icons and CSS are unchanged.
Policy fragment targets receive a scroll margin based on the existing header
reserve. The search index is generated with `node build-search-index.js`; only the
Policies entry changes. All five requested queries find it without ranking changes.

Shared script cache keys are advanced across public HTML and the central builder
so existing visitors receive the menu update. All unrelated page bodies and layout
assets are unchanged. The content workflow has a bounded release guard that runs
only the supported search generator for this change, preserving unrelated generated
pages and date-sensitive calendar projections.

Focused checks cover the exact approved insertion and wording, preservation of
original policy content/IDs and menu handlers, all five search queries, unchanged
search entries and unrelated header/hero/logo/favicon assets. Historical snapshot
tests reverse only these exact additions and cache keys; the new checks read native
files. Full regression: 777 tests, 754 pass, the same 23 pre-existing failures as
the starting Dev run, with no new failures. Existing failures concern historical
content/snapshot expectations, calendar migration, contact/clergy, generated page
delivery, gallery inventory and the older prayer schedule; they are not changed here.

Edge and WebKit responsive checks cover 1600×900, 1020×1440, 1194×834, 834×1194,
852×393, 393×852, 320×568 and 568×320. Checks include menu columns/destinations,
keyboard entry/Escape/focus, touch activation, section heading clearance, overflow,
full-page search, nested-page navigation and normal/reduced motion. Automated WCAG
A/AA scans report zero violations in the tested menu and policy content.

Screenshots, detailed logs and live deployment evidence are delivered alongside
the task report in the project workspace. Main must remain unchanged.
