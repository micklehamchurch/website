# Visitor Calendar integration

The Admin Calendar remains the only source. import-calendar.js serializes the same expanded public items to calendar.ics; that file is output only. The workflow commits it with events.json and the refresh manifest.

Individual events: Google opens its standard event template, with local dates and Europe/London; Apple / Outlook downloads a single-event ICS. All-day dates retain exclusive end boundaries.

Subscription: the URL is resolved relative to the current Calendar page, preserving /website/ and supporting a future custom domain. Apple gets webcal; Google uses Other calendars → + → From URL on a computer; Outlook on the web uses Add calendar → Subscribe from web. The copy action offers selection instructions when clipboard access is unavailable. Refresh timing belongs to the visitor's calendar app, not the website's 20-second check.

Shared calendar-export.js uses SHA-256 UIDs in a permanent church namespace, independent of hostname and event edits. Moved occurrences retain their original stable event identity. Timed wall clocks are converted through Intl time-zone data to UTC, so no floating times or extra timezone component are required. Text is escaped and folded at 75 UTF-8 octets with CRLF. No Admin object is serialized; only public UID, dates, summary, description and location fields plus revision metadata are emitted.

The generated feed retains existing DTSTAMP and SEQUENCE for unchanged events. Changed events retain UID, advance SEQUENCE and receive a new DTSTAMP; removed events disappear from the current subscription snapshot. The previous generated output is read only to preserve publication metadata, never to construct the website event set. One-event downloads use their download timestamp. The feed has no event URL tied to the Dev hostname.

An unchanged rebuild should produce an identical feed. Do not regenerate it manually. The isolated Edge integration script checks local or --deployed UI, clipboard fallback, focus, responsive geometry and single-event downloads without adding events to any real calendar account.

Official workflow references:
- https://support.google.com/calendar/answer/37100
- https://support.microsoft.com/en-us/outlook/import-or-subscribe-to-a-calendar-in-outlook-com-or-outlook-on-the-web
- https://www.rfc-editor.org/rfc/rfc5545

## Apple single-event wording

The single-event action remains a standard Blob download, not webcal. Its HTML download attribute explicitly requests that behavior. Apple platform strings (including iPadOS desktop-style MacIntel) affect the label only: Apple Calendar on Apple platforms, Apple / Outlook elsewhere. This is a wording hint, not a capability guarantee. The visible help explains that one event is downloaded and import behavior depends on the calendar app.

Current Apple documentation describes subscriptions on iPhone and calendar-file import on Mac, but does not provide a guaranteed current Safari single-event handoff contract for direct HTTPS, inline content disposition, data URLs or Blob URLs. Removing download or using a proprietary scheme is therefore not justified as a reliably tested improvement. Real iPhone/iPad testing is still required; no native Apple success is claimed.

References: https://support.apple.com/en-gb/guide/iphone/iph3d1110d4/ios and https://support.apple.com/en-gb/guide/calendar/icl1023/mac ; WebKit download behavior: https://webkit.org/blog/7477/new-web-features-in-safari-10-1/ .
