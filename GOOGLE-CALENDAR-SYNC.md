# Google Calendar synchronization — Stage 1

Alison continues editing micklehamcalendar@gmail.com in Google Calendar. The website still reads its effective Calendar from `_content/calendar.json`; the public browser never fetches Google. No timer or scheduled synchronization is enabled.

## Editor workflow

Sign into the Dev Admin Dashboard, open Calendar, and publish or discard any staged edits. Select **Check Google Calendar**. This authenticated GET fetches only the fixed public Google URL, validates and expands the approved 1 October 2026–31 December 2027 horizon, and reports proposed changes without a repository write. Expand **Review changes**. **Apply safe updates** is a separate confirmed POST, bound to the reviewed source fingerprint and Calendar/registry/Dev revision. A change to either source requires a new check. Application writes only the Calendar and registry, atomically, to Dev. The existing content build/Pages deployment follows.

The initial approved reconciliation adds the visible 8 November NO BCP notice and the 18 March 7.30pm event, and changes only the 24 November Compline end to 20:00. The original moved occurrence identity and 17 November exclusion remain. The October BCP service stays timed 08:00–09:00 and March parish meeting stays 19:30–20:30. The existing Compline and Sunday series are not rewritten or extended.

## Registry and ownership

`_sync/google-calendar.json` is excluded from Pages, along with its fixtures, by `_config.yml`. It contains public-source UID/original occurrence keys, existing website identities, accepted Google and website field snapshots, canonical fingerprints, explicit local overrides, durable suppressions, conflict fields, missing-check counters, series rules, and synchronization audit metadata. It contains no tokens or credentials. The repository itself remains public; this is internal website state, not a confidential datastore.

The dedicated adapter uses ical.js and handles UTC/London, all-day exclusive end, RRULE, EXDATE and RECURRENCE-ID. Source ordering, DTSTAMP, SEQUENCE and LAST-MODIFIED alone do not count as event changes. Conclusively expired historical masters are excluded before parsing current occurrences; malformed/unsupported current source data fails closed. Downloads are capped at 2 MiB and 15 seconds; raw/source records, recurrence steps, output occurrences and horizon are bounded. New unmatched UIDs are reported for approval, not automatically imported. No general time-from-title heuristic exists.

Google-only field changes update mapped events. Local-only changes become local overrides. Competing changes to the same field are conflicts, and that record is not partially updated. Blank Google location/description never erase website enrichment. Categories, drafts and other local fields are preserved. Admin-created records remain locally owned. Admin deletion of a linked record is detected as suppression so Google cannot recreate it. Source disappearance increments review state but never deletes an event in Stage 1. Large drops and recurrence structure changes are prominently reported; changed recurrence structure blocks application. Restoring a locally suppressed event does not automatically remove its source suppression: source remapping needs deliberate review.

Two Google-approved imports have genuinely blank venues. The strict normal event validation remains; only generated `google-<32 hex>` one-off identities support blank locations, and their editor does not require an invented venue. No invented category, description or improved title is assigned.

## Concurrency and security

Easy Auth remains the deployment perimeter and immutable-claim administrator authorization guards both methods. The browser retains the separate Admin API token scope. The server ignores browser identities, paths, URLs and branches. A non-forced Dev Git ref update publishes a tree with only `_content/calendar.json` and `_sync/google-calendar.json`; a competing commit rejects publication. Registry/Calendar state never lands as two separate commits. Safe failures return categories, never upstream SDK/network details or credentials.

## Stage 2, not enabled

After live manual testing, review approval of additional Google UIDs, recurrence changes and missing records; agree any rolling horizon extension and deletion thresholds. Only then consider a scheduler. GitHub schedules run on the default branch (currently main), so a Dev-only scheduled workflow is not sufficient. Nothing in Stage 1 changes main, existing GitHub App permissions, credentials or Azure authentication configuration.
