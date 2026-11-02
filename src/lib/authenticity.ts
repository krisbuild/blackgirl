/**
 * Authenticity check: looks for WARNING SIGNS that a product may not be genuine.
 *
 * No photo or barcode can prove a product is genuine, so this never says "real". It checks:
 * - the barcode's check digit (a mistyped or made-up barcode fails it)
 * - which GS1 country office issued the barcode prefix (where it was registered, not where it was made)
 * - whether a public product database lists that barcode under the same brand
 * - the NAFDAC registration number's format (then points to NAFDAC's Green Book to confirm)
 * - packaging red flags the user ticks
 */

export function gtinValid(code: string): boolean {
  const d = code.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const digits = d.split("").map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((s, n, i) => s + n * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

const GS1: Array<[number, number, string]> = [
  [0, 19, "USA / Canada"], [30, 39, "USA"], [60, 139, "USA / Canada"], [300, 379, "France"], [400, 440, "Germany"],
  [450, 459, "Japan"], [460, 469, "Russia"], [471, 471, "Taiwan"], [489, 489, "Hong Kong"], [490, 499, "Japan"],
  [500, 509, "United Kingdom"], [540, 549, "Belgium / Luxembourg"], [560, 560, "Portugal"], [570, 579, "Denmark"],
  [590, 590, "Poland"], [600, 601, "South Africa"], [603, 603, "Ghana"], [615, 615, "Nigeria"], [616, 616, "Kenya"],
  [622, 622, "Egypt"], [628, 628, "Saudi Arabia"], [629, 629, "United Arab Emirates"], [690, 699, "China"],
  [729, 729, "Israel"], [750, 750, "Mexico"], [754, 755, "Canada"], [760, 769, "Switzerland"], [789, 790, "Brazil"],
  [800, 839, "Italy"], [840, 849, "Spain"], [868, 869, "Turkey"], [870, 879, "Netherlands"], [880, 880, "South Korea"],
  [885, 885, "Thailand"], [888, 888, "Singapore"], [890, 890, "India"], [893, 893, "Vietnam"], [899, 899, "Indonesia"],
  [900, 919, "Austria"], [930, 939, "Australia"], [940, 949, "New Zealand"], [955, 955, "Malaysia"],
];

/** GS1 member office that issued the barcode prefix (EAN-13 / UPC-A). */
export function gs1Country(code: string): string | null {
  let d = code.replace(/\D/g, "");
  if (d.length === 12) d = "0" + d; // UPC-A
  if (d.length !== 13) return null;
  const p = Number(d.slice(0, 3));
  return GS1.find(([a, b]) => p >= a && p <= b)?.[2] ?? null;
}

/** NAFDAC registration numbers look like "02-1234" or "A1-1234". Format only; confirm on the Green Book. */
export function nafdacFormatOk(n: string): boolean {
  return /^[A-Z0-9]{2}-\d{4,6}[A-Z]?$/i.test(n.trim().replace(/\s+/g, ""));
}

export const RED_FLAGS = [
  { id: "spelling", label: "Spelling mistakes, blurry or smudged printing on the pack" },
  { id: "noBatch", label: "No batch number or expiry date" },
  { id: "seal", label: "Seal broken or missing, or the pack looks opened" },
  { id: "price", label: "Much cheaper than other shops" },
  { id: "seller", label: "Bought from an unofficial seller, market stall or social media" },
  { id: "different", label: "Smell, colour or texture is different from before" },
] as const;
export type RedFlag = (typeof RED_FLAGS)[number]["id"];

export type DbLookup = { found: boolean; brand?: string; name?: string; error?: string };

export type AuthInput = {
  barcode?: string;
  claimedBrand?: string;
  nafdac?: string;
  soldInNigeria?: boolean;
  flags?: RedFlag[];
  authorisedSeller?: boolean;
  lookup?: DbLookup;
};

export type AuthReport = {
  level: "warnings" | "none-found";
  headline: string;
  warnings: string[];
  checks: string[];
  nextSteps: string[];
};

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

export function checkAuthenticity(i: AuthInput): AuthReport {
  const warnings: string[] = [];
  const checks: string[] = [];
  const code = (i.barcode ?? "").replace(/\D/g, "");

  if (code) {
    if (!gtinValid(code)) warnings.push("The barcode's check digit doesn't add up. Make sure you typed it correctly; a made-up barcode fails this test.");
    else {
      checks.push("Barcode check digit is valid.");
      const c = gs1Country(code);
      if (c) checks.push(`Barcode was registered through GS1 ${c}. This shows where the brand registered it, not where it was made.`);
    }
    const lk = gtinValid(code) ? i.lookup : undefined; // database results only mean something for a valid barcode
    if (lk?.found && lk.brand && i.claimedBrand) {
      const match = tokens(lk.brand).some((t) => tokens(i.claimedBrand!).includes(t));
      if (match) checks.push(`A public product database lists this barcode as ${lk.brand}${lk.name ? ` · ${lk.name}` : ""}.`);
      else warnings.push(`A public product database lists this barcode under "${lk.brand}", not "${i.claimedBrand}".`);
    } else if (lk?.found) {
      checks.push(`A public product database lists this barcode as ${[lk.brand, lk.name].filter(Boolean).join(" · ") || "a known product"}.`);
    } else if (lk && !lk.error) {
      checks.push("This barcode isn't in the public product database we checked. That's common for smaller brands, so it isn't a warning on its own.");
    }
  }

  if (i.nafdac) {
    if (nafdacFormatOk(i.nafdac)) checks.push(`NAFDAC number ${i.nafdac.toUpperCase()} is in a valid format. Confirm it's registered to this product on NAFDAC's Green Book.`);
    else warnings.push(`"${i.nafdac}" doesn't look like a NAFDAC registration number (e.g. 02-1234 or A1-1234).`);
  } else if (i.soldInNigeria) {
    warnings.push("No NAFDAC number entered. Products sold legally in Nigeria should show one on the pack.");
  }

  for (const f of i.flags ?? []) {
    const label = RED_FLAGS.find((r) => r.id === f)?.label;
    if (label) warnings.push(label + ".");
  }
  if (i.authorisedSeller) checks.push("Bought from the brand or an authorised retailer: the most reliable sign of all.");

  const nextSteps = [
    "Search the NAFDAC number on NAFDAC's Green Book (greenbook.nafdac.gov.ng) and check the product name matches.",
    "If the pack has a scratch-off code (MAS), scratch it and text the PIN to the number printed beside it.",
    "Contact the brand with the batch number to confirm it's theirs.",
    "Buy from the brand's own store or retailers it lists as authorised.",
  ];
  if (warnings.length) nextSteps.unshift("Don't use it on your face until you've confirmed it with the brand or NAFDAC.");

  return {
    level: warnings.length ? "warnings" : "none-found",
    headline: warnings.length
      ? `${warnings.length} warning sign${warnings.length === 1 ? "" : "s"} found`
      : "No warning signs found",
    warnings,
    checks,
    nextSteps,
  };
}
