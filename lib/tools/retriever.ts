import { tool } from "ai";
import { z } from "zod";
import { keywordSearch } from "@/lib/search";
import type { Citation } from "@/lib/types";

export async function retrieve(query: string, k: number): Promise<Citation[]> {
  return keywordSearch(query, k);
}

export const retrieverTool = () =>
  tool({
    description:
      "Search uploaded PDFs for chunks relevant to the query. Returns top-k passages with page citations. Use this whenever the student asks about material from their documents.",
    parameters: z.object({
      query: z.string().describe("The search query"),
      k: z.number().int().min(1).max(10).default(5).describe("Number of chunks to return"),
    }),
    execute: async ({ query, k }) => {
      const citations = await retrieve(query, k);
      return { citations };
    },
  });