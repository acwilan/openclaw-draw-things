import { describe, it, expect } from "vitest";
import { ASPECT_RATIOS, parseSize, roundTo64 } from "./core.js";

describe("Core utilities", () => {
  describe("parseSize", () => {
    it("should parse valid size strings", () => {
      expect(parseSize("1024x1024")).toEqual({ width: 1024, height: 1024 });
      expect(parseSize("512x768")).toEqual({ width: 512, height: 768 });
    });

    it("should return null for invalid size strings", () => {
      expect(parseSize("invalid")).toBeNull();
      expect(parseSize("1024")).toBeNull();
      expect(parseSize("")).toBeNull();
    });
  });

  describe("roundTo64", () => {
    it("should round to nearest multiple of 64", () => {
      // Math.round(n/64)*64
      expect(roundTo64(32)).toBe(64);   // 32/64=0.5, round=1, 1*64=64
      expect(roundTo64(100)).toBe(128); // 100/64=1.562, round=2, 2*64=128
      expect(roundTo64(1024)).toBe(1024); // exactly 16*64
      expect(roundTo64(1000)).toBe(1024); // 1000/64=15.625, round=16, 16*64=1024
      expect(roundTo64(1025)).toBe(1024); // 1025/64=16.015, round=16, 16*64=1024
    });
  });

  describe("ASPECT_RATIOS", () => {
    it("should contain common aspect ratios", () => {
      expect(ASPECT_RATIOS["1:1"]).toEqual({ width: 1024, height: 1024 });
      expect(ASPECT_RATIOS["16:9"]).toEqual({ width: 1344, height: 768 });
      expect(ASPECT_RATIOS["9:16"]).toEqual({ width: 768, height: 1344 });
    });
  });
});

describe("Plugin exports", () => {
  it("should have a default export", async () => {
    const module = await import("./index.js");
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe("object");
  });
});
