# RustDesk Web Client

OSS-compatible web client for [RustDesk](https://rustdesk.com) remote desktop, built from the official Flutter web source with patches for hbbs/hbbr (non-Pro) servers.

## Quick Start

```bash
docker run -d -p 8080:80 \
  -e RUSTDESK_HOST=wss://your-server.com/hbbs \
  -e RUSTDESK_RELAY=wss://your-server.com/hbbr \
  -e RUSTDESK_KEY=your-public-key \
  rophy/rustdesk-webclient
```

Then open http://localhost:8080 in a browser.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RUSTDESK_HOST` | Yes | WebSocket URL of the rendezvous server (hbbs) |
| `RUSTDESK_RELAY` | No | WebSocket URL of the relay server (hbbr). Defaults to `RUSTDESK_HOST` |
| `RUSTDESK_KEY` | No | Server public key |
| `RUSTDESK_API` | No | API server URL (only for Server Pro) |

## With Reverse Proxy

When running behind a reverse proxy (nginx, Istio, etc.) that terminates TLS:

```bash
docker run -d -p 8080:80 \
  -e RUSTDESK_HOST=wss://rustdesk.example.com/hbbs \
  -e RUSTDESK_RELAY=wss://rustdesk.example.com/hbbr \
  -e RUSTDESK_KEY=your-public-key \
  rophy/rustdesk-webclient
```

The proxy should route `/hbbs` to hbbs port 21118 and `/hbbr` to hbbr port 21119 with WebSocket upgrade support.

## Source

Built from [rophy/rustdesk](https://github.com/rophy/rustdesk) using [`deploy/docker/webclient/Dockerfile`](https://github.com/rophy/rustdesk/blob/master/deploy/docker/webclient/Dockerfile).
