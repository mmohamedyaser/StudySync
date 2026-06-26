import { describe, it, expect, vi } from "vitest";
import { retrieve } from "@/lib/tools/retriever";

vi.mock("@/lib/store", () => ({
  getAllChunks: () => [
    { docId: "d1", page: 1, text: "Photosynthesis is how plants make food.", embedding: [], filename: "bio.pdf" },
    { docId: "d1", page: 2, text: "Mitochondria produce ATP.", embedding: [], filename: "bio.pdf" },
    { docId: "d2", page: 5, text: "Photosynthesis chapter index and overview.", embedding: [], filename: "ch5.pdf" },
  ],
}));

describe("retrieve", () => {
  it("returns top-k chunks by keyword overlap", async () => {
    const results = await retrieve("how does photosynthesis work", 2);
    expect(results).toHaveLength(2);
    expect(results[0].text.toLowerCase()).toContain("photosynthesis");
  });

  it("includes citation metadata", async () => {
    const results = await retrieve("photosynthesis", 1);
    expect(results[0]).toMatchObject({ docId: expect.any(String), filename: expect.any(String), page: expect.any(Number) });
  });

  it("returns no citations when no match", async () => {
    const results = await retrieve("xyzzy quantum", 5);
    expect(results).toHaveLength(0);
  });
});