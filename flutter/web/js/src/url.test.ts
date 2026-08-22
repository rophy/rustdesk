import { describe, it, expect, beforeEach, vi } from "vitest";
import { setConfig, getDefaultUri, getHost, getRelayHost, getConfigKey, loadConfig, resolveUri } from "./url";

describe("resolveUri", () => {
  it("resolves path to wss:// on HTTPS page", () => {
    Object.defineProperty(globalThis, "location", {
      value: { protocol: "https:", host: "rustdesk.corp.com" },
      writable: true,
    });
    expect(resolveUri("/hbbs")).toBe("wss://rustdesk.corp.com/hbbs");
    expect(resolveUri("/hbbr")).toBe("wss://rustdesk.corp.com/hbbr");
  });

  it("resolves path to ws:// on HTTP page", () => {
    (globalThis as any).location = { protocol: "http:", host: "localhost:8080" };
    expect(resolveUri("/hbbs")).toBe("ws://localhost:8080/hbbs");
  });

  it("returns full URI as-is", () => {
    expect(resolveUri("wss://example.com/hbbs")).toBe("wss://example.com/hbbs");
    expect(resolveUri("ws://127.0.0.1:21118")).toBe("ws://127.0.0.1:21118");
  });

  it("returns host:port as-is", () => {
    expect(resolveUri("myserver.com:21118")).toBe("myserver.com:21118");
  });
});

describe("getDefaultUri", () => {
  beforeEach(() => {
    setConfig("/hbbs", "/hbbr", "");
    (globalThis as any).location = { protocol: "https:", host: "rustdesk.corp.com" };
  });

  it("defaults resolve to same-origin wss paths", () => {
    expect(getDefaultUri()).toBe("wss://rustdesk.corp.com/hbbs");
    expect(getDefaultUri(true)).toBe("wss://rustdesk.corp.com/hbbr");
  });

  it("returns full wss:// host URL without modification", () => {
    setConfig("wss://rustdesk.example.com/hbbs", "wss://rustdesk.example.com/hbbr", "");
    expect(getDefaultUri()).toBe("wss://rustdesk.example.com/hbbs");
  });

  it("returns full wss:// relay URL without modification", () => {
    setConfig("wss://rustdesk.example.com/hbbs", "wss://rustdesk.example.com/hbbr", "");
    expect(getDefaultUri(true)).toBe("wss://rustdesk.example.com/hbbr");
  });

  it("returns full ws:// URL without modification", () => {
    setConfig("ws://127.0.0.1:12022/hbbs", "ws://127.0.0.1:12022/hbbr", "");
    expect(getDefaultUri()).toBe("ws://127.0.0.1:12022/hbbs");
    expect(getDefaultUri(true)).toBe("ws://127.0.0.1:12022/hbbr");
  });

  it("falls back to HOST when RELAY_HOST is empty", () => {
    setConfig("/hbbs", "", "");
    expect(getDefaultUri(true)).toBe("wss://rustdesk.corp.com/hbbs");
  });

  it("returns relay when relay is set", () => {
    setConfig("host.example.com:21116", "relay.example.com:21117", "");
    expect(getDefaultUri(true)).toBe("relay.example.com:21117");
  });
});

describe("setConfig / getters", () => {
  it("stores and retrieves host, relay, and key", () => {
    setConfig("myhost", "myrelay", "mykey123");
    expect(getHost()).toBe("myhost");
    expect(getRelayHost()).toBe("myrelay");
    expect(getConfigKey()).toBe("mykey123");
  });
});

describe("loadConfig", () => {
  beforeEach(() => {
    setConfig("", "", "");
  });

  it("loads config from fetch response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        host: "wss://test.example.com/hbbs",
        relay: "wss://test.example.com/hbbr",
        key: "testkey123",
      }),
    });
    await loadConfig();
    expect(getHost()).toBe("wss://test.example.com/hbbs");
    expect(getRelayHost()).toBe("wss://test.example.com/hbbr");
    expect(getConfigKey()).toBe("testkey123");
  });

  it("keeps defaults when fetch fails", async () => {
    setConfig("default-host", "", "");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network error"));
    await loadConfig();
    expect(getHost()).toBe("default-host");
  });

  it("keeps defaults when response is not ok", async () => {
    setConfig("default-host", "", "");
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false });
    await loadConfig();
    expect(getHost()).toBe("default-host");
  });

  it("handles partial config (only host)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ host: "partial-host" }),
    });
    await loadConfig();
    expect(getHost()).toBe("partial-host");
    expect(getRelayHost()).toBe("");
    expect(getConfigKey()).toBe("");
  });

  it("loads path-based config", async () => {
    (globalThis as any).location = { protocol: "https:", host: "myapp.com" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ host: "/hbbs", relay: "/hbbr", key: "k1" }),
    });
    await loadConfig();
    expect(getDefaultUri()).toBe("wss://myapp.com/hbbs");
    expect(getDefaultUri(true)).toBe("wss://myapp.com/hbbr");
  });
});
