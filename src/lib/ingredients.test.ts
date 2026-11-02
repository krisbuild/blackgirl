import { describe, expect, it } from "vitest";
import { checkIngredients, parseIngredients } from "./ingredients";

const OILY_MARKS = { oily: true, darkMarks: true, acne: true, fromScan: true };
const BANNED = /\b(treat|treats|treatment|cure|cures|diagnos(e|is|ed)|flaws?|fix your skin)\b/i;

describe("parseIngredients", () => {
  it("handles headers, OCR line breaks and hyphenation", () => {
    const list = parseIngredients("Net wt 30ml\nINGREDIENTS: Aqua (Water), Niacin-\namide, Zinc PCA,\nGlycerin.");
    expect(list).toEqual(["aqua (water)", "niacinamide", "zinc pca", "glycerin"]);
  });
});

describe("checkIngredients", () => {
  it("says avoid for bleaching creams with steroids, hydroquinone or mercury", () => {
    const r = checkIngredients("Ingredients: Aqua, Glycerin, Clobetasol Propionate, Hydroquinone, Mercurous Chloride, Parfum", OILY_MARKS);
    expect(r.verdict).toBe("avoid");
    expect(r.avoid.map((a) => a.label)).toEqual(["Mercury", "Steroid", "Hydroquinone"]);
  });

  it("rates a niacinamide + zinc serum a great match for oily skin with dark marks and acne", () => {
    const r = checkIngredients("Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin", OILY_MARKS);
    expect(r.verdict).toBe("great");
    expect(r.goods.filter((g) => g.forYou).map((g) => g.label)).toEqual(["Niacinamide", "Zinc PCA"]);
  });

  it("flags pore-clogging butters for oily, acne-prone skin", () => {
    const r = checkIngredients("Cocos Nucifera (Coconut) Oil, Theobroma Cacao (Cocoa) Seed Butter, Butyrospermum Parkii Butter, Parfum", OILY_MARKS);
    expect(r.verdict).toBe("caution");
    expect(r.cautions.map((c) => c.label)).toEqual(expect.arrayContaining(["Coconut oil", "Cocoa butter", "Fragrance"]));
  });

  it("flags coconut oil but not coconut fruit extract", () => {
    expect(checkIngredients("Water, Cocos Nucifera (Coconut) Fruit Extract, Glycerin", OILY_MARKS).cautions).toHaveLength(0);
    expect(checkIngredients("Cocos Nucifera (Coconut) Oil, Glycerin", OILY_MARKS).cautions[0].label).toBe("Coconut oil");
  });

  it("doesn't flag coconut oil for dry skin without acne", () => {
    const r = checkIngredients("Cocos Nucifera Oil, Glycerin, Ceramide NP", { dry: true, acne: false, darkMarks: false, fromScan: true });
    expect(r.cautions).toHaveLength(0);
  });

  it("warns about white cast for untinted mineral sunscreen", () => {
    const r = checkIngredients("Zinc Oxide 20%, Caprylic/Capric Triglyceride, Glycerin", OILY_MARKS);
    expect(r.notes.join()).toMatch(/white cast/);
    const tinted = checkIngredients("Zinc Oxide, Glycerin, Iron Oxides (CI 77491)", OILY_MARKS);
    expect(tinted.notes.join()).not.toMatch(/white cast/);
  });

  it("uses cosmetic language only", () => {
    const r = checkIngredients("Clobetasol, Hydroquinone, Mercury, Coconut Oil, Parfum, Lemon Oil, Walnut Shell Powder, Sodium Lauryl Sulfate, Niacinamide, Adapalene, Salicylic Acid, Zinc Oxide, Alcohol Denat.", OILY_MARKS);
    const text = [r.headline, ...r.notes, ...r.avoid.map((a) => a.why), ...r.cautions.map((c) => c.why), ...r.goods.map((g) => g.why)].join("\n");
    expect(text).not.toMatch(BANNED);
  });
});
