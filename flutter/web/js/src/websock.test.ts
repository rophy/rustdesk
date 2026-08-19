import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./message.js", () => ({
  Message: {
    encode: vi.fn(() => ({ finish: () => new Uint8Array([1, 2]) })),
    fromPartial: vi.fn((v: any) => v),
    decode: vi.fn((data: Uint8Array) => ({ decoded: true, data })),
  },
}));

vi.mock("./rendezvous.js", () => ({
  RendezvousMessage: {
    encode: vi.fn(() => ({ finish: () => new Uint8Array([3, 4]) })),
    fromPartial: vi.fn((v: any) => v),
    decode: vi.fn((data: Uint8Array) => ({ rendezvous: true, data })),
  },
}));

vi.mock("./globals", () => ({
  encrypt: vi.fn((data: Uint8Array, nonce: number, key: Uint8Array) => {
    const out = new Uint8Array(data.length + 1);
    out.set(data);
    out[data.length] = 0xee;
    return out;
  }),
  decrypt: vi.fn((data: Uint8Array, nonce: number, key: Uint8Array) => {
    return data.slice(0, data.length - 1);
  }),
}));

let mockWsInstances: any[] = [];

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.CONNECTING;
  binaryType = "";
  protocol = "";
  onmessage: ((e: any) => void) | null = null;
  onopen: (() => void) | null = null;
  onclose: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  sent: any[] = [];

  constructor(url: string) {
    this.url = url;
    mockWsInstances.push(this);
  }

  send(data: any) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(data: ArrayBuffer) {
    this.onmessage?.({ data });
  }

  simulateClose(code = 1000) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code });
  }

  simulateError(err: any) {
    this.onerror?.(err);
  }
}

(globalThis as any).WebSocket = MockWebSocket;
(globalThis as any).window = globalThis;

import Websock from "./websock";

describe("Websock", () => {
  beforeEach(() => {
    mockWsInstances = [];
  });

  it("creates WebSocket with given URI", () => {
    const ws = new Websock("ws://test:1234");
    expect(mockWsInstances).toHaveLength(1);
    expect(mockWsInstances[0].url).toBe("ws://test:1234");
  });

  it("open resolves on successful connection", async () => {
    const ws = new Websock("ws://test:1234");
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await expect(openPromise).resolves.toBe(ws);
  });

  it("open rejects on timeout", async () => {
    const ws = new Websock("ws://test:1234");
    await expect(ws.open(50)).rejects.toBe("Timeout");
  });

  it("open rejects on close before open", async () => {
    const ws = new Websock("ws://test:1234");
    const openPromise = ws.open(5000);
    mockWsInstances[0].simulateClose(1006);
    await expect(openPromise).rejects.toBe("Reset by the peer");
  });

  it("open rejects on error before open", async () => {
    const ws = new Websock("ws://test:1234", true);
    const openPromise = ws.open(5000);
    mockWsInstances[0].simulateError("fail");
    await expect(openPromise).rejects.toContain("Failed to connect");
  });

  it("latency is calculated on open", async () => {
    const ws = new Websock("ws://test:1234");
    const openPromise = ws.open(1000);
    await new Promise((r) => setTimeout(r, 20));
    mockWsInstances[0].simulateOpen();
    await openPromise;
    expect(ws.latency()).toBeGreaterThanOrEqual(0);
  });

  it("sendRendezvous sends encoded data", async () => {
    const ws = new Websock("ws://test:1234");
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    ws.sendRendezvous({ testField: true } as any);
    expect(mockWsInstances[0].sent).toHaveLength(1);
  });

  it("sendMessage sends encoded data", async () => {
    const ws = new Websock("ws://test:1234", false);
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    ws.sendMessage({ testField: true } as any);
    expect(mockWsInstances[0].sent).toHaveLength(1);
  });

  it("sendMessage encrypts when secret key is set", async () => {
    const ws = new Websock("ws://test:1234", false);
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    ws.setSecretKey(new Uint8Array(32));
    ws.sendMessage({ testField: true } as any);
    expect(mockWsInstances[0].sent).toHaveLength(1);
  });

  it("receives and buffers rendezvous messages", async () => {
    const ws = new Websock("ws://test:1234", true);
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    mockWsInstances[0].simulateMessage(new Uint8Array([1, 2, 3]).buffer);
    const msg = await ws.next(1000);
    expect(msg).toHaveProperty("rendezvous", true);
  });

  it("receives and decrypts messages with secret key", async () => {
    const ws = new Websock("ws://test:1234", false);
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    ws.setSecretKey(new Uint8Array(32));
    mockWsInstances[0].simulateMessage(new Uint8Array([1, 2, 3]).buffer);
    const msg = await ws.next(1000);
    expect(msg).toHaveProperty("decoded", true);
  });

  it("next rejects on timeout when no messages", async () => {
    const ws = new Websock("ws://test:1234", true);
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    await expect(ws.next(50)).rejects.toBe("Timeout");
  });

  it("close clears status and closes websocket", async () => {
    const ws = new Websock("ws://test:1234");
    const openPromise = ws.open(1000);
    mockWsInstances[0].simulateOpen();
    await openPromise;
    ws.close();
    expect(mockWsInstances[0].readyState).toBe(MockWebSocket.CLOSED);
  });

  it("on/off manages event handlers", () => {
    const ws = new Websock("ws://test:1234");
    const handler = vi.fn();
    ws.on("message", handler);
    ws.off("message");
  });

  it("parseMessage decodes message data", () => {
    const ws = new Websock("ws://test:1234", false);
    const result = ws.parseMessage(new Uint8Array([1]));
    expect(result).toHaveProperty("decoded", true);
  });

  it("parseRendezvous decodes rendezvous data", () => {
    const ws = new Websock("ws://test:1234", true);
    const result = ws.parseRendezvous(new Uint8Array([1]));
    expect(result).toHaveProperty("rendezvous", true);
  });
});
