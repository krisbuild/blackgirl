import { describe, expect, it } from "vitest";
import live from "../../../fixtures/skin-analysis-live-2026-11-01.json";
import { parseSkinResults } from "./skinAnalysis";

describe("parseSkinResults (real YouCam response)", () => {
  const parsed = parseSkinResults(live.data.results);

  it("extracts every scored concern, skipping non-score entries", () => {
    expect(parsed.concerns.map((c) => c.concern)).toHaveLength(15);
    expect(parsed.concerns.find((c) => c.concern === "resize_image")).toBeUndefined();
  });

  it("keeps raw and ui scores separate", () => {
    const spots = parsed.concerns.find((c) => c.concern === "age_spot")!;
    expect(spots.rawScore).toBe(86.5);
    expect(spots.uiScore).toBe(78);
  });

  it("reads overall score, skin age and per-region skin type", () => {
    expect(parsed.overall).toBeCloseTo(77.47, 2);
    expect(parsed.skinAge).toBe(25);
    expect(parsed.skinType).toEqual({ whole: "Oily", t_zone: "Oily", u_zone: "Oily" });
  });

  it("throws when there are no scores", () => {
    expect(() => parseSkinResults({ output: [] })).toThrow();
  });
});
