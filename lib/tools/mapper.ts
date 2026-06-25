import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export const mapperTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Build a concept map from relevant chunks: extract key terms, their definitions, and relationships between them.",
    parameters: z.object({
      topic: z.string().describe("Topic to map"),
    }),
    execute: async ({ topic }) => {
      const citations = await retrieve(topic, 8, embedProvider);
      return { citations, topic };
    },
  });