/**
 * Ingredient check: reads an ingredient list (typed, pasted or OCR'd from a photo) and says
 * whether the product suits the user's skin, based on their latest scan.
 *
 * Rule-based and transparent: every verdict lists the exact ingredients that drove it.
 * It reads the label only and cannot tell whether a product is genuine or counterfeit.
 * Cosmetic language only.
 */

export type SkinProfile = {
  oily?: boolean;
  dry?: boolean;
  darkMarks?: boolean;
  acne?: boolean;
  /** True when built from a real scan (vs. the default dark-marks + acne profile). */
  fromScan?: boolean;
};

type Rule = { id: string; label: string; match: RegExp; why: string };

/** Never use: bleaching agents and steroids that harm deep skin. */
const AVOID: Rule[] = [
  {
    id: "mercury",
    label: "Mercury",
    match: /\bmercur(y|ous|ic)\b|calomel|hydrargyr/,
    why: "Toxic and banned in cosmetics in many countries. It turns up in some skin-lightening creams.",
  },
  {
    id: "steroid",
    label: "Steroid",
    match: /clobetasol|betamethasone|dexamethasone|fluocinolone|fluocinonide|mometasone|triamcinolone|halobetasol|beclomethasone|hydrocortisone/,
    why: "Steroids in face creams can thin the skin and cause rebound darkening. Not for everyday use without a doctor.",
  },
  {
    id: "hydroquinone",
    label: "Hydroquinone",
    match: /hydroquinone/,
    why: "A strong lightener that's prescription-only in many countries. Unregulated, long-term use can leave permanent blue-black patches on deep skin.",
  },
];

/** Worth knowing, especially for oily or breakout-prone skin. */
const CAUTION: Array<Rule & { when?: (p: SkinProfile) => boolean }> = [
  {
    id: "coconut",
    label: "Coconut oil",
    match: /cocos nucifera|coconut oil/,
    why: "Can clog pores, so it's a common breakout trigger on oily, acne-prone skin.",
    when: (p) => !!(p.oily || p.acne),
  },
  {
    id: "cocoa",
    label: "Cocoa butter",
    match: /theobroma cacao|cocoa butter/,
    why: "Rich and pore-clogging for oily, acne-prone skin. Better kept for the body.",
    when: (p) => !!(p.oily || p.acne),
  },
  {
    id: "ipm",
    label: "Isopropyl myristate / palmitate",
    match: /isopropyl (myristate|palmitate|isostearate)|myristyl myristate/,
    why: "Known to clog pores in some people.",
    when: (p) => !!(p.oily || p.acne),
  },
  {
    id: "lanolin",
    label: "Lanolin",
    match: /\blanolin\b/,
    why: "Heavy; can clog pores on oily skin.",
    when: (p) => !!p.oily,
  },
  {
    id: "fragrance",
    label: "Fragrance",
    match: /\bparfum\b|\bfragrance\b|\baroma\b/,
    why: "Can irritate, and on melanin-rich skin irritation can leave new dark marks.",
  },
  {
    id: "citrus",
    label: "Citrus oils",
    match: /citrus (limon|aurantium|aurantifolia|paradisi|bergamia)|lemon (peel )?oil|bergamot|lime oil|grapefruit/,
    why: "Can make skin more sun-sensitive, which works against fading dark marks.",
  },
  {
    id: "scrub",
    label: "Gritty scrub",
    match: /walnut shell|juglans regia shell|apricot (seed|kernel) powder|prunus armeniaca seed powder/,
    why: "Harsh scrubs can irritate and leave marks. Gentle acids are kinder.",
  },
  {
    id: "sls",
    label: "Sodium lauryl sulfate",
    match: /sodium lauryl sulfate/,
    why: "A harsh cleansing agent that can dry and irritate.",
  },
];

