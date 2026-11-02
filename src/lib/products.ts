/**
 * Example products for each step of the Dark Mark Plan. Chosen for melanin-rich skin:
 * sunscreens without a white cast, gentle actives, and a spread of budgets.
 * Not sponsored.
 *
 * A product is only ever RECOMMENDED when `inci` holds its full ingredient list (with `inciSource`
 * saying where it came from). The assessment engine runs that list through the same ingredient check
 * as Product check, against the user's own profile. Products without a verified list are never shown.
 */
import INCI from "@/data/inci.json";

type InciEntry = { inci: string; url: string; title: string; fetchedAt: string };
const VERIFIED = INCI as Record<string, InciEntry>;

export type Budget = "$" | "$$" | "$$$";
export const BUDGET_LABEL: Record<Budget, string> = { $: "Budget", $$: "Mid-range", $$$: "Premium" };

export type Product = {
  brand: string;
  name: string;
  note: string;
  /** Approximate price band: $ budget, $$ mid-range, $$$ premium. */
  budget?: Budget;
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
    { brand: "CeraVe", name: "Foaming Facial Cleanser", note: "For oily skin; with niacinamide and ceramides", forSkin: "oily", budget: "$" },
    { brand: "CeraVe", name: "Hydrating Facial Cleanser", note: "Cream cleanser for normal to dry skin", forSkin: "dry", budget: "$" },
    { brand: "Cetaphil", name: "Gentle Skin Cleanser", note: "Very mild", budget: "$" },
    { brand: "Simple", name: "Kind to Skin Refreshing Facial Wash", note: "Light gel wash", budget: "$" },
    { brand: "COSRX", name: "Low pH Good Morning Gel Cleanser", note: "Low-pH gel, gentle on breakouts", budget: "$" },
    { brand: "La Roche-Posay", name: "Toleriane Purifying Foaming Cleanser", note: "For normal to oily, sensitive skin", forSkin: "oily", budget: "$$" },
    { brand: "La Roche-Posay", name: "Effaclar Purifying Foaming Gel", note: "For oily, breakout-prone skin", forSkin: "oily", budget: "$$" },
  ],
  "Sunscreen SPF 30+ with no white cast": [
    { brand: "Beauty of Joseon", name: "Relief Sun: Rice + Probiotics SPF 50+", note: "Light chemical sunscreen; no cast", budget: "$" },
    { brand: "Bioré", name: "UV Aqua Rich Watery Essence SPF 50+", note: "Watery gel; no cast", budget: "$" },
    { brand: "Isntree", name: "Hyaluronic Acid Watery Sun Gel SPF 50+", note: "Gel texture; no cast", budget: "$" },
    { brand: "Neutrogena", name: "Ultra Sheer Dry-Touch Sunscreen SPF 55", note: "Matte finish", budget: "$" },
    { brand: "La Roche-Posay", name: "Anthelios Clear Skin Dry Touch Sunscreen SPF 60", note: "Oil-absorbing, for oily and acne-prone skin", forSkin: "oily", budget: "$$" },
    { brand: "La Roche-Posay", name: "Anthelios UVMune 400 Invisible Fluid SPF 50+", note: "Very light fluid; invisible finish", budget: "$$$" },
    { brand: "Eucerin", name: "Oil Control Dry Touch Sun Gel-Cream SPF 50+", note: "Matte gel-cream for oily skin", forSkin: "oily", budget: "$$" },
    { brand: "Supergoop!", name: "Unseen Sunscreen SPF 40", note: "Clear gel; works under makeup", budget: "$$$" },
    { brand: "Black Girl Sunscreen", name: "SPF 30", note: "Made for deep skin; no white cast", budget: "$$" },
    { brand: "Bolden", name: "SPF 30 Brightening Moisturizer", note: "Moisturiser and SPF in one", budget: "$$" },
  ],
  "Lightweight gel moisturiser": [
    { brand: "CeraVe", name: "PM Facial Moisturizing Lotion", note: "Light, with niacinamide and ceramides", budget: "$" },
    { brand: "COSRX", name: "Oil-Free Ultra-Moisturizing Lotion", note: "Light lotion for oily skin", budget: "$" },
    { brand: "Simple", name: "Kind to Skin Hydrating Light Moisturiser", note: "Light everyday cream", budget: "$" },
    { brand: "Neutrogena", name: "Hydro Boost Water Gel", note: "Oil-free gel with hyaluronic acid", budget: "$" },
    { brand: "La Roche-Posay", name: "Effaclar Mat", note: "Mattifying for oily skin", budget: "$$" },
    { brand: "Clinique", name: "Dramatically Different Moisturizing Gel", note: "Oil-free gel", budget: "$$$" },
  ],
  "Ceramide moisturiser": [
    { brand: "CeraVe", name: "Moisturizing Cream", note: "Rich ceramide cream for dry skin", budget: "$" },
    { brand: "CeraVe", name: "PM Facial Moisturizing Lotion", note: "Lighter, with niacinamide", budget: "$" },
    { brand: "La Roche-Posay", name: "Toleriane Double Repair Face Moisturizer", note: "Ceramides and niacinamide", budget: "$$" },
  ],
  "Benzoyl peroxide wash (2.5–4%)": [
    { brand: "PanOxyl", name: "Acne Creamy Wash 4%", note: "Creamy, less drying than foaming washes", budget: "$" },
    { brand: "CeraVe", name: "Acne Foaming Cream Cleanser 4%", note: "With ceramides and niacinamide", budget: "$" },
    { brand: "La Roche-Posay", name: "Effaclar Duo Acne Spot Treatment", note: "5.5% benzoyl peroxide spot gel", budget: "$$" },
  ],
  "Azelaic acid 10%": [
    { brand: "The Ordinary", name: "Azelaic Acid Suspension 10%", note: "Can feel gritty", budget: "$" },
    { brand: "Cos De BAHA", name: "Azelaic Acid 10 Serum", note: "Light serum", budget: "$" },
    { brand: "Naturium", name: "Azelaic Topical Acid 10%", note: "Smooth cream", budget: "$$" },
    { brand: "Paula's Choice", name: "10% Azelaic Acid Booster", note: "Smoother texture", budget: "$$$" },
  ],
  "Niacinamide 5–10%": [
    { brand: "The Ordinary", name: "Niacinamide 10% + Zinc 1%", note: "Also helps with oil", budget: "$" },
    { brand: "The Inkey List", name: "Niacinamide", note: "10%, lightweight", budget: "$" },
    { brand: "Good Molecules", name: "Niacinamide Serum", note: "10%, lightweight", budget: "$" },
    { brand: "Cos De BAHA", name: "Niacinamide 10 Serum", note: "Light serum", budget: "$" },
    { brand: "Paula's Choice", name: "10% Niacinamide Booster", note: "Concentrated booster", budget: "$$$" },
  ],
  "Tranexamic acid serum": [
    { brand: "Good Molecules", name: "Discoloration Correcting Serum", note: "Tranexamic acid with niacinamide", budget: "$" },
    { brand: "Naturium", name: "Tranexamic Topical Acid 5%", note: "Light serum", budget: "$$" },
    { brand: "Topicals", name: "Faded Serum", note: "Tranexamic acid blend for dark marks", budget: "$$" },
  ],
  "Adapalene 0.1% gel": [
    { brand: "Differin", name: "Adapalene Gel 0.1%", note: "Over-the-counter retinoid", budget: "$" },
    { brand: "La Roche-Posay", name: "Effaclar Adapalene Gel 0.1%", note: "Same strength", budget: "$" },
  ],
  "Mandelic acid": [
    { brand: "The Ordinary", name: "Mandelic Acid 10% + HA", note: "Gentle exfoliant for deep skin", budget: "$" },
    { brand: "Naturium", name: "Mandelic Topical Acid 12%", note: "Gentle exfoliating serum", budget: "$$" },
  ],
  "Vitamin C": [
    { brand: "The Ordinary", name: "Ascorbyl Glucoside Solution 12%", note: "Gentle form for sensitive skin", budget: "$" },
    { brand: "Garnier", name: "Vitamin C Brightening Serum", note: "Easy to find in pharmacies", budget: "$" },
    { brand: "Naturium", name: "Vitamin C Complex Serum", note: "Brightening, pairs with SPF", budget: "$$" },
    { brand: "La Roche-Posay", name: "Pure Vitamin C10 Serum", note: "10% vitamin C", budget: "$$$" },
    { brand: "Paula's Choice", name: "C15 Super Booster", note: "15% vitamin C", budget: "$$$" },
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
