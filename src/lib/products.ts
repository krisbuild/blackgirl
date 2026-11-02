/**
 * Example products for each step of the Dark Mark Plan. Chosen for melanin-rich skin:
 * sunscreens without a white cast, gentle actives, and Black-owned brands where they fit.
 * Not sponsored.
 *
 * A product is only ever RECOMMENDED when `inci` holds its full ingredient list (with `inciSource`
 * saying where it came from). The assessment engine runs that list through the same ingredient check
 * as Product check, against the user's own profile. Products without a verified list are never shown.
 */
import INCI from "@/data/inci.json";

type InciEntry = { inci: string; url: string; title: string; fetchedAt: string };
const VERIFIED = INCI as Record<string, InciEntry>;

export type Product = {
  brand: string;
  name: string;
  note: string;
  blackOwned?: boolean;
  forSkin?: "oily" | "dry";
  /** Full INCI ingredient list, copied from the brand's label or site. */
  inci?: string;
  /** Where the list came from (URL) and when it was checked. */
  inciSource?: string;
};

/** The ingredient (as labelled by the ingredient check) each plan step needs a product to contain. */
export const STEP_TARGET: Record<string, string | undefined> = {
  "Sunscreen SPF 30+ with no white cast": "UV filters",
  "Benzoyl peroxide wash (2.5–4%)": "Benzoyl peroxide",
  "Azelaic acid 10%": "Azelaic acid",
  "Niacinamide 5–10%": "Niacinamide",
  "Tranexamic acid serum": "Tranexamic acid",
  "Adapalene 0.1% gel": "Retinoid",
  "Mandelic acid": "Gentle acids (AHA)",
  "Vitamin C": "Vitamin C",
};

export const PRODUCTS: Record<string, Product[]> = {
  "Gentle, non-stripping cleanser": [
    { brand: "CeraVe", name: "Foaming Facial Cleanser", note: "For oily skin; with niacinamide and ceramides", forSkin: "oily" },
    { brand: "CeraVe", name: "Hydrating Facial Cleanser", note: "Cream cleanser for normal to dry skin", forSkin: "dry" },
    { brand: "Cetaphil", name: "Gentle Skin Cleanser", note: "Very mild, fragrance-free" },
  ],
  "Sunscreen SPF 30+ with no white cast": [
    { brand: "Black Girl Sunscreen", name: "SPF 30", note: "Made for deep skin; no white cast", blackOwned: true },
    { brand: "Bolden", name: "SPF 30 Brightening Moisturizer", note: "Moisturiser and SPF in one", blackOwned: true },
    { brand: "Beauty of Joseon", name: "Relief Sun: Rice + Probiotics SPF 50+", note: "Light chemical sunscreen; no cast" },
    { brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", note: "Clear gel; works under makeup" },
  ],
  "Lightweight gel moisturiser": [
    { brand: "Neutrogena", name: "Hydro Boost Water Gel", note: "Oil-free gel with hyaluronic acid" },
    { brand: "CeraVe", name: "PM Facial Moisturizing Lotion", note: "Light, with niacinamide and ceramides" },
  ],
  "Ceramide moisturiser": [
    { brand: "CeraVe", name: "Moisturizing Cream", note: "Rich ceramide cream for dry skin" },
    { brand: "CeraVe", name: "PM Facial Moisturizing Lotion", note: "Lighter, with niacinamide" },
  ],
  "Benzoyl peroxide wash (2.5–4%)": [
    { brand: "PanOxyl", name: "Acne Creamy Wash 4%", note: "Creamy, less drying than foaming washes" },
    { brand: "CeraVe", name: "Acne Foaming Cream Cleanser 4%", note: "With ceramides and niacinamide" },
  ],
  "Azelaic acid 10%": [
    { brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", note: "Budget pick; can feel gritty" },
    { brand: "Paula's Choice", name: "10% Azelaic Acid Booster", note: "Smoother texture" },
  ],
  "Niacinamide 5–10%": [
    { brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", note: "Also helps with oil" },
    { brand: "Good Molecules", name: "Niacinamide Serum", note: "10%, lightweight" },
  ],
  "Tranexamic acid serum": [
    { brand: "Topicals", name: "Faded Serum", note: "Tranexamic acid blend made for dark marks", blackOwned: true },
    { brand: "Naturium", name: "Tranexamic Topical Acid 5%", note: "Fragrance-free" },
  ],
  "Adapalene 0.1% gel": [
    { brand: "Differin", name: "Adapalene Gel 0.1%", note: "Over-the-counter retinoid" },
    { brand: "La Roche-Posay", name: "Effaclar Adapalene Gel 0.1%", note: "Same strength" },
  ],
  "Mandelic acid": [{ brand: "The Ordinary", name: "Mandelic Acid 10% + HA", note: "Gentle exfoliant for deep skin" }],
  "Vitamin C": [
    { brand: "Naturium", name: "Vitamin C Complex Serum", note: "Brightening, pairs with SPF" },
    { brand: "The Ordinary", name: "Ascorbyl Glucoside Solution 12%", note: "Gentle form for sensitive skin" },
  ],
};

/** Attach the verified ingredient list (fetched by scripts/fetch-inci.mjs) to each catalogue product. */
for (const list of Object.values(PRODUCTS)) {
  for (const p of list) {
    const v = VERIFIED[`${p.brand} ${p.name}`];
    if (v && !p.inci) {
      p.inci = v.inci;
      p.inciSource = `${v.url} (fetched ${v.fetchedAt})`;
    }
  }
}
