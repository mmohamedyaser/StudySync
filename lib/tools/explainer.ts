import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export const explainerTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Explain a concept in a student-friendly way using retrieved material: simple language, analogies, examples.",
    parameters: z.object({
      concept: z.string().describe("Concept to explain"),
    }),
    execute: async ({ concept }) => {
      const citations = await retrieve(concept, 6, embedProvider);
      return { citations, concept };
    },
  });