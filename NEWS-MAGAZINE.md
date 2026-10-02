# News & Magazine on Dev

Website stories and PDF editions are separate. Scoped News and Magazine publishing is enabled through the existing authenticated Admin API. Previews stay in the browser; Publish requires confirmation and server-side administrator authorization. See NEWS-PUBLISHING.md for routes, versions and validation. Existing Calendar publishing and authentication are unchanged.

## Real church content needed

No Pews News or Parish Magazine PDF was found in this checkout or the synced project references. The public page therefore has welcoming empty states, not invented editions.

Place the supplied **Sunday 27 September 2026** PDF at:

`assets/documents/news/pews-news/pews-news-2026-09-27.pdf`

Then add this record to `_content/publications.json` only when that real file exists:

```json
{
  "id": "pews-news-2026-09-27",
  "type": "pews-news",
  "title": "Pews News",
  "date": "2026-09-27",
  "description": "Services, events and parish notices for the week ahead.",
  "pdf": "assets/documents/news/pews-news/pews-news-2026-09-27.pdf",
  "published": true
}
```

Magazine PDFs go in `assets/documents/news/parish-magazine/`, for example `parish-magazine-2026-10.pdf`. Use the first day of the edition month for the ISO date, and a unique ID. No current magazine edition is assumed.

Never overwrite or remove an older PDF when adding an edition. Append a new record with its own date-based path. The model rejects duplicate identities and PDF paths; the build requires real files with PDF signatures. Latest editions are chosen by descending date (ID breaks ties); all remaining published records stay in the collapsible year archive. The latest cards remain visible when the archive filter changes.

`build-publications.js` emits the published-only `publications-data.json` projection. Draft records stay out of the public listing and search. Search indexes titles, dates and descriptions, not PDF text.

## Website News

Continue using `_content/news.json` and the existing generator. Real articles require `slug`, `title`, ISO `date`, `dateLabel`, `category`, `excerpt`, `paragraphs` (plain text), and `status` (`draft` or `published`). Optional fields: `featured`, `image` (existing site-relative asset), `imageAlt`, `expires` (ISO date, inclusive). After `expires`, an article leaves the current listing but its generated page remains accessible and searchable. Fictional `demo: true` records remain excluded from the public site.

Admin provides the existing story editor, optional image selection, draft state, expiry date and local Preview. Local save remains a browser-tab preview; Publish / Save draft commits to shared Dev content. PDF forms validate a selected local PDF (maximum 5 MB), provide an explicitly unpublished preview, without uploading until Publish is confirmed. Object URLs are revoked when the preview closes. No administrator has to use GitHub for the preview workflow; publishing uses the same server-side administrator authorization as Calendar.

## Verification

Run `npm test` and `npm run build`. With Playwright available, run `node scripts/verify-news-browser.cjs` (`CALENDAR_BROWSER_CHANNEL=msedge` uses installed Edge). Browser fixtures exist only in intercepted test responses, never in church content. It checks empty states, latest/archive sorting, filters, news cards, local PDF/story previews, mocked scoped publishing, and overflow at 390, 768, 1366, 1440 and 1920 pixels.
