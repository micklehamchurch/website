# Automatic Calendar updates on Dev

The existing content build continues generating public `events.json`. It also
generates `calendar-version.json`, containing a SHA-256 fingerprint of that public
data and the Git blob SHA of the editorial file processed by the build. The
manifest contains no event details, drafts, identities or credentials. Existing
generation rules exclude draft and hidden events from public event data.

An open Calendar checks the small manifest every 20 seconds while visible.
Unchanged fingerprints cause no event download or DOM update. A changed
fingerprint causes one fetch of `events.json`; its hash must match the manifest
before the component replaces its event collection. Month selection and the
existing responsive grid/agenda view remain in place. Open event details update
or close if their event was removed. Background failures retain the current
Calendar without visitor-facing errors. Polling timers pause in hidden tabs and
visibility restoration triggers a check.

Only Calendar requests use timestamp query parameters and `cache: no-store`;
event requests additionally carry the advertised fingerprint. Caching elsewhere
is unchanged. During deployment, mismatched manifest/data responses are retried
on the next check. Requests use no authentication headers or cookies.

After publishing, the dashboard reports that GitHub has accepted the change and
the website is rebuilding. For up to five minutes, the same static watcher checks
for the exact editorial blob SHA returned by publishing and verifies the served
event fingerprint. Only then can it report “Calendar is live.” A timeout leaves
publication successful but public availability unconfirmed. Browser polling
cannot shorten GitHub Actions or Pages deployment/CDN delays; visitors detect
the new static version on a subsequent visible-tab check.

No Function code, authorization policy, token acquisition, write target,
validation or concurrency protection changed. Calendar content remains under
administrator control. No actual content publication is performed by tests.
