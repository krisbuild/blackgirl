/**
 * Personal Dark Mark Plan: built from the scan (dark marks, acne, texture), how long the user
 * says the marks have been there, how long we've been tracking them, and skin type.
 *
 * Cosmetic language only ("fade", "calm", "even out"). Professional options are framed as
 * things to ask a dermatologist about, never as instructions.
 */
import { bandOf, type Band } from "./insights";

export const ONSETS = [
  { id: "lt1m", label: "Under a month" },
  { id: "1-3m", label: "1–3 months" },
  { id: "3-6m", label: "3–6 months" },
  { id: "6-12m", label: "6–12 months" },
  { id: "gt1y", label: "Over a year" },
  { id: "unsure", label: "Not sure" },
] as const;
export type Onset = (typeof ONSETS)[number]["id"];

export type PlanInput = {
  darkMarks?: number; // raw score, higher = clearer
  acne?: number;
  texture?: number;
  onset?: Onset;
  /** Weeks since the user's first scan in their journal. */
  trackedWeeks?: number;
  skinType?: Record<string, string>;
};

export type PlanStep = { name: string; when: "AM" | "PM" | "AM & PM" | "1–2× a week"; note: string };
export type PlanPhase = { title: string; weeks: string; goal: string; steps: PlanStep[] };
export type Plan = {
  headline: string;
  ageSummary: string;
  timeline: string;
  phases: PlanPhase[];
  habits: string[];
  dermatologist: { show: boolean; reason: string; askAbout: string[] };
};

const worse = (b: Band | undefined, atLeast: Band) => {
  const order: Band[] = ["clear", "mild", "moderate", "noticeable"];
  return b ? order.indexOf(b) >= order.indexOf(atLeast) : false;
};

/** Effective "age" of the marks in months, from the user's answer and our own tracking. */
export function markAgeMonths(onset?: Onset, trackedWeeks = 0): number | null {
  const reported: Record<Onset, number | null> = { lt1m: 0.5, "1-3m": 2, "3-6m": 4.5, "6-12m": 9, gt1y: 15, unsure: null };
  const fromUser = onset ? reported[onset] : null;
  const fromTracking = trackedWeeks > 0 ? trackedWeeks / 4.345 : null;
  if (fromUser == null && fromTracking == null) return null;
  return Math.max(fromUser ?? 0, fromTracking ?? 0);
}

