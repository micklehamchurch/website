# Reader copyright presentation — 19 October 2026

This supersedes Phase A's conservative full-visible-notice presentation decision.

Reviewed authoritative sources:

- [API.Bible Terms §7 and Appendix A](https://api.bible/terms-and-conditions): identify the translation in context, link to full copyright information, cite/link the rights holder and API.Bible. Appendix A explicitly provides a shortened space-constrained format with abbreviation, copyright years, organisation and rights reservation. Special publisher terms override general formatting guidance.
- [Provider quick reference](https://care.api.bible/article/396-licensing-policies-quick-reference): retain attribution alongside copyrighted Scripture.
- [Biblica permissions](https://www.biblica.com/permissions-old/): express licensing through API.Bible is available for qualifying noncommercial websites; proper copyright acknowledgement is required. The general 500-verse quotation exception is not treated as the reader's licence.
- [Biblica terms](https://www.biblica.com/terms-of-use/): NIV/NIrV are copyrighted trademarks. Church bulletin exceptions are not assumed to authorise removing website attribution.

The public translation metadata identifies local abbreviations NIV and NIrV. The current chapter notices identify Biblica and their copyright years. No account credentials or private licence agreement were accessed or changed. This implements the platform's published compact format, not an invented church-only exception. No metadata indicating a stricter display instruction was returned by the existing public integration.

Visible footer, followed by the existing linked “Scripture provided by API.Bible.”:

- NIV® © 1979, 1984, 2011 Biblica, Inc.® All rights reserved.
- NIrV® © 1995, 1996, 1998, 2014 Biblica, Inc.® All rights reserved.

The full translation name remains above Scripture. About this Bible retains the exact full provider notice, current translation, linked Biblica publisher, API.Bible link, usage reporting and local reading/Saved Places privacy information. It is available on every reading page through a native keyboard/touch-accessible named dialog. Current notice data is the source of truth: no second hard-coded copyright paragraph is maintained.

Only recognised current Biblica notice structures are shortened. Unfamiliar notices remain fully visible. Failed/loading selections do not show the previous edition's full copyright in About. Missing copyright/tracking metadata still prevents chapter display in the unchanged API reader. Reporting, backend, security, caching/quota and Saved Places storage are unchanged.

The small-print paragraph is explicitly .75rem/1.5 (12px at the default root), wraps naturally and grows with root text size/zoom. Scoped text-size-adjust prevents browser auto inflation without disabling pinch zoom. No fixed footer height, clipping, overlay, tooltip or watermark is used. Pagination observes the notice height so recovered space can become Scripture space while preserving the semantic reading offset.
