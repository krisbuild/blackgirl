/**
 * Turns YouCam raw scores (1-100, higher = clearer) into warm, cosmetic-only language.
 * No medical claims: we describe what the photo shows and suggest skincare ingredients.
 */

export type Band = "clear" | "mild" | "moderate" | "noticeable";

export function bandOf(score: number): Band {
  if (score >= 80) return "clear";
  if (score >= 65) return "mild";
  if (score >= 50) return "moderate";
  return "noticeable";
}

export const BAND_LABEL: Record<Band, string> = {
  clear: "Looking clear",
  mild: "A little",
  moderate: "Some",
  noticeable: "Noticeable",
};

type ConcernInfo = {
  label: string;
  /** What YouCam is reading, in plain words. */
  what: string;
  /** One line per band, written to encourage. */
  says: Record<Band, string>;
  /** Shown when YouCam is less reliable on deep skin for this concern. */
  caveat?: string;
  /** Priority on the results screen (lower = shown first). */
  order: number;
  focus?: boolean;
};

export const CONCERNS: Record<string, ConcernInfo> = {
  age_spot: {
    label: "Dark marks",
    what: "Leftover marks from past breakouts and uneven patches.",
    says: {
      clear: "Your skin looks beautifully even. Keep protecting it with daily SPF.",
      mild: "A few soft marks. With steady care, these tend to fade over the coming months.",
      moderate: "Some dark marks are showing. They do fade, slowly, and you'll see it here week by week.",
      noticeable: "Dark marks are the main thing in this photo. That's very common on melanin-rich skin, and they do fade with patience and sun protection.",
    },
    order: 1,
    focus: true,
  },
  acne: {
    label: "Acne",
    what: "Active spots and bumps.",
    says: {
      clear: "Hardly any active spots right now.",
      mild: "A few active spots. Being gentle with them helps stop new dark marks forming.",
      moderate: "Some active breakouts. Calming them now means fewer marks later.",
      noticeable: "Quite a few active breakouts. If they're painful or deep, a dermatologist can help.",
    },
    order: 2,
    focus: true,
  },
  texture: {
    label: "Texture & scars",
    what: "Smoothness of the skin's surface, including small scars.",
    says: {
      clear: "Your skin's surface looks smooth.",
      mild: "Slight unevenness in texture.",
      moderate: "Some uneven texture, which can include shallow scarring.",
      noticeable: "Uneven texture is showing. For deeper scars, a dermatologist can talk you through options.",
    },
    order: 3,
    focus: true,
  },
  dark_circle_v2: {
    label: "Dark undereyes",
    what: "Darkness in the under-eye area.",
    says: {
      clear: "Your under-eyes look bright.",
      mild: "A little under-eye darkness, which is very common on deep skin.",
      moderate: "Some under-eye darkness. Sleep, SPF and gentle care all help.",
      noticeable: "Under-eye darkness is noticeable. It's often partly genetic on melanin-rich skin, so be kind to yourself.",
    },
    order: 4,
    focus: true,
  },
  radiance: {
    label: "Glow",
    what: "How bright and luminous your skin looks.",
    says: {
      clear: "You're glowing.",
      mild: "Good glow, with room to shine more.",
      moderate: "Your skin looks a little dull today. Hydration and gentle exfoliation help.",
      noticeable: "Your skin looks tired today. Hydration and rest go a long way.",
    },
    order: 5,
  },
  moisture: {
    label: "Hydration",
    what: "How plump and hydrated your skin looks.",
    says: {
      clear: "Well hydrated.",
      mild: "Mostly hydrated.",
      moderate: "Could use more hydration.",
      noticeable: "Looks thirsty. A richer moisturiser could help.",
    },
    order: 6,
  },
  oiliness: {
    label: "Oil balance",
    what: "Shine and oil on the skin.",
    says: {
      clear: "Nicely balanced.",
      mild: "A little shine.",
      moderate: "Some oiliness, often around the T-zone.",
      noticeable: "Quite oily. Lightweight, non-greasy textures will suit you.",
    },
    order: 7,
  },
  pore: {
    label: "Pores",
    what: "How visible your pores are.",
    says: {
      clear: "Pores look refined.",
      mild: "Slightly visible pores.",
      moderate: "Pores are fairly visible.",
      noticeable: "Pores are quite visible, often linked to oiliness.",
    },
    order: 8,
  },
  redness: {
    label: "Sunburn & redness",
    what: "Redness from irritation or sun.",
    says: {
      clear: "No redness picked up.",
      mild: "A little redness.",
      moderate: "Some redness or irritation.",
      noticeable: "Redness is showing. Be extra gentle and wear SPF.",
    },
    caveat: "Redness is harder for AI to see on deep skin, so this reading may miss things. Melanin-rich skin still burns, so SPF matters every day.",
    order: 9,
  },
};

