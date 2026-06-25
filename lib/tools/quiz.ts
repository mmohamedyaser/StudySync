import { tool } from "ai";
import { z } from "zod";
import { retrieve } from "./retriever";
import type { EmbedName } from "@/lib/providers";

export const quizTool = (embedProvider: EmbedName) =>
  tool({
    description:
      "Generate a practice quiz (MCQ + short-answer) from material relevant to the topic. Returns citations to source chunks.",
    parameters: z.object({
      topic: z.string().describe("Quiz topic"),
      numQuestions: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ topic, numQuestions }) => {
      const citations = await retrieve(topic, Math.max(numQuestions * 2, 6), embedProvider);
      return { citations, topic, numQuestions };
    },
  });