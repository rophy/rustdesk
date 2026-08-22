# RustDesk Web Client

OSS-compatible web client for [RustDesk](https://rustdesk.com) remote desktop, built from the official Flutter web source with patches for hbbs/hbbr (non-Pro) servers.

## Quick Start

Behind a reverse proxy with path-based routing (recommended):

```bash
docker run -d -p 8080:80 \
  -e RUSTDESK_KEY=your-public-key \
  rophy/rustdesk-webclient
```

The web client defaults to same-origin WebSocket paths `/hbbs` and `/hbbr`, with `ws://` or `wss://` selected automatically based on the page protocol. No host configuration needed.

For split-domain deployments (hbbs/hbbr on a different host):

```bash
# Plain WebSocket (development)
docker run -d -p 8080:80 \
  -e RUSTDESK_HOST=ws://hbbs.example.com:21118 \
  -e RUSTDESK_RELAY=ws://hbbr.example.com:21119 \
  -e RUSTDESK_KEY=your-public-key \
  rophy/rustdesk-webclient

# Secure WebSocket via TLS-terminating proxy
docker run -d -p 8080:80 \
  -e RUSTDESK_HOST=wss://hbbs.example.com/ws \
  -e RUSTDESK_RELAY=wss://hbbr.example.com/ws \
  -e RUSTDESK_KEY=your-public-key \
  rophy/rustdesk-webclient
```

Then open http://localhost:8080 in a browser.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RUSTDESK_KEY` | **Yes** | | Server public key |
| `RUSTDESK_HOST` | No | `/hbbs` | Rendezvous server (hbbs). Path (e.g. `/hbbs`) or full URI (e.g. `ws://host:21118`) |
| `RUSTDESK_RELAY` | No | `/hbbr` | Relay server (hbbr). Path (e.g. `/hbbr`) or full URI (e.g. `ws://host:21119`) |

When `RUSTDESK_HOST` or `RUSTDESK_RELAY` is a path (starts with `/`), the WebSocket scheme is derived from the page: `wss://` on HTTPS, `ws://` on HTTP. Full URIs are used as-is.

## Reverse Proxy Setup

The proxy must route WebSocket connections to hbbs/hbbr:

| Path | Backend | Protocol |
|------|---------|----------|
| `/hbbs` | hbbs:21118 | WebSocket |
| `/hbbr` | hbbr:21119 | WebSocket |
| `/` | webclient:80 | HTTP |

The proxy should terminate TLS and support WebSocket upgrade. Example with nginx:

```nginx
location /hbbs {
    proxy_pass http://hbbs:21118;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}

location /hbbr {
    proxy_pass http://hbbr:21119;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

## Source

Built from [rophy/rustdesk](https://github.com/rophy/rustdesk) using [`deploy/docker/webclient/Dockerfile`](https://github.com/rophy/rustdesk/blob/master/deploy/docker/webclient/Dockerfile).
