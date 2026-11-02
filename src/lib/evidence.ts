/**
 * Evidence behind each recommendation in the plan.
 *
 * Grades:
 * - "Strong": recommended in dermatology guidelines (e.g. the American Academy of Dermatology acne guideline)
 * - "Good": supported by clinical studies and expert reviews in skin of color
 * - "Emerging": promising, smaller studies; reasonable to try, with fewer guarantees
 *
 * Sources link to PubMed searches for the cited paper (titles, not hand-typed IDs), or to the
 * publisher's public page. They are the basis for the rules, not a substitute for a dermatologist.
 */
export type Grade = "Strong" | "Good" | "Emerging";
export type Source = { cite: string; url: string };
export type Evidence = { grade: Grade; summary: string; sources: Source[] };

const pubmed = (q: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q)}`;

export const SOURCES = {
  aadAcne2024: {
    cite: "Reynolds RV et al. Guidelines of care for the management of acne vulgaris. J Am Acad Dermatol. 2024.",
    url: pubmed("Guidelines of care for the management of acne vulgaris Reynolds 2024"),
  },
  pihReview2010: {
    cite: "Davis EC, Callender VD. Postinflammatory hyperpigmentation: a review of the epidemiology, clinical features, and treatment options in skin of color. J Clin Aesthet Dermatol. 2010.",
    url: pubmed("Postinflammatory hyperpigmentation review epidemiology clinical features treatment options skin of color Davis Callender"),
  },
  pihReview2011: {
    cite: "Callender VD et al. Postinflammatory hyperpigmentation: etiologic and therapeutic considerations. Am J Clin Dermatol. 2011.",
    url: pubmed("Postinflammatory hyperpigmentation etiologic and therapeutic considerations Callender"),
  },
  tintedSunscreen2021: {
    cite: "Lyons AB et al. Photoprotection beyond ultraviolet radiation: a review of tinted sunscreens. J Am Acad Dermatol. 2021.",
    url: pubmed("Photoprotection beyond ultraviolet radiation review of tinted sunscreens"),
  },
  whoMercury: {
    cite: "World Health Organization. Mercury in skin lightening products (information sheet).",
    url: "https://duckduckgo.com/?q=" + encodeURIComponent("WHO Mercury in skin lightening products information sheet"),
  },
  tranexamicTopical: {
    cite: "Studies of topical tranexamic acid for hyperpigmentation (systematic reviews).",
    url: pubmed("topical tranexamic acid hyperpigmentation systematic review"),
  },
} satisfies Record<string, Source>;

/** Evidence keyed by plan step name (see plan.ts). */
export const EVIDENCE: Record<string, Evidence> = {
  "Sunscreen SPF 30+ with no white cast": {
    grade: "Strong",
    summary:
      "Sun exposure darkens marks and slows fading. Visible light also deepens pigment in darker skin; tinted sunscreens with iron oxides add protection against it.",
    sources: [SOURCES.pihReview2010, SOURCES.tintedSunscreen2021],
  },
  "Gentle, non-stripping cleanser": {
    grade: "Good",
    summary: "Irritation and inflammation are what trigger new dark marks on melanin-rich skin, so gentle care is part of fading.",
    sources: [SOURCES.pihReview2011],
  },
  "Lightweight gel moisturiser": {
    grade: "Good",
    summary: "Moisturisers reduce irritation from active ingredients, which lowers the risk of new marks.",
    sources: [SOURCES.aadAcne2024],
  },
  "Ceramide moisturiser": {
    grade: "Good",
    summary: "Moisturisers reduce irritation from active ingredients, which lowers the risk of new marks.",
    sources: [SOURCES.aadAcne2024],
  },
  "Benzoyl peroxide wash (2.5–4%)": {
    grade: "Strong",
    summary: "Recommended for acne in the American Academy of Dermatology guideline. Calming breakouts prevents new dark marks.",
    sources: [SOURCES.aadAcne2024],
  },
  "Hands off": {
    grade: "Good",
    summary: "Picking and squeezing add inflammation, the main driver of dark marks after acne.",
    sources: [SOURCES.pihReview2010],
  },
  "Azelaic acid 10%": {
    grade: "Strong",
    summary: "Recommended for acne in the AAD guideline and used for post-acne dark marks in skin of color.",
    sources: [SOURCES.aadAcne2024, SOURCES.pihReview2010],
  },
  "Niacinamide 5–10%": {
    grade: "Good",
    summary: "Reduces transfer of pigment to the skin's surface; well tolerated on deep skin.",
    sources: [SOURCES.pihReview2011],
  },
  "Tranexamic acid serum": {
    grade: "Emerging",
    summary: "Promising for stubborn discoloration in smaller studies; gentle on deep skin.",
    sources: [SOURCES.tranexamicTopical],
  },
  "Adapalene 0.1% gel": {
    grade: "Strong",
    summary: "Topical retinoids are recommended for acne in the AAD guideline and help fade dark marks in skin of color.",
    sources: [SOURCES.aadAcne2024, SOURCES.pihReview2010],
  },
  "Mandelic acid": {
    grade: "Emerging",
    summary: "Gentle chemical exfoliants can help texture and marks; go slowly on deep skin.",
    sources: [SOURCES.pihReview2011],
  },
  "Vitamin C": {
    grade: "Good",
    summary: "An antioxidant brightener used for hyperpigmentation; supports sun protection.",
    sources: [SOURCES.pihReview2011],
  },
};

export const AVOID_EVIDENCE: Evidence = {
  grade: "Strong",
  summary: "Mercury in skin-lightening creams is toxic, and unsupervised steroid or hydroquinone use can damage deep skin.",
  sources: [SOURCES.whoMercury, SOURCES.pihReview2010],
};
