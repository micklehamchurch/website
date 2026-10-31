# Admin Dashboard authentication and section access

Microsoft sign-in uses the existing MSAL Browser authorization-code flow with PKCE.
Graph User.Read obtains display information only; it never grants content access.
The separate Admin API token is sent as a bearer token with credentials omitted.
MSAL 4.30.0 remains pinned; this phase does not migrate the app registration or SDK.
Application IDs, authority and API scope/host are centralized in auth-config.mjs.

Azure Easy Auth authenticates requests before the trusted principal header is
parsed. The application preserves strict immutable Microsoft identity bindings.
Email and display names are labels, not authorization keys. Active permissions
come from the private Azure permission store, never GitHub or browser assertions.

The interface consumes access/session. An owner receives all registered content
sections and Website Administration; an editor receives only granted sections.
Each protected API operation independently enforces its section or owner role.
Frontend visibility does not establish security. Revocation applies to the next
protected request even while the Microsoft token remains valid.

Pending account presentation records a candidate identity with ZERO content
access. An owner must review and approve it; no invitation links or automatic
email-based activation exist. The access roster and identity diagnostics are
owner-only. The legacy immutable allowlist remains only for the controlled initial
bootstrap and explicitly configured legacy staging mode, not as an outage fallback.

When ADMIN_ACCESS_MODE is capabilities, missing/corrupt/unavailable private state
fails closed. The guarded deployment transition checks actual private owner
read-back and the served Admin assets before changing that setting. Routine
future deployments never silently reactivate a deliberately rolled-back setting.

See [rollout and recovery](PHASE3-ACCESS-ROLLOUT.md). Credentials, private permission
records and bootstrap input must never be committed, logged or placed in static
website output. Easy Auth exclusions and public reviewer/Bible routes are unchanged.
