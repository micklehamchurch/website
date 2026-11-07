# Home From our parish preview

Baseline f16f25ef18586f6b36537f414af0e53218d0d8d2. Only the former Harvest carousel column is replaced; About retains its existing neighbouring column.

build-news-hub.js writes the canonical news-feed.json then invokes home-news-render.cjs. It selects the first three eligible date-ordered items from that canonical projection using news-feed-model.select; no additional editable list, browser fetch or duplicated eligibility rule exists. PDF-only uploads remain excluded by the canonical builder. New published items promote automatically and the fourth leaves Home, not News. Fewer than three render only available entries.

Home uses an independent compact renderer, leaving the News landing unchanged. Large preview62%/recent38% inside the existing news column when that column is at least560px wide; narrower columns stack naturally. Phone feature image140px (125px on narrow columns); wide image210px, short landscape120px. Secondary previews are compact horizontal rows with no excerpts; latest excerpt clamps at two lines. Existing artwork640/1280w is reused, all below-fold images lazy with fixed media geometry. Missing/failed images use the canonical News placeholder via inert templates and a small error handler. No extra model/data download on Home.

The build workflow's existing scoped News path includes these files and updates the preview without regenerating unrelated date-sensitive service data. Normal source publication builds still run the full pipeline and thus refresh both News and Home.

Current items:25October Pews News (rich autumn);18October Pews News (quiet autumn);4October A Harvest of Thankfulness (genuine welcome-doors photograph). No new image assets.

Tests preserve every byte of Home markup outside the selected news column and two new asset includes, and preserve News/feed/edition outputs. They cover newest promotion, fewer items, escaping, artwork identity, truthful fallback and preservation of the independent Gallery and Sunday Services playlist.
