import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { imageSize } from "./imageSize";

describe("imageSize", () => {
  it("reads JPEG dimensions", () => {
    expect(imageSize(readFileSync("public/showcase/portrait-close.jpg"))).toEqual({ width: 713, height: 951 });
    expect(imageSize(readFileSync("public/showcase/portrait.jpg"))).toEqual({ width: 1086, height: 1448 });
  });
  it("reads PNG dimensions", () => {
    expect(imageSize(readFileSync("public/showcase/scan/acne.png"))).toEqual({ width: 713, height: 951 });
  });
  it("returns null for other data", () => {
    expect(imageSize(new Uint8Array([1, 2, 3]))).toBeNull();
  });
});
