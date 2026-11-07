# Homepage Next Service: Sunday TODAY Zoom mode

Requested baseline: 1994f5454a1880c537cf7e6ba3ca924b587e11dd. Actual starting Dev: 15cd7bb6b88ff77933c73910e1c0ded096c9c592, preserving the newer Community navigation label refinement. Main remains unchanged.

The existing selector, London formatter, Calendar projection/configuration and data are unchanged. A pure zoomMode helper requires a selected service labelled TODAY, its start date equal to the current London date, and that London date be Sunday. Dates use the existing Intl Europe/London formatter and UTC-noon weekday arithmetic; GMT/BST and non-UK visitors are handled without using device-local weekday.

The existing render loop calls the unchanged chooser and sets one native whole-card anchor. Zoom mode uses the exact editor-supplied Zoom URL, target=_blank and rel=noopener noreferrer. A small gold JOIN ONLINE · ZOOM span is appended to the existing TODAY label. No camera icon, extra button/link, interception, modal or automatic navigation. Accessible name retains service details and adds Join online via Zoom (opens in a new tab). Normal accessible names are unchanged.

Every render clears stale state: ordinary mode restores the original Calendar detail/fallback href, removes target/rel and has-zoom, and label text reset removes the indicator. Advancing to NEXT SUNDAY after the existing start cutoff therefore also removes Zoom. An unavailable/missing service never activates Zoom. Title, date, time and location rendering remain untouched.

Existing aligned minute refresh and visibility handler supply automatic rollover/recovery; no new timer or server is introduced. At London midnight the next existing refresh updates the card, subject to the same browser scheduling as before. The selector's existing minute-refresh/start-time behaviour is preserved rather than extending a service's availability.

Only Zoom mode applies flex wrapping to the gold label. Main card geometry, focus outline, responsive and reduced-motion rules are unchanged; at tested short-landscape sizes the label can add one approximately14px line, while desktop/tablet/phone card heights otherwise stay the same. Indicator is readable with enlarged text.

The URL is intentionally public JavaScript as accepted by the editor. No separately visible Meeting ID/passcode and no backend protection, Azure changes or Zoom widget. Testing intercepts the Zoom destination to prove native keyboard new-tab navigation without joining a meeting.

Assets: existing bundled home-critical.css rebuilt from its existing manifest after the scoped CSS addition; index.html changes only the CSS hash and Next Service JS version. A prior Giving preservation test now normalizes only these two homepage delivery references. CI has a scoped branch that rebuilds the homepage presentation bundle without touching service/calendar data or other page bodies.
