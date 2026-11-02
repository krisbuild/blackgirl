import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { whereSummary } from "../marks-shared";
import { alphaBox, countMarks, decodeMask } from "./marks";

// Real YouCam masks from a live scan of public/showcase/portrait-close.jpg (2026-11-02).
const load = (k: string) => decodeMask(readFileSync(`public/showcase/scan/${k}.png`));

describe("countMarks on real YouCam masks", () => {
  const face = load("moisture");
  const eyeTopY = alphaBox(load("dark_circle_v2"))!.y0;

  it("counts the cheek dark marks the whole-face score missed (score was 93.8)", () => {
    const m = countMarks(load("age_spot"), { face, eyeTopY, threshold: 32 });
    expect(m.count).toBeGreaterThanOrEqual(10);
    expect(m.count).toBeLessThanOrEqual(25);
    const cheeks = (m.zones.leftCheek ?? 0) + (m.zones.rightCheek ?? 0);
    expect(cheeks).toBeGreaterThan(m.count / 2);
    expect(m.coveragePct).toBeGreaterThan(0);
    expect(m.coveragePct).toBeLessThan(5);
    expect(whereSummary(m.zones)).toMatch(/cheek/);
  });

  it("counts the three acne rings", () => {
    const m = countMarks(load("acne"), { face, eyeTopY, threshold: 1, minAreaFrac: 0.00001 });
    expect(m.count).toBe(3);
  });

  it("returns zero for an empty mask", () => {
    const empty = { width: 10, height: 10, alpha: new Uint8Array(100) };
    expect(countMarks(empty).count).toBe(0);
  });
});
