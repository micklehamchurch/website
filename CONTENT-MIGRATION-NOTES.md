# Mickleham website content migration notes

Internal working notes. This file is not part of the public site or its search index.

## Source reviewed

- Parish welcome and About Us: https://www.micklehamchurch.org.uk/newwelcome.htm and `/aboutus.htm`
- Worship and Sunday services: `/services.htm` and `/sundays.htm`
- Alpha: `/914257228374.htm`
- Fellowship/Bible Study: `/homegroups.htm`
- Parish contact/team roles: `/contactus.htm` (migrated to `parish-contact-directory.html`)
- History: `/history.htm`
- Westhumble Chapel: `/chapelofease.htm`
- Find Us: `/findus.htm`
- Giving: `/methodsofgiving.htm`
- Churchyard regulations: `/regulations2.htm`
- Eco Church: `/429302394390.htm`
- Safeguarding: `/469890773296.htm`
- War Memorial: `/755855739116.htm`

The source site changes over time. Historical/operational details below were reviewed on 29 September 2026 and must be checked with the parish before being presented as current where indicated.

## Confirmation needed

- **Worship:** compare the older monthly service pattern, children’s area/creche, refreshments and Compline information with current practice. The public page directs visitors to the current repository calendar for dated services.
- **Life events:** confirm baptism Sunday placement, coordinator roles, wedding eligibility/process, and funeral arrangements. Current named contacts and fees have not been migrated.
- **Bible study and Alpha:** old group meeting times, named contacts and whether a course/group is currently running have not been published as current.
- **Pastoral care, team, Electoral Roll:** confirm current role-holders and contact routes. The team page intentionally omits old personal phone numbers and email addresses.
- **Safeguarding:** old statement says it was approved November 2021 and next reviewed July 2026; that review date has passed. Confirm the current policy, local safeguarding contacts and diocesan contacts. The public page links to the existing published statement in the meantime.
- **Privacy/GDPR:** old Privacy Statement text was not available in the source review. Keep the separate link to the existing statement until the current wording is supplied and reviewed.
- **Eco Church:** old page reported Eco Church registration, a Silver Award, land-management work and wildlife records. Confirm award status, current projects, figures and contacts before presenting them in the present tense.
- **Churchyard regulations:** the old page says the rules were approved 7 November 2023. Confirm the latest approved version and forms.
- **Find Us:** old information described the 465 bus, a bike rack and Box Hill & Westhumble station at roughly 1.4 miles/30 minutes’ walk. Confirm routes, facilities and current access information.
- **Giving:** old page listed PGS, standing orders, free-will envelopes, Payaz contactless, cheque/cash gifts, Gift Aid, legacy/share gifts and bank details. Current availability, provider, Gift Aid process and every payment detail require explicit confirmation. Bank details and charity registration number were not copied into the new page.
- **Parish Magazine:** old issue link and editor contacts may be out of date; no old issue is presented as current.
- **Parish Contact Directory:** the named roles, people, telephone numbers and email addresses on the new directory were transcribed from the old `/contactus.htm` page on 30 September 2026. Confirm all office holders and every contact route before treating them as current. In particular, the source gives the Organist email as `organist@micklehamchurcg.org.uk` (spelling preserved; verify before any correction), lists different area codes for Vickie Leney’s baptism and safeguarding contacts, gives the Magazine Editor Charlotte Daruwalla’s number as `07933 30074` (preserved; verify its length), and groups two Magazine Editors with one shared editor email. The source gives no telephone number for the Electoral Roll Officer. PCC membership and the Website Editor role should also be reconfirmed.
- **History:** expanded page preserves the old parish account, including its interpretations and dates. Have a church history/building specialist review the text before treating it as a definitive conservation record.

## Photography

The files in `assets/demo/` and the root-level generated-looking church placeholder images have not been used as documentary photographs on public pages. No approved interior, Westhumble, churchyard or parish/community photographs were supplied in this checkout. Public pages use text-led layouts and neutral visual motifs until approved photography is available. Keep original image assets in place for internal reference; do not relabel them as real photographs.

## Content retained privately

The six fictional News & Magazine example articles remain in `_content/news.json` as drafts for Admin Dashboard workflow reference. The build excludes all draft and `demo: true` articles from public JSON, generated article pages and search.

The existing `_content/calendar.json` and supplied calendar feed are left intact. Build validation should continue to report the existing 36 imported real events.
