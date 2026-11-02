import { describe, expect, it } from "vitest";
import INCI from "@/data/inci.json";
import { checkRoutine, type RoutineItem } from "./routine";

const V = INCI as Record<string, { inci: string }>;
const item = (key: string, when: RoutineItem["when"]): RoutineItem => ({ name: key, when, inci: V[key].inci, source: "catalog" });
const OILY = { oily: true, darkMarks: true, acne: true, fromScan: true };

describe("checkRoutine (real ingredient lists)", () => {
  it("flags a missing morning sunscreen and a retinoid + acid clash at night", () => {
    const r = checkRoutine(
      [
        item("CeraVe Foaming Facial Cleanser", "AM & PM"),
        item("The Ordinary Niacinamide 10% + Zinc 1%", "AM"),
        item("Differin Adapalene Gel 0.1%", "PM"),
        item("The Ordinary Mandelic Acid 10% + HA", "PM"),
      ],
      OILY,
    );
    const text = r.findings.map((f) => `${f.level}: ${f.text}`).join("\n");
    expect(text).toMatch(/warn: No sunscreen/);
    expect(text).toMatch(/warn: Differin Adapalene Gel 0.1% and The Ordinary Mandelic Acid/);
    expect(text).toMatch(/good: For dark marks: .*Niacinamide/);
  });

  it("is happy with sunscreen in the morning and calls out fragrance for oily skin", () => {
    const r = checkRoutine(
      [item("Beauty of Joseon Relief Sun: Rice + Probiotics SPF 50+", "AM"), item("Neutrogena Hydro Boost Water Gel", "AM & PM")],
      OILY,
    );
    const text = r.findings.map((f) => `${f.level}: ${f.text}`).join("\n");
    expect(text).toMatch(/good: Morning sunscreen: Beauty of Joseon/);
    expect(text).toMatch(/warn: Neutrogena Hydro Boost Water Gel: fragrance/);
  });

  it("tells you to move a retinoid out of the morning and to stop harmful products", () => {
    const r = checkRoutine(
      [item("Differin Adapalene Gel 0.1%", "AM"), { name: "Toning cream", when: "PM", inci: "Aqua, Clobetasol Propionate, Hydroquinone", source: "pasted" }],
      { ...OILY, pregnant: true },
    );
    expect(r.findings[0].level).toBe("stop");
    expect(r.findings.map((f) => f.text).join()).toMatch(/Move Differin/);
    expect(r.findings.map((f) => f.text).join()).toMatch(/Pregnant/);
  });
});
