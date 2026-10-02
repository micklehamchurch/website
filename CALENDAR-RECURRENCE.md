# Recurring Calendar events (Dev)

Calendar production builds and the Azure API explicitly use buildCalendar(null, editorial): _content/calendar.json is the sole source. hiddenEventIds and overrides are empty; supplied malformed feeds still fail in the optional parser used by isolated tests. GET/PUT retain verified Easy Auth administrator authorization, fixed Dev repository/path writes, request limits and atomic Calendar blob SHA protection. Deprecated API compatibility fields are feedItems: [] and sourceSha equal to the Calendar SHA; legacy clients may send that alias, while new clients may omit it. No second feed blob is read or checked.

## Stored rules and stable exceptions

Optional `series` and `exceptions` arrays extend the old root. Each series contains the existing event fields, a unique safe permanent series `id`, `Europe/London`, optional boolean `allDay`, and `recurrence`:

- `frequency`: `daily`, `weekly` or `monthly`.
- `interval`: integer 1–52.
- Weekly: unique `weekdays` integers 0–6 (Sunday–Saturday).
- Monthly: `dayOfMonth` 1–31 OR `ordinal` 1/2/3/4/-1 and `weekday` 0–6. -1 means last.
- `end`: `{type: "date", until: "YYYY-MM-DD"}`, `{type: "count", count: N}` or `{type: "never"}`.

`start` is the earliest local start date/time; it need not itself match the chosen weekday. The first matching date on or after it is the first occurrence. Counts count occurrences before cancellations, not the remaining visible events. Months without the chosen day are skipped. Rules are stored once; generated occurrences are never persisted into `calendar.json`.

An occurrence ID is `seriesId@originalLocalStart`. Exception records contain `seriesId`, exact `occurrenceStart` and either `cancelled: true` or `changes` using permitted existing event fields. The original target remains stable when an exception changes its displayed date/time. Unknown series, unscheduled dates, duplicate targets, invalid values, identity/rule selectors and unsafe content are rejected.

## Administrator workflow

Repeat options: Does not repeat, Daily, Weekly, Every 2 weeks, Monthly and Custom. Custom supports intervals, selected weekdays, monthly dates and First/Second/Third/Fourth/Last weekday. Ends offers On date (default), After number of occurrences and Never. The form shows a plain-language summary and the next five generated dates before staging; no rule syntax is shown.

Editing/removing a recurring occurrence explicitly offers This event or Entire series. This event creates a date exception; cancellation retains the stored rule. Cancelled dates have a Restore this event control. A separate series list permits whole-series editing/deletion even outside the generated window. Permanent series removal, replacing a series with a one-off, cancellation and publishing require confirmation. All edits remain staged until the existing Publish changes action succeeds. SHA updates after success, and stale writes still return 409 with no silent overwrite.

Changing a whole-series rule can invalidate its existing exceptions. The editor explicitly asks before removing such exceptions. Neighbouring occurrences are unaffected by single-date edits. This and future events is deferred; independent series IDs and original-date exceptions allow a future split-series operation without a schema redesign.

## Time, limits and public build

Dates are advanced as civil calendar dates, keeping church wall time stable across GMT/BST. Date arithmetic uses UTC Date containers; it does not advance timed events as UTC instants. A start or end in the nonexistent spring 01:xx clock gap is skipped. Autumn's repeated 01:xx is one stable civil occurrence. Tests verify both transitions. All-day events retain `allDay: true`, local midnight starts and exclusive next-date ends; public labels and Google export use all-day/date-only semantics.

Limits: 100 series, 1,000 exceptions, interval at most 52, finite schedules within ten years and at most 2,000 scheduled occurrences, series durations at most seven local days, supported dates 2000–2100, at most 10,000 combined public events. The API retains bounded 256 KiB JSON reading. Invalid or excessive schedules are rejected.

Each build expands recurring dates from 1 January of the previous year through 31 December two years ahead. Rules remain stored beyond this window. Existing one-offs/feed entries are not truncated. The window advances on the next website build; the existing workflow can also be run manually against Dev. It is not a runtime unlimited expansion or a claim of automatic scheduled rebuilding.

Generated occurrences look like ordinary public events. Draft/cancelled occurrences are absent from `events.json` and public search. Search reads the bounded generated events. The existing SHA-256 public version manifest includes generated series/exception results; its 20-second poll, cache revalidation and selected-month preservation remain intact. Authenticated live publication confirmation still requires the matching editorial SHA and served public data.

## Validation and first live test

Run the full suite, content build, package verifier and isolated Edge recurrence harness. The harness mocks API writes and public version changes; it checks preview, scope choices, exceptions, whole-series operations, all-day events, real 20-second polling and Admin/Public widths 390/768/1366/1440/1920. Compline-like tests use fixtures only.

Ed: hard-refresh Admin, sign in, open Calendar and confirm shared data loaded. Add an approved recurring event, choose Custom → Monthly → Ordinal weekday → First Tuesday, interval 1, 19:00–20:00 and a confirmed inclusive end date. Check the next-five preview before staging and publishing. After Pages finishes, confirm dates publicly. Edit one generated occurrence → This event, change only approved details and publish; confirm neighbours remain unchanged. Cancel one occurrence → This event and publish; confirm it disappears while the already-open Calendar retains its selected month and updates automatically. Do not create real Compline or import Google Calendar until its content has been approved.