/** Ingredients that help, tagged by what they help with. */
const GOOD: Array<Rule & { helps: Array<"darkMarks" | "acne" | "hydration" | "sun"> }> = [
  { id: "niacinamide", label: "Niacinamide", match: /niacinamide/, why: "Evens tone and balances oil.", helps: ["darkMarks", "acne"] },
  { id: "azelaic", label: "Azelaic acid", match: /azelaic|azeloyl/, why: "Fades dark marks and calms breakouts.", helps: ["darkMarks", "acne"] },
  { id: "txa", label: "Tranexamic acid", match: /tranexamic/, why: "Targets stubborn discoloration.", helps: ["darkMarks"] },
  {
    id: "vitc",
    label: "Vitamin C",
    match: /ascorbic|ascorbyl|ascorbate/,
    why: "Brightens and boosts sun protection.",
    helps: ["darkMarks"],
  },
  { id: "arbutin", label: "Alpha arbutin", match: /arbutin/, why: "A gentle brightener for dark marks.", helps: ["darkMarks"] },
  { id: "licorice", label: "Licorice root", match: /glycyrrhiza|licorice|liquorice|glabridin/, why: "Soothes and brightens.", helps: ["darkMarks"] },
  { id: "kojic", label: "Kojic acid", match: /kojic/, why: "Helps fade discoloration.", helps: ["darkMarks"] },
  {
    id: "retinoid",
    label: "Retinoid",
    match: /adapalene|retinol|retinal\b|retinaldehyde|retinyl|hydroxypinacolone retinoate/,
    why: "Speeds renewal for marks, texture and breakouts. Start slowly.",
    helps: ["darkMarks", "acne"],
  },
  { id: "salicylic", label: "Salicylic acid", match: /salicylic/, why: "Clears inside pores.", helps: ["acne"] },
  { id: "bpo", label: "Benzoyl peroxide", match: /benzoyl peroxide/, why: "Calms breakouts.", helps: ["acne"] },
  { id: "sulfur", label: "Sulfur", match: /\bsulfur\b|\bsulphur\b/, why: "Gentle on breakouts.", helps: ["acne"] },
  { id: "zinc", label: "Zinc PCA", match: /zinc pca/, why: "Helps balance oil.", helps: ["acne"] },
  { id: "aha", label: "Gentle acids (AHA)", match: /mandelic|lactic acid|glycolic/, why: "Smooths texture and helps marks fade.", helps: ["darkMarks"] },
  { id: "glycerin", label: "Glycerin", match: /glycerin/, why: "Hydrates.", helps: ["hydration"] },
  { id: "ha", label: "Hyaluronic acid", match: /hyaluron/, why: "Hydrates without heaviness.", helps: ["hydration"] },
  { id: "ceramide", label: "Ceramides", match: /ceramide/, why: "Repair the skin barrier.", helps: ["hydration"] },
  { id: "panthenol", label: "Panthenol", match: /panthenol/, why: "Soothes and hydrates.", helps: ["hydration"] },
  { id: "squalane", label: "Squalane", match: /squalane/, why: "Light, non-greasy moisture.", helps: ["hydration"] },
  {
    id: "sunfilter",
    label: "UV filters",
    match: /zinc oxide|titanium dioxide|avobenzone|butyl methoxydibenzoylmethane|bemotrizinol|bis-ethylhexyloxyphenol|ethylhexyl triazone|diethylamino hydroxybenzoyl|octocrylene|homosalate|octisalate|tinosorb|uvinul|ethylhexyl salicylate/,
    why: "Sun protection: the most important step for fading dark marks.",
    helps: ["sun"],
  },
];

/** Pull a clean ingredient list out of label text (handles OCR line breaks and "Ingredients:" headers). */
export function parseIngredients(text: string): string[] {
  let t = text.replace(/\r/g, "");
  const m = t.match(/ingredients?\s*[:\-]/i);
  if (m && m.index != null) t = t.slice(m.index + m[0].length);
  t = t
    .replace(/-\n\s*/g, "") // hyphenated line breaks
    .replace(/\n+/g, " ")
    .replace(/[•·|;]/g, ",")
    .replace(/\.\s*$/, "");
  return t
    .split(",")
    .map((s) => s.replace(/\s+/g, " ").replace(/^[\s*.]+|[\s*.]+$/g, "").toLowerCase())
    .filter((s) => s.length > 1 && s.length < 90);
}

export type Finding = { label: string; why: string; ingredient: string };
export type Verdict = "great" | "good" | "okay" | "caution" | "avoid";
export type IngredientReport = {
  verdict: Verdict;
  headline: string;
  avoid: Finding[];
  cautions: Finding[];
  goods: Array<Finding & { forYou: boolean }>;
  notes: string[];
  count: number;
};

