/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("wasm-feature-detect", () => ({
  simd: vi.fn(),
}));

import { simd } from "wasm-feature-detect";
import { loadVp9 } from "./codec";

describe("loadVp9", () => {
  let mockDecoder: any;
  let mockLoadClass: any;

  beforeEach(() => {
    mockDecoder = {
      init: vi.fn((cb: Function) => cb(mockDecoder)),
    };
    mockLoadClass = vi.fn((className: string, callback: Function, opts: any) => {
      callback(vi.fn().mockResolvedValue(mockDecoder));
    });
    (window as any).OGVLoader = { loadClass: mockLoadClass };
    (window as any).videoCodecClass = undefined;
  });

  it("loads SIMD codec when SIMD is supported", async () => {
    vi.mocked(simd).mockResolvedValue(true);
    const callback = vi.fn();
    await loadVp9(callback);
    expect(mockLoadClass).toHaveBeenCalledWith(
      "OGVDecoderVideoVP9SIMDW",
      expect.any(Function),
      { worker: true, threading: true }
    );
    expect(callback).toHaveBeenCalledWith(mockDecoder);
  });

  it("loads non-SIMD codec when SIMD is not supported", async () => {
    vi.mocked(simd).mockResolvedValue(false);
    const callback = vi.fn();
    await loadVp9(callback);
    expect(mockLoadClass).toHaveBeenCalledWith(
      "OGVDecoderVideoVP9W",
      expect.any(Function),
      { worker: true, threading: true }
    );
    expect(callback).toHaveBeenCalledWith(mockDecoder);
  });

  it("sets window.videoCodecClass", async () => {
    vi.mocked(simd).mockResolvedValue(false);
    await loadVp9(vi.fn());
    expect((window as any).videoCodecClass).toBeDefined();
  });
});
