import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";

export const explainerTool = () =>
  tool({
    description:
      "Explain a concept in a student-friendly way using retrieved material: simple language, analogies, examples.",
    parameters: z.object({
      concept: z.string().describe("Concept to explain"),
    }),
    execute: async ({ concept }) => {
      const citations = await retrieve(concept, 6);
      return { citations, concept };
    },
  });