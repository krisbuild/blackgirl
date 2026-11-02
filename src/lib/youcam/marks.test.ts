import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { whereSummary } from "../marks-shared";
import { PNG } from "pngjs";
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

describe("HD masks with a dark background layer", () => {
  it("ignores a uniform semi-transparent layer and counts only the detections on top", () => {
    const png = new PNG({ width: 200, height: 200 });
    for (let i = 0; i < 200 * 200; i++) png.data.set([61, 61, 61, 51], i * 4); // HD grey background
    for (const [cx, cy] of [[50, 50], [150, 60], [100, 150]])
      for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 4; x <= cx + 4; x++) png.data.set([41, 226, 243, 170], (y * 200 + x) * 4);
    const m = decodeMask(PNG.sync.write(png));
    expect(countMarks(m, { threshold: 32 }).count).toBe(3);
  });
});
