/**
 * Skin assessment engine (runs on the server via /api/assessment).
 *
 * Inputs: YouCam measurements (scores + counts from YouCam's own detection masks) and the user's
 * answers (mark age, mirror check, safety questions). Output: what was measured and how, a plan
 * with products that passed an ingredient
 * check against this user's profile, and when to see a dermatologist.
 *
 * This is a cosmetic assessment, not a medical diagnosis.
 */
import { checkIngredients, type SkinProfile } from "./ingredients";
import { bandFromCount, bandOf, BAND_LABEL, CONCERNS, worseBand, type Band } from "./insights";
import { ZONE_LABEL, type MarkStats, type Zone } from "./marks-shared";
import { buildPlan, type Onset, type Plan, type PlanStep } from "./plan";
import { PRODUCTS, STEP_TARGET, type Budget, type Product } from "./products";

export type Feel = "right" | "more" | "fewer";

export const WARNING_SIGNS = [
  { id: "cysts", label: "Painful, deep lumps under the skin" },
  { id: "changing", label: "A spot or mark that's growing, changing colour or bleeding" },
  { id: "scarring", label: "Breakouts leaving pitted scars" },
  { id: "patches", label: "Large dark patches on cheeks or forehead that weren't spots first" },
] as const;
export type WarningSign = (typeof WARNING_SIGNS)[number]["id"];

export type AssessmentInput = {
  concerns: Array<{ concern: string; rawScore: number; count?: number; coveragePct?: number }>;
  skinType?: Record<string, string>;
  marks?: { darkMarks?: MarkStats; acne?: MarkStats };
  quality?: "hd" | "sd";
  answers?: {
    onset?: Onset;
    feel?: Partial<Record<"age_spot" | "acne", Feel>>;
    pregnant?: boolean;
    sensitive?: boolean;
    warningSigns?: WarningSign[];
    /** Highest price band the user wants to see. */
    budget?: Budget;
  };
  /** Weeks since the user's first scan. */
  trackedWeeks?: number;
};

export type Measurement = { label: string; value: string; band?: Band; method: string };
export type VerifiedProduct = Product & { verdict: string; matched: string[] };
export type RejectedProduct = { brand: string; name: string; reason: string };
export type AssessedStep = PlanStep & { products: VerifiedProduct[]; leftOut: RejectedProduct[] };
export type Assessment = {
  measurements: Measurement[];
  plan: Omit<Plan, "phases"> & { phases: Array<Omit<Plan["phases"][number], "steps"> & { steps: AssessedStep[] }> };
  dermatologist: { urgent: boolean; reasons: string[] };
  productsNote: string;
  method: string[];
};

const zonesText = (z?: MarkStats["zones"]) =>
  z
    ? (Object.entries(z) as Array<[Zone, number]>)
        .filter(([, n]) => n > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([k, n]) => `${n} ${ZONE_LABEL[k]}`)
        .join(", ")
    : "";

export function profileFrom(input: AssessmentInput): SkinProfile {
  const types = Object.values(input.skinType ?? {});
  const get = (k: string) => input.concerns.find((c) => c.concern === k);
  const visible = (k: "age_spot" | "acne") => {
    const c = get(k);
    if (input.answers?.feel?.[k] === "more") return true;
    if (!c) return true;
    const b = bandFromCount(k, c.count);
    return bandOf(c.rawScore) !== "clear" || (!!b && b !== "clear");
  };
  return {
    oily: types.some((t) => /oily/i.test(t)),
    dry: types.some((t) => /dry/i.test(t)),
    darkMarks: visible("age_spot") || (!!input.answers?.onset && input.answers.onset !== "unsure"),
    acne: visible("acne"),
    fromScan: true,
  };
}

/** A product qualifies only if its real ingredient list contains the step's target and passes the check. */
const TIER: Record<Budget, number> = { $: 1, $$: 2, $$$: 3 };

export function checkProducts(
  step: string,
  profile: SkinProfile,
  budget?: Budget,
): { products: VerifiedProduct[]; leftOut: RejectedProduct[] } {
  const target = STEP_TARGET[step];
  const products: VerifiedProduct[] = [];
  const leftOut: RejectedProduct[] = [];
  for (const p of PRODUCTS[step] ?? []) {
    const reject = (reason: string) => leftOut.push({ brand: p.brand, name: p.name, reason });
    if (!p.inci) continue; // unverified ingredient list: never shown
    if (budget && p.budget && TIER[p.budget] > TIER[budget]) continue;
    if (p.forSkin === "oily" && profile.dry && !profile.oily) continue;
    if (p.forSkin === "dry" && profile.oily) continue;
    const r = checkIngredients(p.inci, profile);
    if (r.avoid.length) {
      reject(`has ${r.avoid.map((a) => a.label.toLowerCase()).join(", ")}`);
      continue;
    }
    if (r.cautions.length) {
      reject(`has ${r.cautions.map((c) => c.label.toLowerCase()).join(", ")}`);
      continue;
    }
    const labels = r.goods.map((g) => g.label);
    if (target && !labels.includes(target)) {
      reject(`no ${target.toLowerCase()} on its ingredient list`);
      continue;
    }
    products.push({ ...p, verdict: r.verdict, matched: labels });
  }
  // closest to the chosen budget first, then cheaper
  if (budget) {
    const dist = (p: Product) => Math.abs(TIER[p.budget ?? "$"] - TIER[budget]);
    products.sort((x, y) => dist(x) - dist(y) || TIER[x.budget ?? "$"] - TIER[y.budget ?? "$"]);
  }
  return { products: products.slice(0, 3), leftOut };
}

