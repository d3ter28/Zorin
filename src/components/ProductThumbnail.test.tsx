import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProductThumbnail } from "./ProductThumbnail";

afterEach(() => {
  cleanup();
});

describe("ProductThumbnail", () => {
  it("renders the image when imageUrl is present", () => {
    render(<ProductThumbnail imageUrl="https://example.com/photo.jpg" alt="Ceramic Mug" />);
    const img = screen.getByRole("img", { name: "Ceramic Mug" }) as HTMLImageElement;
    expect(img.src).toBe("https://example.com/photo.jpg");
  });

  it("renders the fallback tile when imageUrl is null", () => {
    render(<ProductThumbnail imageUrl={null} alt="Ceramic Mug" />);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("renders the fallback tile after the image fails to load", () => {
    render(<ProductThumbnail imageUrl="https://example.com/broken.jpg" alt="Ceramic Mug" />);
    const img = screen.getByRole("img", { name: "Ceramic Mug" });
    fireEvent.error(img);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
