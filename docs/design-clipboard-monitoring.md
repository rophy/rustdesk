# Design: Clipboard Activity Monitoring

## Problem

RustDesk has file transfer auditing (`post_file_audit()` → `{api-server}/api/audit/file`)
but no text clipboard auditing. The OSS server (hbbs/hbbr) has no API server — the
api-server is a separate HTTP service, provided commercially by RustDesk Pro.

## Goal

Log all clipboard transfers (text and file, both directions) for compliance and security
monitoring, independent of clipboard direction policy.

## Background: The API Server

The `api-server` is a separate HTTP service, distinct from hbbs/hbbr. It provides
the management plane for RustDesk deployments:

| Category | Endpoints | Features |
|----------|-----------|----------|
| **Audit** | `/api/audit/conn`, `/api/audit/file`, `/api/audit/alarm` | Connection, file transfer, and security event logging |
| **Heartbeat** | `/api/heartbeat`, `/api/sysinfo` | Device inventory, online status, remote config push |
| **Auth** | `/api/login-options`, `/api/oidc/auth` | OIDC/SSO login |
| **Device** | `/api/devices/cli`, `/api/devices/deploy` | Device provisioning |
| **Recording** | `/api/record` | Session recording upload |
| **Address Book** | (various) | Shared device lists, groups, tags |

The heartbeat response can **push config** to devices (`strategy.config_options`),
providing an alternative to `RustDesk2.toml` preseed for remote configuration management.

Configured via `api-server` option in `RustDesk2.toml`, or auto-derived from hbbs
address (port - 2, e.g. 21116 → 21114).

## Community API Server Implementations

Several open-source projects implement the RustDesk api-server contract:

