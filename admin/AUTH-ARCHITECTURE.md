# Admin Dashboard authentication boundary

The Admin Dashboard uses MSAL Browser with the Microsoft identity platform authorization-code flow and PKCE. Its browser-side Graph `User.Read` check controls the demonstration UI only. The static GitHub Pages site cannot enforce authorization, protect repository content, or safely publish changes.

When a secure publishing API is added, it must independently validate the Microsoft access token (including issuer, audience, signature and lifetime) and authorize the signed-in identity on the server before any repository operation. Keep GitHub credentials and all other secrets in that server-side service. Never trust the frontend allow-list or a browser-provided identity claim as authorization to write to the repository.

MSAL Browser 4.30.0 is pinned as the supported LTS release for the app registration's existing same-page `/website/admin/` redirect. MSAL Browser 5 introduces a dedicated redirect-bridge requirement; adopting v5 would require registering and deploying the bridge URI with Microsoft Entra first.

The dashboard keeps Microsoft Graph `User.Read` and the Church Admin API delegated scope as separate MSAL token requests. After Graph has verified the authorised profile, the Overview may silently request the API scope and call only the Easy Auth-protected `GET /api/health` endpoint. If MSAL requires interaction or consent, the dashboard waits for the editor to choose its Authorise connection button before opening the API-scope popup. This health check does not enable content publishing, GitHub calls, or repository writes.
