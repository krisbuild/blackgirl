import { describe, expect, it } from "vitest";
import { assess, verifyProducts, type AssessmentInput } from "./assessment";
import { PRODUCTS } from "./products";

// Real measurements from a team member's selfie (YouCam SD, 2026-11-02).
const REAL: AssessmentInput = {
  concerns: [
    { concern: "age_spot", rawScore: 86.6, count: 44, coveragePct: 1.1 },
    { concern: "acne", rawScore: 78.4, count: 9, coveragePct: 0.2 },
    { concern: "texture", rawScore: 84.6 },
    { concern: "dark_circle_v2", rawScore: 65.8 },
    { concern: "moisture", rawScore: 50.4 },
    { concern: "oiliness", rawScore: 54.9 },
    { concern: "pore", rawScore: 57.8 },
    { concern: "radiance", rawScore: 67.7 },
    { concern: "redness", rawScore: 100 },
  ],
  skinType: { whole: "Oily", t_zone: "Oily", u_zone: "Oily" },
  marks: { darkMarks: { count: 44, coveragePct: 1.1, zones: { forehead: 25, leftCheek: 9, rightCheek: 7, noseMouth: 2, chinJaw: 1 }, spots: [] } },
};

describe("assess (real selfie measurements)", () => {
  const a = assess(REAL);

  it("reports what was measured and how, led by the dark-mark count", () => {
    expect(a.measurements[0].label).toBe("Dark marks");
    expect(a.measurements[0].value).toMatch(/44 found \(25 forehead/);
    expect(a.measurements[0].band).toBe("noticeable");
    expect(a.measurements[0].method).toMatch(/YouCam's detection map/);
    const redness = a.measurements.find((m) => m.label.startsWith("Sunburn"));
    expect(redness?.method).toMatch(/less reliable on deep skin/);
    expect(redness?.band).toBeUndefined();
  });


  it("recommends sunscreens whose real ingredient lists pass for oily, acne-prone skin, and says why others were left out", () => {
    const sun = a.plan.phases.flatMap((p) => p.steps).find((s) => s.name.startsWith("Sunscreen"))!;
    const names = sun.products.map((p) => `${p.brand} ${p.name}`).join(" | ");
    expect(names).toMatch(/Beauty of Joseon/);
    expect(names).not.toMatch(/Black Girl|Bolden|UVMune/);
    expect(sun.leftOut.find((x) => x.name.includes("UVMune"))?.reason).toMatch(/fragrance/);
    expect(sun.leftOut.find((x) => x.brand === "Black Girl Sunscreen")?.reason).toMatch(/cocoa butter/);
    expect(sun.products.every((p) => p.inciSource?.includes("incidecoder.com"))).toBe(true);
  });

  it("filters products by budget", () => {
    const cheap = assess({ ...REAL, answers: { budget: "$" } });
    for (const s of cheap.plan.phases.flatMap((p) => p.steps)) for (const p of s.products) expect(p.budget, p.name).toBe("$");
  });

  it("never recommends a product whose ingredient list hasn't been verified", () => {
    for (const s of a.plan.phases.flatMap((p) => p.steps)) {
      for (const p of s.products) expect(p.inci).toBeTruthy();
    }
  });
});

describe("safety answers", () => {
  it("removes retinoids when pregnant or breastfeeding", () => {
    const a = assess({ ...REAL, answers: { pregnant: true } });
    const names = a.plan.phases.flatMap((p) => p.steps.map((s) => s.name)).join();
    expect(names).not.toMatch(/Adapalene/);
    expect(a.plan.habits[0]).toMatch(/Pregnant/);
  });

  it("puts a dermatologist first when warning signs are ticked", () => {
    const a = assess({ ...REAL, answers: { warningSigns: ["changing"] } });
    expect(a.dermatologist.urgent).toBe(true);
    expect(a.dermatologist.reasons[0]).toMatch(/growing, changing colour/);
  });
});

describe("verifyProducts", () => {
  const profile = { oily: true, darkMarks: true, acne: true, fromScan: true };
  it("accepts a product only when its real ingredient list contains the step's target and passes the check", () => {
    const step = "Niacinamide 5–10%";
    const saved = PRODUCTS[step];
    PRODUCTS[step] = [
      { brand: "Good", name: "Serum", note: "", inci: "Aqua, Niacinamide, Zinc PCA, Glycerin" },
      { brand: "Clogs", name: "Serum", note: "", inci: "Aqua, Niacinamide, Cocos Nucifera Oil" },
      { brand: "Missing", name: "Serum", note: "", inci: "Aqua, Glycerin" },
      { brand: "Unverified", name: "Serum", note: "" },
    ];
    try {
      expect(verifyProducts(step, profile).map((p) => p.brand)).toEqual(["Good"]);
    } finally {
      PRODUCTS[step] = saved;
    }
  });
});


describe("whyFor", () => {
  it("explains ingredient steps and generic steps", async () => {
    const { whyFor } = await import("./assessment");
    expect(whyFor("Niacinamide 5–10%")).toMatch(/contains niacinamide.*fade dark marks/i);
    expect(whyFor("Gentle, non-stripping cleanser")).toMatch(/passed our check/);
  });
});