export function buildPlan(input: PlanInput): Plan {
  const scored = input.darkMarks != null ? bandOf(input.darkMarks) : undefined;
  // If the user tells us their marks appeared at some point, believe them: the camera can
  // under-read marks on deep skin, so never plan as if there were none.
  const userSeesMarks = !!input.onset && input.onset !== "unsure";
  const dm: Band | undefined = userSeesMarks && (!scored || scored === "clear") ? "mild" : scored;
  const acne = input.acne != null ? bandOf(input.acne) : undefined;
  const texture = input.texture != null ? bandOf(input.texture) : undefined;
  const age = markAgeMonths(input.onset, input.trackedWeeks);
  const oily = Object.values(input.skinType ?? {}).some((t) => /oily/i.test(t));
  const activeAcne = worse(acne, "mild");
  const stubborn = age != null && age >= 6;

  const ageSummary =
    age == null
      ? "Tell us roughly when these marks appeared, and we'll tailor your timeline."
      : age < 3
        ? "These marks are fairly new. New marks usually respond fastest."
        : age < 6
          ? "These marks have settled in for a few months. They still fade well with steady care."
          : "These are older, more settled marks. They can still fade, but expect a longer road.";

  const timeline =
    age == null
      ? "Most dark marks on melanin-rich skin fade over 3–6 months with daily sunscreen; older ones can take 6–12 months or more."
      : age < 3
        ? "With daily SPF and the routine below, many new marks visibly soften in 6–12 weeks and keep fading over 3–6 months."
        : age < 6
          ? "Expect gradual change over about 3–6 months. Weekly scans will show it before your eyes do."
          : "Settled marks often take 6–12 months or more. Consistency matters more than strength.";

  const headline =
    dm == null || dm === "clear"
      ? "Keep your skin even and protected"
      : activeAcne
        ? "Calm the breakouts, then fade the marks"
        : "Fade your dark marks, step by step";

  const phases: PlanPhase[] = [];

  // Phase 1: foundation (+ calm acne first, because every new spot can leave a new mark)
  const foundation: PlanStep[] = [
    { name: "Gentle, non-stripping cleanser", when: "AM & PM", note: "Harsh washing irritates skin, and irritation can leave new marks." },
    { name: "Sunscreen SPF 30+ with no white cast", when: "AM", note: "The single biggest factor in fading. Reapply when you're outdoors." },
    {
      name: oily ? "Lightweight gel moisturiser" : "Ceramide moisturiser",
      when: "AM & PM",
      note: "A calm, hydrated barrier handles active ingredients better.",
    },
  ];
  if (activeAcne) {
    foundation.push(
      {
        name: "Benzoyl peroxide 2.5% wash or spot gel",
        when: "PM",
        note: "Helps calm breakouts. Low strength is gentler; it can bleach fabric, so use white towels.",
      },
      { name: "Hands off", when: "AM & PM", note: "Picking or squeezing is one of the main reasons spots turn into dark marks." },
    );
  }
  phases.push({
    title: activeAcne ? "Calm & protect" : "Protect",
    weeks: "Weeks 1–2",
    goal: activeAcne ? "Stop new breakouts from becoming new dark marks." : "Build the base every fading routine depends on.",
    steps: foundation,
  });

  // Phase 2: fade
  if (dm && dm !== "clear") {
    const fade: PlanStep[] = [
      { name: "Azelaic acid 10%", when: "PM", note: "Evens out dark marks and is kind to breakout-prone skin. Start every other night." },
      { name: "Niacinamide 5–10%", when: "AM", note: "Brightens and balances tone under your sunscreen." },
    ];
    if (worse(dm, "moderate") || stubborn) {
      fade.push({
        name: "Tranexamic acid serum",
        when: "AM",
        note: "Often used for stubborn discoloration and gentle on deep skin. Layer before sunscreen.",
      });
    }
    phases.push({ title: "Fade", weeks: "Weeks 3–6", goal: "Add brighteners one at a time so you know what your skin likes.", steps: fade });
  }

  // Phase 3: renew (older marks, texture, or ongoing acne)
  if (stubborn || worse(texture, "moderate") || activeAcne || worse(dm, "moderate")) {
    phases.push({
      title: "Renew",
      weeks: "Week 7 onward",
      goal: "Speed up skin renewal to help settled marks and texture.",
      steps: [
        {
          name: "Adapalene 0.1% gel",
          when: "PM",
          note: "A gentle over-the-counter retinoid for marks, texture and breakouts. Pea-sized amount, 2–3 nights a week to start, never with other acids the same night.",
        },
        ...(worse(texture, "moderate")
          ? [{ name: "Mandelic acid", when: "1–2× a week" as const, note: "A gentle exfoliant that smooths texture with less risk of irritation on deep skin." }]
          : []),
        { name: "Vitamin C", when: "AM" as const, note: "Brightens and boosts your sunscreen. Introduce slowly if your skin is sensitive." },
      ],
    });
  }

  const habits = [
    "Introduce one new product at a time, two weeks apart, and patch-test behind the ear first.",
    "If anything stings for more than a minute or leaves skin red or flaky, step back. Irritation can create new marks.",
    "Scan once a week, same place, same light, so your journal shows real change.",
    "Skip bleaching creams, mercury, clobetasol and unregulated hydroquinone.",
  ];

  const derm = stubborn || worse(dm, "noticeable") || worse(acne, "moderate");
  return {
    headline,
    ageSummary,
    timeline,
    phases,
    habits,
    dermatologist: {
      show: derm,
      reason: worse(acne, "moderate")
        ? "Ongoing breakouts keep creating new marks. A dermatologist can help get them under control."
        : "For older or very visible marks, a dermatologist experienced with melanin-rich skin can add stronger options.",
      askAbout: [
        "Prescription-strength options for dark marks",
        "Chemical peels suited to deep skin (e.g. mandelic or salicylic)",
        "Microneedling for marks and scarring",
        "Lasers only from someone experienced with dark skin: the wrong laser can deepen marks",
      ],
    },
  };
}