export type Insight = { concern: string; score: number; band: Band } & ConcernInfo;

export function insightsFrom(concerns: Array<{ concern: string; rawScore: number }>): Insight[] {
  return concerns
    .filter((c) => CONCERNS[c.concern])
    .map((c) => ({ concern: c.concern, score: c.rawScore, band: bandOf(c.rawScore), ...CONCERNS[c.concern] }))
    .sort((a, b) => a.order - b.order);
}

/* ------------------------------------------------------------------ */
/* Ingredient suggestions                                              */
/* ------------------------------------------------------------------ */

export type Pick = { name: string; why: string; how: string; for: string };

const needs = (i: Insight[], key: string, worst: Band[] = ["mild", "moderate", "noticeable"]) =>
  i.some((x) => x.concern === key && worst.includes(x.band));

export function ingredientPicks(insights: Insight[], skinType?: Record<string, string>): Pick[] {
  const picks: Pick[] = [
    {
      name: "Sunscreen with no white cast",
      why: "Sun deepens dark marks and slows fading more than anything else. This is the one non-negotiable.",
      how: "SPF 30+ every morning, rain or shine. Tinted or gel formulas blend into deep skin.",
      for: "Everyone",
    },
  ];
  if (needs(insights, "age_spot")) {
    picks.push(
      {
        name: "Azelaic acid",
        why: "Helps even out dark marks and is gentle on breakout-prone skin.",
        how: "10% at night. Start every other night.",
        for: "Dark marks",
      },
      {
        name: "Niacinamide",
        why: "Brightens and balances tone, and plays well with almost everything.",
        how: "5–10% serum, morning or night.",
        for: "Dark marks · evenness",
      },
      {
        name: "Vitamin C",
        why: "Brightens and boosts your sunscreen's protection.",
        how: "In the morning, under SPF. Introduce slowly if your skin is sensitive.",
        for: "Dark marks · glow",
      },
    );
  }
  if (needs(insights, "acne")) {
    picks.push({
      name: "Salicylic acid",
      why: "Clears inside pores to help calm breakouts.",
      how: "0.5–2% cleanser or toner, a few times a week.",
      for: "Acne",
    });
  }
  if (needs(insights, "texture", ["moderate", "noticeable"])) {
    picks.push({
      name: "Mandelic or lactic acid",
      why: "Gentle exfoliants that smooth texture with less risk of irritation on deep skin.",
      how: "Once or twice a week at night. Never on the same night as other acids.",
      for: "Texture",
    });
  }
  if (needs(insights, "dark_circle_v2")) {
    picks.push({
      name: "Caffeine eye serum",
      why: "Can help undereyes look brighter and less puffy.",
      how: "A tiny amount, tapped in morning and night.",
      for: "Dark undereyes",
    });
  }
  const oily = Object.values(skinType ?? {}).some((t) => /oily/i.test(t));
  const dry = Object.values(skinType ?? {}).some((t) => /dry/i.test(t)) || needs(insights, "moisture", ["moderate", "noticeable"]);
  if (oily) {
    picks.push({
      name: "Lightweight gel moisturiser",
      why: "Oily skin still needs moisture. Gels hydrate without heaviness.",
      how: "Morning and night, after serums.",
      for: "Oily skin",
    });
  } else if (dry) {
    picks.push({
      name: "Ceramide cream",
      why: "Rebuilds your skin barrier and locks in moisture.",
      how: "Morning and night, after serums.",
      for: "Dry skin",
    });
  }
  return picks;
}

export const AVOID = [
  "Bleaching or 'toning' creams that list mercury, clobetasol or other steroids",
  "Unregulated hydroquinone",
  "Harsh scrubs and picking at spots, which can leave new dark marks",
];
