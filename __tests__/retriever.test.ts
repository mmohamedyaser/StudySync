import { describe, it, expect, vi } from "vitest";
import { retrieve } from "@/lib/tools/retriever";

vi.mock("@/lib/embed", () => ({
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map((t) => (t.includes("photosynthesis") ? [1, 0, 0] : [0, 1, 0]))
  ),
}));

vi.mock("@/lib/store", () => ({
  getAllChunks: () => [
    { docId: "d1", page: 1, text: "Photosynthesis is how plants make food.", embedding: [1, 0, 0], filename: "bio.pdf" },
    { docId: "d1", page: 2, text: "Mitochondria produce ATP.", embedding: [0, 1, 0], filename: "bio.pdf" },
    { docId: "d2", page: 5, text: "Photosynthesis chapter index.", embedding: [0.9, 0.1, 0], filename: "ch5.pdf" },
  ],
}));

describe("retrieve", () => {
  it("returns top-k chunks by similarity", async () => {
    const results = await retrieve("how does photosynthesis work", 2, "gemini");
    expect(results).toHaveLength(2);
    expect(results[0].text.toLowerCase()).toContain("photosynthesis");
  });

  it("includes citation metadata", async () => {
    const results = await retrieve("photosynthesis", 1, "gemini");
    expect(results[0]).toMatchObject({ docId: expect.any(String), filename: expect.any(String), page: expect.any(Number) });
  });
});