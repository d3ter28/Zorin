import { describe, it, expect } from "vitest";
import { parseSalesHistoryCsv } from "./parseSalesHistoryCsv";

describe("parseSalesHistoryCsv", () => {
  it("parses valid CSV with header", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,10,29.99\nSKU-1,2024-02-15,8,34.99`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      line: 2,
      sku: "SKU-1",
      date: new Date("2024-01-15"),
      unitsSold: 10,
      priceCents: 2999,
    });
  });

  it("skips blank lines", () => {
    const csv = `sku,date,units_sold,price\n\nSKU-1,2024-01-15,5,10.00\n\n`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
  });

  it("errors on invalid date", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,not-a-date,5,10.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0].reason).toMatch(/invalid date/i);
  });

  it("errors on zero units", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,0,10.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/units_sold/i);
  });

  it("errors on zero price", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,5,0.00`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/price/i);
  });

  it("errors on wrong column count", () => {
    const csv = `sku,date,units_sold,price\nSKU-1,2024-01-15,5`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.errors[0].reason).toMatch(/4 columns/i);
  });

  it("works without header row", () => {
    const csv = `SKU-1,2024-01-15,10,29.99`;
    const result = parseSalesHistoryCsv(csv);
    expect(result.rows).toHaveLength(1);
  });
});
