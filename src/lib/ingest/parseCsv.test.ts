import { describe, expect, it } from "vitest";
import { parseCsv } from "./parseCsv";

describe("parseCsv", () => {
  it("parses valid rows with dollars converted to cents", () => {
    const csv = "TEE-001,RivalShop,28.50\nBOT-003,MarketCo,22.00";
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 1, sku: "TEE-001", competitorName: "RivalShop", priceCents: 2850 },
      { line: 2, sku: "BOT-003", competitorName: "MarketCo", priceCents: 2200 },
    ]);
  });

  it("skips a header row and blank lines, and handles CRLF", () => {
    const csv = "sku,competitor_name,price\r\nTEE-001,RivalShop,30\r\n\r\n";
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 2, sku: "TEE-001", competitorName: "RivalShop", priceCents: 3000 },
    ]);
  });

  it("reports malformed lines, missing fields, and bad prices without throwing", () => {
    const csv = [
      "TEE-001,RivalShop",            // line 1: only 2 columns
      ",MarketCo,10.00",              // line 2: empty sku
      "BOT-003,,10.00",               // line 3: empty competitor
      "BOT-003,PriceLeader,abc",      // line 4: bad price
      "BOT-003,PriceLeader,-5",       // line 5: negative price
    ].join("\n");
    const { rows, errors } = parseCsv(csv);
    expect(rows).toEqual([]);
    expect(errors.map((e) => e.line)).toEqual([1, 2, 3, 4, 5]);
    expect(errors[0].reason).toMatch(/3 columns/);
    expect(errors[1].reason).toMatch(/sku/i);
    expect(errors[2].reason).toMatch(/competitor/i);
    expect(errors[3].reason).toMatch(/price/i);
    expect(errors[4].reason).toMatch(/price/i);
  });

  it("skips the header even when preceded by blank lines", () => {
    const csv = "\n\nsku,competitor_name,price\nTEE-001,RivalShop,30";
    const { rows, errors } = parseCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { line: 4, sku: "TEE-001", competitorName: "RivalShop", priceCents: 3000 },
    ]);
  });
});
