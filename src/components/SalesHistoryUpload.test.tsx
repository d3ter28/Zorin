import { render, screen } from "@testing-library/react";
import { SalesHistoryUpload } from "./SalesHistoryUpload";
import { describe, it, expect } from "vitest";

describe("SalesHistoryUpload", () => {
  it("renders upload button and sample link", () => {
    render(<SalesHistoryUpload />);
    expect(screen.getByText(/Choose CSV file/i)).toBeDefined();
    expect(screen.getByText(/Download sample CSV/i)).toBeDefined();
  });
});
