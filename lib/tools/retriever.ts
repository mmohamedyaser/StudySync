import { tool } from "ai";
import { z } from "zod";
import { embedTexts } from "@/lib/embed";
import { getAllChunks } from "@/lib/store";
import { topKSimilar } from "@/lib/cosine";
import type { Citation } from "@/lib/types";
import type { EmbedName } from "@/lib/providers";

export async function retrieve(
  query: string,
  k: number,
  embedProvider: EmbedName,
  apiKey: string
): Promise<Citation[]> {
  const [qVec] = await embedTexts([query], embedProvider, apiKey);
  const chunks = getAllChunks();
  if (chunks.length === 0) return [];
  const top = topKSimilar(qVec, chunks, k);
  return top.map((c) => ({
    docId: c.docId,
    filename: c.filename,
    page: c.page,
    text: c.text,
  }));
}

export const retrieverTool = (embedProvider: EmbedName, apiKey: string) =>
  tool({
    description:
      "Search uploaded PDFs for chunks relevant to the query. Returns top-k passages with page citations. Use this whenever the student asks about material from their documents.",
    parameters: z.object({
      query: z.string().describe("The search query"),
      k: z.number().int().min(1).max(10).default(5).describe("Number of chunks to return"),
    }),
    execute: async ({ query, k }) => {
      const citations = await retrieve(query, k, embedProvider, apiKey);
      return { citations };
    },
  });