# Bible performance measurements (Phase E)

The Azure proxy remains authoritative. Its private durable cache retains exact
provider responses for 14 days, bounded to 256 entries / approximately 6 MiB.
Its blob lease protects cache and quota across workers. Browser responses remain
`no-store`; credentials, origins, auth boundaries and quota rules are unchanged.

The reader now reuses completed responses in memory in the same top-level page.
Closing the overlay still unloads the iframe. Only response data, not old iframe
functions, is shared. Navigating/reloading the top-level page discards the cache.
Standalone readers have their own memory cache. No persistent Scripture storage.

Policy: absolute five-minute expiry (hits never extend it); at most 40 responses,
four chapters, fewer than 500 verse markers in total and 1 MiB of estimated UTF-16
response data. Oldest insertion is evicted first. Expiry is checked on access and
scheduled; suspended browser timers cannot make an expired response usable.
Keys include translation and exact endpoint path. Missing content, copyright,
tracking token, empty structural metadata, failed or oversized responses are not
cached. Callers receive copies; identical concurrent requests within one reader
share one fetch. Every displayed chapter still invokes FUMS, including cache hits.
No prefetch: it would spend limited quota and contend for the shared server lease.

API.Bible [encourages metadata caching](https://care.api.bible/article/401-caching-content),
recommends retention of 14 days or less and specifies
[fewer than 500 consecutive verses](https://docs.api.bible/common-questions/).
This smaller memory cache expires after five minutes.
[FUMS permits reusing the cached token for each display](https://care.api.bible/article/417-understanding-fums).
Existing Biblica express licensing and the approved compact/full attribution
remain in place; this is not an offline Bible or a new grant of rights.

## Repeating measurements

Use an installed Playwright package (`PLAYWRIGHT_MODULE`) and its browser location
(`PLAYWRIGHT_BROWSERS_PATH`). Run `node scripts/measure-bible-performance.cjs`.
The default target is live Dev; `BIBLE_TEST_URL` selects an isolated preview.
`BIBLE_PERF_OUTPUT` writes JSON. `BIBLE_PERF_RUNS` defaults to two per engine;
`BIBLE_PERF_ENGINE` can select chromium or webkit.
Set `BIBLE_PERF_ASSERT_CACHE=1` on the new release to assert request counts without
fragile external timing thresholds. Run `node scripts/check-bible-performance.cjs`
against the synthetic local preview for failures, timeouts and close/reopen safety.

Each trial starts a fresh browser context at 390 × 844, touch and reduced motion.
Native controls drive first choice, first passage, reopen, next, previous, read
chapter again, saved place, Continue Reading and translation there/back.
Metadata/chapter paths and timings are recorded, never bodies or tokens.
UI timing is two animation frames after DOM ready with a visible physical shell.
Passage completion includes parsing and pagination through a stable ready state.
A 220 ms observation window detects the existing 120 ms resize coalescing; it is
not added to reported passage completion. Native click actionability time is
included. Resource Timing captures CSS/JS/fonts; chapter dispatch time includes
the synchronous pagination listener and cannot be added to pagination time.

Fresh browser contexts are **browser cold-ish**, not proof of a cold Azure worker
or upstream miss. The existing API exposes no per-stage server timings, so proxy,
storage, startup and upstream cannot be separated honestly from browser timings.
Do not reset durable state to force cold measurements: it also stores quota.
No Azure configuration or backend code is changed by this release.

The existing busy guard disables selectors during a request, ignores overlapping
programmatic location requests, hides stale content, and keeps Retry. Closing
unloads that reader so its response cannot render into a new one. Pending work is
not shared between iframe lifetimes; completed validated data alone is reused.
The first previously unseen chapter still needs its normal network request.
The typography, page-fitting algorithm, resize/font corrections and gestures are
unchanged. Baseline profiling found two fitting passes, typically tens of ms;
removing them without reliable dimension equivalence would risk clipped text.

Detailed before/after samples and regression evidence accompany the delivery
report outside the deployed website. Browser emulation is not physical-device QA.
