/**
 * Routine check: looks at the user's products together (morning and night) and flags
 * missing sunscreen, clashes, overlaps and gaps for dark marks and acne.
 */
import { checkIngredients, type IngredientReport, type SkinProfile } from "./ingredients";

export type Slot = "AM" | "PM" | "AM & PM";
export type RoutineItem = { name: string; when: Slot; inci: string; matched?: string; source: "catalog" | "incidecoder" | "pasted" };
export type RoutineFinding = { level: "stop" | "warn" | "tip" | "good"; text: string };
export type CheckedItem = RoutineItem & { report: IngredientReport };

const DARK_MARK_ACTIVES = ["Niacinamide", "Azelaic acid", "Tranexamic acid", "Vitamin C", "Alpha arbutin", "Licorice root", "Kojic acid", "Retinoid"];
const ACNE_ACTIVES = ["Benzoyl peroxide", "Salicylic acid", "Azelaic acid", "Retinoid", "Sulfur"];
const EXFOLIANTS = ["Gentle acids (AHA)", "Salicylic acid"];

const inSlot = (i: CheckedItem, s: "AM" | "PM") => i.when === s || i.when === "AM & PM";
const has = (i: CheckedItem, label: string) => i.report.goods.some((g) => g.label === label);

export type RoutineRating = { score: number; label: string; summary: string };

/**
 * Overall routine rating out of 10, derived only from the findings, so every point lost has a
 * visible reason. Harmful products or no morning sunscreen cap the score.
 */
export function rateRoutine(findings: RoutineFinding[]): RoutineRating {
  const n = (l: RoutineFinding["level"]) => findings.filter((f) => f.level === l).length;
  let score = 10 - 3.5 * n("stop") - 1.5 * n("warn") - 0.5 * n("tip");
  const noSpf = findings.some((f) => f.text.startsWith("No sunscreen"));
  if (n("stop")) score = Math.min(score, 3);
  if (noSpf) score = Math.min(score, 5);
  score = Math.max(1, Math.round(score * 2) / 2);
  const label = score >= 9 ? "Excellent" : score >= 7.5 ? "Great" : score >= 6 ? "Good, with fixes" : score >= 4 ? "Needs work" : "Needs changes now";
  const fixes = n("stop") + n("warn");
  const summary =
    fixes === 0
      ? n("tip")
        ? `Solid routine. ${n("tip")} small tip${n("tip") === 1 ? "" : "s"} below.`
        : "Your routine covers the essentials for your skin."
      : `${fixes} thing${fixes === 1 ? "" : "s"} to fix${n("tip") ? `, plus ${n("tip")} tip${n("tip") === 1 ? "" : "s"}` : ""}.`;
  return { score, label, summary };
}

export function checkRoutine(
  items: RoutineItem[],
  profile: SkinProfile & { pregnant?: boolean },
): { items: CheckedItem[]; findings: RoutineFinding[]; rating: RoutineRating } {
  const checked: CheckedItem[] = items.map((it) => ({ ...it, report: checkIngredients(it.inci, profile) }));
  const f: RoutineFinding[] = [];
  const names = (xs: CheckedItem[]) => xs.map((x) => x.name).join(", ");

  // Stop-using: harmful ingredients
  for (const it of checked) {
    if (it.report.avoid.length) f.push({ level: "stop", text: `Stop using ${it.name}: it contains ${it.report.avoid.map((a) => a.label.toLowerCase()).join(" and ")}.` });
  }

  // Sunscreen in the morning
  const am = checked.filter((i) => inSlot(i, "AM"));
  if (!am.some((i) => has(i, "UV filters"))) {
    f.push({ level: "warn", text: "No sunscreen in your morning routine. Daily SPF 30+ is the biggest factor in fading dark marks." });
  } else {
    f.push({ level: "good", text: `Morning sunscreen: ${names(am.filter((i) => has(i, "UV filters")))}.` });
  }

  // Retinoids belong at night; not in pregnancy
  const retinoids = checked.filter((i) => has(i, "Retinoid"));
  for (const r of retinoids.filter((i) => inSlot(i, "AM"))) f.push({ level: "warn", text: `Move ${r.name} to your night routine: retinoids break down in sunlight and make skin more sun-sensitive.` });
  if (profile.pregnant && retinoids.length) f.push({ level: "stop", text: `Pregnant or breastfeeding: pause ${names(retinoids)} (retinoid) and check with your doctor.` });

  // Clashes in the same slot
  for (const slot of ["AM", "PM"] as const) {
    const here = checked.filter((i) => inSlot(i, slot));
    const ret = here.filter((i) => has(i, "Retinoid"));
    const exf = here.filter((i) => EXFOLIANTS.some((e) => has(i, e)));
    if (ret.length && exf.filter((x) => !ret.includes(x)).length) {
      f.push({
        level: "warn",
        text: `${names(ret)} and ${names(exf.filter((x) => !ret.includes(x)))} in the same ${slot === "AM" ? "morning" : "night"} can irritate, and irritation leaves new marks. Use them on alternate nights.`,
      });
    }
    const exfoliants = new Set(here.flatMap((i) => EXFOLIANTS.filter((e) => has(i, e)).map(() => i.name)));
    if (exfoliants.size >= 2 && !ret.length) {
      f.push({ level: "tip", text: `Several exfoliating products in one ${slot === "AM" ? "morning" : "night"} (${[...exfoliants].join(", ")}). If your skin stings or peels, space them out.` });
    }
  }

  // Products that don't suit this skin
  for (const it of checked) {
    if (!it.report.avoid.length && it.report.cautions.length) {
      f.push({ level: "warn", text: `${it.name}: ${it.report.cautions.map((c) => c.label.toLowerCase()).join(", ")} may not suit your skin.` });
    }
  }

  // Gaps
  const all = checked;
  if (profile.darkMarks) {
    const dm = all.filter((i) => DARK_MARK_ACTIVES.some((a) => has(i, a)));
    if (!dm.length) f.push({ level: "tip", text: "Nothing in your routine targets dark marks. Add one brightener such as azelaic acid, niacinamide or tranexamic acid." });
    else f.push({ level: "good", text: `For dark marks: ${names(dm)}.` });
  }
  if (profile.acne) {
    const ac = all.filter((i) => ACNE_ACTIVES.some((a) => has(i, a)));
    if (!ac.length) f.push({ level: "tip", text: "Nothing in your routine targets breakouts. A benzoyl peroxide wash or adapalene at night can help." });
    else f.push({ level: "good", text: `For breakouts: ${names(ac)}.` });
  }
  const moisturiser = all.some((i) => i.report.goods.some((g) => ["Glycerin", "Hyaluronic acid", "Ceramides", "Squalane", "Panthenol"].includes(g.label)));
  if (!moisturiser) f.push({ level: "tip", text: "Add a moisturiser. Actives are gentler on a hydrated skin barrier." });

  // Overlap of the same active in many products
  for (const a of ["Niacinamide", "Retinoid", "Salicylic acid", "Gentle acids (AHA)"]) {
    const xs = all.filter((i) => has(i, a));
    if (xs.length >= 3) f.push({ level: "tip", text: `${a} is in ${xs.length} of your products (${names(xs)}). You likely don't need all of them.` });
  }

  const order = { stop: 0, warn: 1, tip: 2, good: 3 } as const;
  const findings = f.sort((x, y) => order[x.level] - order[y.level]);
  return { items: checked, findings, rating: rateRoutine(findings) };
}
