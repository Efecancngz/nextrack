import { describe, it, expect } from "vitest";
import { buildRedirectUrl } from "@/lib/redirect-url";

describe("buildRedirectUrl", () => {
  it("builds a title-only query when there is no progress or keyword", () => {
    const url = buildRedirectUrl({ title: "One Piece" });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece");
  });

  it("includes a capitalized Episode segment for episode progress", () => {
    const url = buildRedirectUrl({
      title: "One Piece",
      progress: { label: "episode", value: 1000 },
    });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece%20Episode%201000");
  });

  it("includes a capitalized Chapter segment for chapter progress", () => {
    const url = buildRedirectUrl({
      title: "Jujutsu Kaisen",
      progress: { label: "chapter", value: 250 },
    });
    expect(url).toBe("https://www.google.com/search?q=Jujutsu%20Kaisen%20Chapter%20250");
  });

  it("appends the keyword when provided", () => {
    const url = buildRedirectUrl({
      title: "One Piece",
      progress: { label: "episode", value: 1000 },
      keyword: "tranimeizle",
    });
    expect(url).toBe(
      "https://www.google.com/search?q=One%20Piece%20Episode%201000%20tranimeizle"
    );
  });

  it("appends the keyword with no progress", () => {
    const url = buildRedirectUrl({ title: "One Piece", keyword: "tranimeizle" });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece%20tranimeizle");
  });

  it("treats a null progress and null keyword the same as undefined", () => {
    const url = buildRedirectUrl({ title: "One Piece", progress: null, keyword: null });
    expect(url).toBe("https://www.google.com/search?q=One%20Piece");
  });
});