export const VERDICT_LABEL: Record<Verdict, string> = {
  great: "Great match",
  good: "Good match",
  okay: "Okay, not targeted",
  caution: "Use with care",
  avoid: "Avoid",
};

function findAll<R extends Rule>(rules: R[], list: string[]) {
  const out: Array<R & { ingredient: string }> = [];
  for (const r of rules) {
    const hit = list.find((i) => r.match.test(i));
    if (hit) out.push({ ...r, ingredient: hit });
  }
  return out;
}

/** Lower-case a label for use mid-sentence, keeping acronyms like "PCA" and "AHA". */
const lc = (label: string) => label.replace(/\b([A-Z])([a-z])/g, (_, a: string, b: string) => a.toLowerCase() + b);

export function checkIngredients(input: string | string[], profile: SkinProfile = {}): IngredientReport {
  const list = Array.isArray(input) ? input.map((s) => s.toLowerCase()) : parseIngredients(input);
  const avoid = findAll(AVOID, list).map(({ label, why, ingredient }) => ({ label, why, ingredient }));
  const cautions = findAll(CAUTION, list)
    .filter((r) => !r.when || r.when(profile))
    .map(({ label, why, ingredient }) => ({ label, why, ingredient }));
  const needs = new Set<string>(["sun", "hydration"]);
  if (profile.darkMarks ?? true) needs.add("darkMarks");
  if (profile.acne ?? true) needs.add("acne");
  const goods = findAll(GOOD, list).map(({ label, why, ingredient, helps }) => ({
    label,
    why,
    ingredient,
    forYou: helps.some((h) => needs.has(h) && (h === "darkMarks" || h === "acne")),
  }));

  const notes: string[] = [];
  const top5 = list.slice(0, 5);
  if (top5.some((i) => /alcohol denat|sd alcohol|^ethanol$|^alcohol$/.test(i))) {
    notes.push("Drying alcohol is near the top of the list, so it can leave skin tight or irritated.");
  }
  const mineralOnly =
    list.some((i) => /zinc oxide|titanium dioxide/.test(i)) &&
    !goods.some((g) => g.label === "UV filters" && !/zinc oxide|titanium dioxide/.test(g.ingredient)) &&
    !list.some((i) => /iron oxide|ci 77491|ci 77492|ci 77499/.test(i));
  if (mineralOnly) notes.push("Untinted mineral filters can leave a white cast on deep skin. Look for a tinted version (with iron oxides).");
  const strongActives = goods.filter((g) => ["Retinoid", "Gentle acids (AHA)", "Salicylic acid", "Benzoyl peroxide"].includes(g.label));
  if (strongActives.length >= 2) notes.push("Several strong actives together: introduce slowly and don't layer with other acids or retinoids.");

  const targeted = goods.filter((g) => g.forYou).length;
  let verdict: Verdict;
  if (avoid.length) verdict = "avoid";
  else if (cautions.length >= 2 || (cautions.length >= 1 && targeted === 0)) verdict = "caution";
  else if (targeted >= 2 && cautions.length === 0) verdict = "great";
  else if (targeted >= 1) verdict = "good";
  else verdict = "okay";

  const who = profile.fromScan ? "your skin" : "dark marks and acne";
  const headline = {
    avoid: `Skip this one. It contains ${avoid.map((a) => lc(a.label)).join(" and ")}.`,
    caution: `Use with care: ${cautions.map((c) => lc(c.label)).join(", ")} may not suit ${who}.`,
    great: `A great match for ${who}: ${goods.filter((g) => g.forYou).map((g) => lc(g.label)).slice(0, 3).join(", ")}.`,
    good: `A good match for ${who}, with ${goods.filter((g) => g.forYou).map((g) => lc(g.label)).slice(0, 2).join(" and ")}.`,
    okay: goods.some((g) => g.label === "UV filters")
      ? "A sunscreen with no red flags: wear it every day."
      : `No red flags, but nothing here targets ${profile.fromScan ? "your dark marks or acne" : "dark marks or acne"}.`,
  }[verdict];

  return { verdict, headline, avoid, cautions, goods, notes, count: list.length };
}
