import { describe, expect, it } from "vitest";
import live from "../../fixtures/skin-analysis-live-2026-11-01.json";
import { parseSkinResults } from "./youcam/skinAnalysis";
import { bandOf, CONCERNS, ingredientPicks, insightsFrom } from "./insights";

const BANNED = /\b(treat|treats|treatment|cure|cures|diagnos(e|is|ed)|flaws?|fix your skin)\b/i;

describe("bandOf", () => {
  it("maps raw scores to bands (higher = clearer)", () => {
    expect(bandOf(92)).toBe("clear");
    expect(bandOf(80)).toBe("clear");
    expect(bandOf(70)).toBe("mild");
    expect(bandOf(55)).toBe("moderate");
    expect(bandOf(30)).toBe("noticeable");
  });
});

describe("insights from a real YouCam response", () => {
  const parsed = parseSkinResults(live.data.results);
  const insights = insightsFrom(parsed.concerns);

  it("leads with dark marks and only includes concerns we explain", () => {
    expect(insights[0].concern).toBe("age_spot");
    expect(insights.every((i) => CONCERNS[i.concern])).toBe(true);
  });

  it("flags redness as less reliable on deep skin", () => {
    expect(insights.find((i) => i.concern === "redness")?.caveat).toMatch(/deep skin/);
  });

  it("always recommends sunscreen and matches oily skin to a gel moisturiser", () => {
    const picks = ingredientPicks(insights, parsed.skinType);
    expect(picks[0].name).toMatch(/Sunscreen/);
    expect(picks.some((p) => /gel moisturiser/i.test(p.name))).toBe(true);
  });
});

describe("dark-mark picks", () => {
  it("suggests azelaic acid, niacinamide and vitamin C when dark marks show", () => {
    const picks = ingredientPicks(insightsFrom([{ concern: "age_spot", rawScore: 55 }]));
    const names = picks.map((p) => p.name).join(" | ");
    expect(names).toMatch(/Azelaic/);
    expect(names).toMatch(/Niacinamide/);
    expect(names).toMatch(/Vitamin C/);
  });
});

describe("copy rules", () => {
  it("uses cosmetic language only (no treat / cure / diagnose / flaws)", () => {
    const allCopy = [
      ...Object.values(CONCERNS).flatMap((c) => [c.label, c.what, ...Object.values(c.says), c.caveat ?? ""]),
      ...ingredientPicks(
        insightsFrom(Object.keys(CONCERNS).map((concern) => ({ concern, rawScore: 40 }))),
        { whole: "Oily" },
      ).flatMap((p) => [p.name, p.why, p.how, p.for]),
    ].join("\n");
    expect(allCopy).not.toMatch(BANNED);
  });
});
