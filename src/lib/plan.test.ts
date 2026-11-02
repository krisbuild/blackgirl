import { describe, expect, it } from "vitest";
import { buildPlan, markAgeMonths } from "./plan";

const BANNED = /\b(treat|treats|treatment|cure|cures|diagnos(e|is|ed)|flaws?|fix your skin)\b/i;
const text = (p: ReturnType<typeof buildPlan>) =>
  [p.headline, p.ageSummary, p.timeline, ...p.habits, p.dermatologist.reason, ...p.dermatologist.askAbout,
   ...p.phases.flatMap((ph) => [ph.title, ph.goal, ...ph.steps.flatMap((s) => [s.name, s.note])])].join("\n");

describe("markAgeMonths", () => {
  it("uses the larger of the user's answer and our tracking", () => {
    expect(markAgeMonths("1-3m", 0)).toBe(2);
    expect(markAgeMonths("lt1m", 26)).toBeCloseTo(6, 0);
    expect(markAgeMonths("unsure", 0)).toBeNull();
    expect(markAgeMonths(undefined, 8)).toBeCloseTo(1.8, 1);
  });
});

describe("buildPlan", () => {
  it("calms active acne first, because new spots leave new marks", () => {
    const p = buildPlan({ darkMarks: 55, acne: 60 });
    expect(p.headline).toMatch(/Calm the breakouts/);
    expect(p.phases[0].title).toBe("Calm & protect");
    expect(p.phases[0].steps.map((s) => s.name).join()).toMatch(/Benzoyl peroxide/);
  });

  it("adds a fading phase with azelaic acid and niacinamide when marks show", () => {
    const p = buildPlan({ darkMarks: 60, acne: 90 });
    const fade = p.phases.find((ph) => ph.title === "Fade");
    expect(fade?.steps.map((s) => s.name).join()).toMatch(/Azelaic.*Niacinamide/);
  });

  it("treats older marks as stubborn: retinoid phase, longer timeline, dermatologist note", () => {
    const p = buildPlan({ darkMarks: 70, acne: 90, onset: "gt1y" });
    expect(p.phases.some((ph) => ph.title === "Renew")).toBe(true);
    expect(p.timeline).toMatch(/6–12 months/);
    expect(p.dermatologist.show).toBe(true);
    expect(p.dermatologist.askAbout.join()).toMatch(/laser/i);
  });

  it("believes the user when the scan reads clear but they report marks", () => {
    const p = buildPlan({ darkMarks: 87, acne: 90, onset: "6-12m" });
    expect(p.headline).toMatch(/Fade your dark marks/);
    expect(p.phases.some((ph) => ph.title === "Fade")).toBe(true);
  });

  it("plans for more acne when the user says the scan missed some", () => {
    const p = buildPlan({ darkMarks: 87, acne: 80, acneCount: 9, acneFeel: "more" });
    expect(p.headline).toMatch(/Calm the breakouts/);
    expect(p.dermatologist.show).toBe(true);
  });

  it("always starts with sunscreen", () => {
    const p = buildPlan({ darkMarks: 90, acne: 90 });
    expect(p.phases[0].steps.some((s) => /Sunscreen/.test(s.name))).toBe(true);
  });

  it("uses cosmetic language only", () => {
    for (const input of [{ darkMarks: 40, acne: 40, texture: 40, onset: "gt1y" as const }, { darkMarks: 85, acne: 90 }]) {
      expect(text(buildPlan(input))).not.toMatch(BANNED);
    }
  });
});
