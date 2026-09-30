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
- **Fellowship / Bible Study Groups:** the page now carries forward the old source’s Monday 7:45 pm and Thursday 11:00 am weekly meetings in Westhumble, plus its group purpose and welcome message. Church team confirmation required: confirm whether the groups still meet weekly, the Monday and Thursday times, the Westhumble location, and whether Amanda Wadsworth and Alison Wood remain the right group contacts. The repository lists Alison with parish-office and flower-coordination details, but does not confirm her Bible study role or provide Amanda’s contact details.
- **Pastoral care, team, Electoral Roll:** confirm current role-holders and contact routes. The team page intentionally omits old personal phone numbers and email addresses.
- **Electoral Roll documents:** the application form and Electoral Roll Privacy Notice were copied unchanged from the supplied PDFs to `assets/documents/electoral-roll/`. The privacy notice is labelled 2019 and lists an Electoral Roll Officer/contact route. Church team confirmation required: check whether the 2019 Electoral Roll Privacy Notice remains the current approved version and whether the Electoral Roll Officer/contact details remain current. Earlier references to the 2025 new Electoral Roll and 2 April 2023 APCM are not presented as current information.
- **Safeguarding:** the policy, local safeguarding contacts, September 2026 PCC agreement and July 2027 review details from the supplied three-page PDF have been migrated to `safeguarding.html`. The repository source is the Safeguarding entry in `content-pages.json`; the public page is self-contained and no longer links to the old website.
- **Privacy/GDPR:** the full Data Privacy Notice is maintained in `content-pages.json`. The supplied Data Privacy Consent Form is copied unchanged to `assets/documents/privacy/data-privacy-consent-form.pdf` and linked from the Privacy & GDPR page. Church team confirmation required: the form limits diocesan sharing consent to news and activities directly relevant to the recipient’s role, while the Data Privacy Notice describes sharing contact details for diocesan news and events in which a person may be interested. The form also says processing ceases after consent is withdrawn, while the notice lists retention periods; confirm how the two documents should be read together. Neither document’s legal wording has been changed.
- **Eco Church:** the new page uses the supplied Eco Church page, the 2024 Churchyard Trail and sustainable flowers guidance. It presents the Silver Award as received in 2024, not as current accreditation, and describes the energy audit as a historical source report without claiming later progress. Church team confirmation required: check current Eco Group activity, whether the energy audit plan progressed, and whether David Kennington (named as Eco Group Chair on the older page) and the churchwardens email remain the right contact route. The sources report different lichen counts: 182 in a 2016/17 survey on the earlier page, and 251 species in the 2024 trail; the public page attributes the 251 figure to the trail rather than reconciling the counts. The flower guidance lists Alison Wood, flowers@micklehamchurch.org.uk and 01372 376443; those details match the current repository contact directory.
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
