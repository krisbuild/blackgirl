import { describe, expect, it } from "vitest";
import { checkAuthenticity, gs1Country, gtinValid, nafdacFormatOk } from "./authenticity";

describe("barcodes", () => {
  it("validates check digits for EAN-13 and UPC-A", () => {
    expect(gtinValid("4006381333931")).toBe(true);
    expect(gtinValid("4006381333932")).toBe(false);
    expect(gtinValid("036000291452")).toBe(true);
    expect(gtinValid("12345")).toBe(false);
  });
  it("names the GS1 office that issued the prefix", () => {
    expect(gs1Country("4006381333931")).toBe("Germany");
    expect(gs1Country("036000291452")).toBe("USA / Canada");
    expect(gs1Country("6150000000000")).toBe("Nigeria");
  });
});

describe("NAFDAC numbers", () => {
  it("accepts common formats and rejects junk", () => {
    expect(nafdacFormatOk("02-1234")).toBe(true);
    expect(nafdacFormatOk("A1-12345")).toBe(true);
    expect(nafdacFormatOk("hello")).toBe(false);
  });
});

describe("checkAuthenticity", () => {
  it("never says a product is real, only whether warning signs were found", () => {
    const clean = checkAuthenticity({ barcode: "4006381333931", nafdac: "02-1234", authorisedSeller: true });
    expect(clean.level).toBe("none-found");
    expect(clean.headline).toBe("No warning signs found");
    expect(JSON.stringify(clean)).not.toMatch(/\b(genuine|authentic|real)\b(?! sign)/i);
  });

  it("flags a brand mismatch from the product database, bad barcodes and ticked red flags", () => {
    const r = checkAuthenticity({
      barcode: "4006381333932",
      claimedBrand: "CeraVe",
      nafdac: "nope",
      flags: ["spelling", "price"],
      lookup: { found: true, brand: "Somebrand" },
    });
    expect(r.level).toBe("warnings");
    expect(r.warnings.length).toBe(4);
    expect(r.nextSteps[0]).toMatch(/Don't use it/);
  });

  it("warns when a product sold in Nigeria has no NAFDAC number", () => {
    expect(checkAuthenticity({ soldInNigeria: true }).warnings[0]).toMatch(/No NAFDAC number/);
  });
});