export const verifyProducts = (step: string, profile: SkinProfile) => checkProducts(step, profile).products;

export function assess(input: AssessmentInput): Assessment {
  const a = input.answers ?? {};
  const get = (k: string) => input.concerns.find((c) => c.concern === k);
  const dm = get("age_spot"), acne = get("acne");

  const measurements: Measurement[] = [];
  const push = (key: string, extra?: { count?: number; zones?: MarkStats["zones"]; coverage?: number; feel?: Feel }) => {
    const c = get(key);
    if (!c || !CONCERNS[key]) return;
    const byScore = bandOf(c.rawScore);
    const byCount = bandFromCount(key, extra?.count);
    let band = byCount ? worseBand(byScore, byCount) : byScore;
    if (extra?.feel === "more") band = worseBand(band, "moderate");
    const parts = [
      extra?.count != null ? `${extra.count} found${extra.zones ? ` (${zonesText(extra.zones)})` : ""}` : null,
      extra?.coverage ? `${extra.coverage}% of face` : null,
      `YouCam score ${Math.round(c.rawScore)}/100`,
      extra?.feel === "more" ? "you see more" : extra?.feel === "fewer" ? "you see fewer" : null,
    ].filter(Boolean);
    const unreliable = !!CONCERNS[key].caveat;
    measurements.push({
      label: CONCERNS[key].label,
      value: unreliable ? `${parts.join(" · ")} · not a reliable reading on deep skin, so we don't rate it` : parts.join(" · "),
      band: unreliable ? undefined : band,
      method:
        extra?.count != null
          ? "Counted on YouCam's detection map; score from YouCam AI Skin Analysis" + (extra.feel ? "; adjusted by your answer" : "")
          : "YouCam AI Skin Analysis" + (CONCERNS[key].caveat ? " (less reliable on deep skin)" : ""),
    });
  };
  push("age_spot", { count: dm?.count, zones: input.marks?.darkMarks?.zones, coverage: dm?.coveragePct, feel: a.feel?.age_spot });
  push("acne", { count: acne?.count, zones: input.marks?.acne?.zones, feel: a.feel?.acne });
  for (const k of ["texture", "dark_circle_v2", "moisture", "oiliness", "pore", "radiance", "redness"]) push(k);
  if (input.skinType?.whole) measurements.push({ label: "Skin type", value: `${input.skinType.whole} (T-zone ${input.skinType.t_zone ?? "?"}, U-zone ${input.skinType.u_zone ?? "?"})`, method: "YouCam AI Skin Analysis" });

  const profile = profileFrom(input);
  const plan = buildPlan({
    darkMarks: dm?.rawScore,
    acne: acne?.rawScore,
    texture: get("texture")?.rawScore,
    darkMarkCount: dm?.count,
    acneCount: acne?.count,
    onset: a.onset,
    trackedWeeks: input.trackedWeeks,
    skinType: input.skinType,
    darkMarksFeel: a.feel?.age_spot,
    acneFeel: a.feel?.acne,
    pregnant: a.pregnant,
    sensitive: a.sensitive,
  });

  const phases = plan.phases.map((ph) => ({
    ...ph,
    steps: ph.steps.map((st) => ({ ...st, ...checkProducts(st.name, profile, a.budget) })),
  }));

  const signs = (a.warningSigns ?? [])
    .map((id): string | undefined => WARNING_SIGNS.find((w) => w.id === id)?.label)
    .filter((x): x is string => !!x);
  const reasons = [...signs.map((s) => `You noted: ${s.toLowerCase()}.`)];
  if (plan.dermatologist.show) reasons.push(plan.dermatologist.reason);

  const anyVerified = phases.some((ph) => ph.steps.some((s) => s.products.length));
  return {
    measurements,
    plan: { ...plan, phases },
    dermatologist: { urgent: signs.length > 0, reasons },
    productsNote: anyVerified
      ? "Products are shown only when their full ingredient list (from INCIDecoder) contains what this step needs and passes our check for your skin."
      : "Product picks appear once each product's full ingredient list has been verified against your skin. Until then, use Product check on anything you own.",
    method: [
      "Measured: YouCam AI Skin Analysis scores and detection maps for your photo" + (input.quality === "hd" ? " (HD)." : "."),
      "Counted: each dark mark and acne spot on YouCam's own maps, with where it sits.",
      "Your answers: mark age, the mirror check and safety questions adjust the plan.",
      "Products: recommended only if their ingredient list passes the same check as Product check.",
      `Shown as ${BAND_LABEL.clear.toLowerCase()} / ${BAND_LABEL.mild.toLowerCase()} / ${BAND_LABEL.moderate.toLowerCase()} / ${BAND_LABEL.noticeable.toLowerCase()}: cosmetic guidance, not a diagnosis.`,
    ],
  };
}
