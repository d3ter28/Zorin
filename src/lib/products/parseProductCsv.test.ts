import { describe, expect, it } from "vitest";
import { parseProductCsv } from "./parseProductCsv";

describe("parseProductCsv", () => {
  it("parses valid rows with dollars converted to cents and optional fields", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40\nMUG-200,Travel Mug,24.00,Drinkware,,";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 1,
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPriceCents: 4999,
        category: "Apparel",
        cogsCents: 1800,
        estUnits: 40,
        imageUrl: null,
      },
      {
        line: 2,
        sku: "MUG-200",
        title: "Travel Mug",
        currentPriceCents: 2400,
        category: "Drinkware",
        cogsCents: null,
        estUnits: null,
        imageUrl: null,
      },
    ]);
  });

  it("skips a header row and blank lines, and handles CRLF", () => {
    const csv = "sku,title,current_price,category,cogs,est_units\r\nTEE-100,Linen Shirt,49.99,Apparel,18.00,40\r\n\r\n";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      {
        line: 2,
        sku: "TEE-100",
        title: "Linen Shirt",
        currentPriceCents: 4999,
        category: "Apparel",
        cogsCents: 1800,
        estUnits: 40,
        imageUrl: null,
      },
    ]);
  });

  it("reports malformed lines, missing fields, and bad numbers without throwing", () => {
    const csv = [
      "TEE-100,Linen Shirt,49.99,Apparel",   // line 1: only 4 columns
      ",Shirt,49.99,Apparel,,",              // line 2: empty sku
      "MUG-200,,24.00,Drinkware,,",          // line 3: empty title
      "MUG-200,Mug,abc,Drinkware,,",         // line 4: bad price
      "MUG-200,Mug,24.00,,,",                // line 5: empty category
      "MUG-200,Mug,24.00,Drinkware,xyz,",    // line 6: bad cogs
      "MUG-200,Mug,24.00,Drinkware,,1.5",    // line 7: non-integer est_units
    ].join("\n");
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(errors[0].reason).toMatch(/6 or 7 columns/);
    expect(errors[1].reason).toMatch(/sku/i);
    expect(errors[2].reason).toMatch(/title/i);
    expect(errors[3].reason).toMatch(/price/i);
    expect(errors[4].reason).toMatch(/category/i);
    expect(errors[5].reason).toMatch(/cogs/i);
    expect(errors[6].reason).toMatch(/units/i);
  });

  it("rejects a zero or negative current price", () => {
    const csv = "TEE-100,Linen Shirt,0,Apparel,,";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/price/i);
  });

  // ── image_url column (7th, optional) ──────────────────────────────────────

  it("parses a valid image_url in the 7th column", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,https://cdn.example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].imageUrl).toBe("https://cdn.example.com/shirt.jpg");
  });

  it("treats an empty image_url column as null", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows[0].imageUrl).toBeNull();
  });

  it("rejects a malformed image_url", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,not-a-url";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/image_url/i);
  });

  it("rejects an image_url with a non-http(s) scheme", () => {
    const csv = "TEE-100,Linen Shirt,49.99,Apparel,18.00,40,ftp://example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(rows).toEqual([]);
    expect(errors[0].reason).toMatch(/image_url/i);
  });

  it("skips the 7-column header row (with image_url)", () => {
    const csv = "sku,title,current_price,category,cogs,est_units,image_url\nTEE-100,Linen Shirt,49.99,Apparel,18.00,40,https://cdn.example.com/shirt.jpg";
    const { rows, errors } = parseProductCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(1);
    expect(rows[0].line).toBe(2);
    expect(rows[0].imageUrl).toBe("https://cdn.example.com/shirt.jpg");
  });
});