| Project | Stars | Forks | Language | Last Updated | Features |
|---------|-------|-------|----------|-------------|----------|
| [lejianwen/rustdesk-api](https://github.com/lejianwen/rustdesk-api) | 3,104 | 732 | Go | 2025-09 | Most complete: web admin UI, OIDC, audit, address book |
| [lantongxue/rustdesk-api-server-pro](https://github.com/lantongxue/rustdesk-api-server-pro) | 351 | 89 | Go | 2026-04 | All client APIs, web UI |
| [sctg-development/sctgdesk-api-server](https://github.com/sctg-development/sctgdesk-api-server) | 141 | 38 | TypeScript | 2025-12 | Swagger docs at `/api/doc`, OAuth2 |

**None implement `/api/audit/clipboard`** — that is our custom addition.

## Recommendation: Fork lejianwen/rustdesk-api

Rather than building from scratch, fork the most mature community implementation and
add clipboard audit support. Benefits:

- Address book, OIDC, device management, audit — all working out of the box
- Web admin UI for managing devices and viewing audit logs
- Remote config push via heartbeat — can enforce settings without custom.txt
- Go — small binary, easy to containerize and deploy in K8s
- Only need to add one endpoint: `/api/audit/clipboard`

## Scope

### 1. API Server (fork of lejianwen/rustdesk-api)

Add `/api/audit/clipboard` endpoint to the existing audit module. Store alongside
connection and file audit events in the same database.

### 2. Client-Side: Text Clipboard Audit Calls (rophy/rustdesk fork)

Add `post_clipboard_audit()` mirroring the existing `post_file_audit()` pattern.

#### Existing File Audit (for reference)

`src/server/connection.rs:1530-1565` — `post_file_audit()`:
- POST to `{api-server}/api/audit/file`
- Payload: device ID, peer ID, connection ID, file path, type, nonce
- Retries with backoff (10s, 30s) up to 120s deadline
- Nonce for server-side deduplication

#### Insertion Points for Text Clipboard

**Inbound (client→server):**
- `src/server/connection.rs:3237` — `Clipboard(cb)` message received
- `src/server/connection.rs:3265` — `MultiClipboards(_mcb)` message received

**Outbound (server→client):**
- `src/server/clipboard_service.rs:89` — clipboard message sent to subscribers

#### Proposed `post_clipboard_audit()`

```rust
fn post_clipboard_audit(peer_id: &str, conn_id: i32, direction: &str, content_length: usize) {
    // mirrors post_file_audit() pattern
    // POST to {api-server}/api/audit/clipboard
}
```

Payload:

```json
{
  "id": "<device_id>",
  "uuid": "<device_uuid>",
  "peer_id": "<remote_peer_id>",
  "conn_id": 123,
  "direction": "inbound",
  "content_length": 1024,
  "blocked": false,
  "nonce": "<uuid-v4>",
  "timestamp": "2026-09-10T12:00:00Z"
}
```

**Content is NOT sent** — only metadata. Data is e2e encrypted and the audit server
should not see plaintext clipboard content.

~30 lines in `src/server/connection.rs` + `src/server/clipboard_service.rs`.

## Architecture

```
RustDesk Client (controlled device)
  │
  │ POST /api/audit/clipboard  (text clipboard events)
  │ POST /api/audit/file       (file transfer events)
  │ POST /api/audit/conn       (connection events)
  │ POST /api/heartbeat        (device status, every 15s)
  │ POST /api/sysinfo          (device inventory)
  │
  ▼
Istio VirtualService (rustdesk.example.com:443)
  │
  ├── /ws/id       → hbbs:21118
  ├── /ws/relay    → hbbr:21119
  ├── /api/*       → rustdesk-api:8080
  └── /            → webclient:80
  │
  ▼
rustdesk-api (fork of lejianwen/rustdesk-api)
  │
  ├── Audit: connections, files, clipboard, alarms
  ├── Device management: heartbeat, sysinfo, address book
  ├── Auth: OIDC/SSO login
  ├── Config push: remote settings via heartbeat response
  └── Web admin UI
```

Note: With the api-server handling all `/api/*` routes, the webclient nginx
`/api/` catch-all (returning 200) should be removed or made a fallback only
for paths the api-server doesn't handle.

## Deployment

Deploy as a fourth component in the Helm chart:

```yaml
apiServer:
  enabled: false
  image:
    registry: ghcr.io
    repository: rophy/rustdesk-api
    tag: "0.1.0"
  replicas: 1
  env:
    DB_DRIVER: sqlite
    DB_DSN: /data/rustdesk-api.db
  persistence:
    enabled: true
    size: 1Gi
```

Client configuration in `RustDesk2.toml`:

```toml
[options]
api-server = 'https://rustdesk.example.com'
```

Same domain as hbbs/hbbr/webclient — Istio routes `/api/*` to the api-server.

## Repos

| Repo | Purpose |
|------|---------|
| `rophy/rustdesk` | Add `post_clipboard_audit()` calls (~30 lines) |
| `rophy/rustdesk-api` (fork of lejianwen/rustdesk-api) | Add `/api/audit/clipboard` endpoint |
| `rophy/rustdesk-charts` | Add api-server component, update VirtualService routes |

## Additional Value from API Server

Beyond clipboard monitoring, deploying the api-server enables:

- **Remote config push** — heartbeat response can set device options, potentially
  replacing `RustDesk2.toml` preseed and providing remote enforcement of settings
  like `one-way-clipboard-redirection` (see design-config-enforcement.md)
- **Device inventory** — sysinfo gives visibility into all deployed devices
- **Connection audit** — already built-in, no client patch needed
- **Address book** — shared device lists for users
- **OIDC login** — SSO integration with corporate identity provider

## Open Questions

- Should we evaluate `lantongxue/rustdesk-api-server-pro` instead? (More recently active)
- Does the heartbeat config push fully replace the need for custom.txt enforcement?
- Retention policy for audit logs?
- Do we need the web admin UI exposed externally, or internal only?

## Related

- [design-clipboard-direction.md](design-clipboard-direction.md) — clipboard direction control
- [design-config-enforcement.md](design-config-enforcement.md) — protecting settings
- [design-trusted-builds.md](design-trusted-builds.md) — custom builds and attestation
