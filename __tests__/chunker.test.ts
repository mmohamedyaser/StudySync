import { describe, it, expect } from "vitest";
import { chunkPages } from "@/lib/chunker";

describe("chunkPages", () => {
  it("returns one chunk for short page", () => {
    const pages = [{ page: 1, text: "short text" }];
    const chunks = chunkPages(pages, 100, 0);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("short text");
    expect(chunks[0].page).toBe(1);
  });

  it("splits long page into multiple chunks preserving page number", () => {
    const longText = "a".repeat(250);
    const chunks = chunkPages([{ page: 5, text: longText }], 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.page).toBe(5));
  });

  it("respects overlap", () => {
    const longText = "abcdefghij".repeat(20);
    const chunks = chunkPages([{ page: 1, text: longText }], 50, 10);
    expect(chunks.length).toBeGreaterThan(1);
    const overlap = chunks[0].text.slice(-10);
    expect(chunks[1].text.startsWith(overlap)).toBe(true);
  });

  it("preserves page boundaries", () => {
    const chunks = chunkPages(
      [
        { page: 1, text: "page1 content" },
        { page: 2, text: "page2 content" },
      ],
      1000,
      0
    );
    const pages = chunks.map((c) => c.page);
    expect(pages).toEqual([1, 2]);
  });
});