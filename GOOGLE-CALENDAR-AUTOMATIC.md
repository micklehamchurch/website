# Google Calendar synchronization — Stage 2

Alison continues editing the same parish Google Calendar. Azure checks it hourly without a browser visit or Admin action. The existing website Calendar remains authoritative public content in `_content/calendar.json`; the existing content workflow produces events, subscription ICS, search and Pages. Main is not involved.

## Scheduler and shared engine

`google-calendar-hourly` is an Azure timer with schedule `0 0 * * * *`: the start of every UTC hour, monitored by the Functions host, with `runOnStartup: false`. This is approximately hourly regardless of UK daylight saving time. There is no client-side synchronization scheduler and no GitHub schedule.

The timer and authenticated manual check/apply call the same `google-sync-service` and `reconcile` engine. Both use the fixed Google URL, existing 2 MiB/15-second fetch limits, validated ICS adapter, parser/expansion bounds and 1 October 2026–31 December 2027 horizon. The approved timed overrides, notice, March import, moved November Compline and existing website recurrence series remain intact. Supported new Google UIDs can be added as bounded one-off logical occurrences, including occurrences of a new supported series. A new occurrence within an already mapped UID, an exact duplicate website representation or changed mapped recurrence structure requires review rather than guessing a mapping.

## Ownership and independent safe updates

Google-only owned-field changes are applied. Local-only edits remain detectable against the accepted baseline and are preserved. Same-field competing edits are conflicts; no fields of that record are rewritten. Unrelated safe records may still update atomically. Blank source venue/description does not erase enrichment; categories and locally created records remain locally owned. Intentional “NO” notices and vague titles are never interpreted through text heuristics.

State-only observations do not cause repository commits. When there is an actual Calendar change, accepted registry/ownership state and Calendar are committed together. If nothing in Calendar needs changing, Git is untouched, including when the engine merely observes a local edit or suppression. Such local changes remain detectable against the existing accepted snapshot on later checks.

## Missing and removal policy

The initial threshold is **three consecutive successful checks in distinct consecutive UTC hourly slots**. Repeated calls within an hour cannot accelerate it. Feed failures, blocked snapshots and gaps reset consecutive evidence. Reappearance resets absence.

After that threshold, automatic removal is allowed only for a generated Google-import one-off with no local field overrides, no local edits or additional enrichment, published status and a matching accepted website snapshot. Its registry mapping becomes a durable suppression. Returning source records are not automatically recreated after suppression; deliberate review is needed.

Older website one-offs and bounded recurring representations require Admin review after confirmed absence. A source event moved beyond the approved horizon also requires review; the horizon is not extended automatically. This conservative policy deliberately avoids guessing ownership of existing church content.

More than three missing mapped records, more than 5% of mappings missing, or a feed count below 80% of the preceding successful validated count blocks all application. Disappearing mapped recurring series, changed mapped recurrence rules, empty feeds, malformed/unsupported source data, validation failures, HTTP failures, timeouts and oversize responses retain the last known-good Calendar. No automatic Google-driven removal bypasses these gates.

## Durable status without Git commits

The existing Function App host storage is reused server-side. A private `church-calendar-sync` container holds `stage2-state.json`: successful/failed run status, last automatic/successful check, last actual Calendar update, counts, conflict/review summaries, validated count and hourly absence observations. The container is created with private defaults. This file is not published through GitHub or Pages and contains no credentials or tokens.

The connection is consumed only inside Azure, using the existing `AzureWebJobsStorage` connection or its existing managed identity/account endpoint. No new secret, environment variable, account, role or permission is added. If storage is unavailable, synchronization fails closed; a sanitized host error is logged. Durable status cannot be updated while its storage is unavailable, so Admin displays a status error or the previous record rather than inventing a successful check.

A renewable 60-second blob lease serializes automatic runs and confirmed manual applies. The existing timer host singleton lock also avoids scale-out timer duplication. Git reads are pinned to one Dev head; an early current-head check plus a final non-forced ref update rejects concurrent Admin publication. No endpoint accepts a browser URL, path, repository or branch selector.

## Admin status and manual actions

The Calendar sync section shows automatic synchronization On, hourly cadence, last automatic/successful check, last Calendar update, last result, counts and attention items. Its authenticated status endpoint does not fetch Google or write Git. The open Admin page refreshes status only once per minute while visible; this is not a synchronization scheduler.

Manual Check remains read-only. Manual Apply remains a separate deliberate confirmation bound to the reviewed source fingerprint and repository/Calendar/registry SHAs. Manual checks do not advance missing-hour evidence. Conflicts and uncertain removals remain for review; editors can preserve/change their website values and request deliberate mapping review where necessary. No automatic conflict-resolution or uncertain-delete button was added.

For a clean check, Admin says “Everything is up to date — 118 events checked” (using the actual unchanged count) and shows no empty Review changes disclosure or Apply button. Meaningful proposed changes, missing records, conflicts and warnings still have review details.

## Rollout and verification

The deployment package verifies ten HTTP functions plus the timer. The existing Azure workflow verifies indexed function names and the actual hourly binding cadence. Observe a real scheduled execution after deployment; a no-op baseline must record 118 unchanged in private status while leaving the Dev head, Calendar blob and all public Calendar data unchanged. No production Google changes are manufactured for testing. Addition, update, removal, conflict, failure and concurrency cases use fixtures.

No email/SMS infrastructure, custom-domain production deployment or Stage 3 feature is included.
