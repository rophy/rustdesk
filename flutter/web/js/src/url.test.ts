import { describe, it, expect, beforeEach } from "vitest";
import { setConfig, getDefaultUri, getHost, getRelayHost, getConfigKey } from "./url";

describe("getDefaultUri", () => {
  beforeEach(() => {
    setConfig("", "", "");
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

  it("returns host:port as-is", () => {
    setConfig("myserver.com:21116", "", "");
    expect(getDefaultUri()).toBe("myserver.com:21116");
  });

  it("falls back to HOST when RELAY_HOST is empty", () => {
    setConfig("wss://rustdesk.example.com/hbbs", "", "");
    expect(getDefaultUri(true)).toBe("wss://rustdesk.example.com/hbbs");
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
